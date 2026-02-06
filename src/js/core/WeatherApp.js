/**
 * WeatherApp Class
 * Main application orchestrator
 * Coordinates all components and manages application state
 *
 * @class WeatherApp
 */
import { WeatherService } from './WeatherService.js';
import { GeolocationManager } from './GeolocationManager.js';
import { StorageManager } from './StorageManager.js';
import { ThemeManager } from './ThemeManager.js';
import { WeatherRenderer } from '../ui/WeatherRenderer.js';
import { SearchManager } from '../ui/SearchManager.js';
import { Toast } from '../ui/Toast.js';
import { LoadingSpinner } from '../ui/LoadingSpinner.js';
import { a11yAnnounce } from '../utils/a11y.js';

export class WeatherApp {
    /**
     * Create a WeatherApp instance
     * @param {Object} config - Application configuration
     */
    constructor(config = {}) {
        // Initialize configuration
        this.config = {
            apiBase: config.apiBase || '/.netlify/functions/weather',
            defaultUnits: config.defaultUnits || 'metric',
            defaultLocation: config.defaultLocation || { lat: 37.7749, lon: -122.4194 },
            ...config,
        };

        // Initialize core services
        this.weatherService = new WeatherService(this.config.apiBase);
        this.geolocationManager = new GeolocationManager();
        this.storageManager = new StorageManager();
        this.themeManager = new ThemeManager();

        // Initialize UI components
        this.renderer = null;
        this.searchManager = null;
        this.toast = null;
        this.loadingSpinner = null;

        // Application state
        this.state = {
            currentWeather: null,
            forecast: null,
            //  FORCE CELSIUS IN DEVELOPMENT MODE (ignore saved preferences)
            units: this._isDevelopmentMode() ? 'metric' : this.storageManager.getUnits() || this.config.defaultUnits,
            isLoading: false,
            error: null,
            currentLocation: null,
        };

        // Initialize application
        this._initialize();
    }

    /**
     * Initialize the application
     * @private
     */
    _initialize() {
        console.log('[WeatherApp] Initializing...');

        // Initialize UI components
        this._initUIComponents();

        // Setup event listeners
        this._setupEventListeners();

        // Apply saved theme
        this.themeManager.applySavedTheme();

        // Try to get user's location and load weather
        this._initializeWeather();
    }

    /**
     * Initialize UI components
     * @private
     */
    _initUIComponents() {
        this.renderer = new WeatherRenderer();
        this.searchManager = new SearchManager(this.weatherService);
        this.toast = new Toast();
        this.loadingSpinner = new LoadingSpinner();
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        // Location button click
        const locationBtn = document.getElementById('location-btn');
        if (locationBtn) {
            locationBtn.addEventListener('click', () => this.getCurrentLocationWeather());
        }

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.themeManager.toggleTheme());
        }

        // Unit toggle
        const unitToggle = document.getElementById('unit-toggle');
        if (unitToggle) {
            unitToggle.addEventListener('click', () => this.toggleUnits());
        }

        // Listen for search result selection
        document.addEventListener('search:select', (event) => {
            console.log('[WeatherApp] Search result selected:', event.detail);
            this.getWeatherByLocation(event.detail);
        });
        document.addEventListener(
            'click',
            (e) => {
                if (e.target.matches('.btn-retry-tehran, .btn-retry-tehran *')) {
                    e.preventDefault();
                    const btn = e.target.closest('.btn-retry-tehran');
                    if (btn && !btn.disabled) {
                        btn.disabled = true; // Prevent double-click
                        btn.textContent = 'Loading...';
                        this._setLoading(true);

                        this.getWeatherByCoordinates(35.6892, 51.389).finally(() => {
                            this._setLoading(false);
                            btn.disabled = false;
                            btn.textContent = '🌤️ Load Tehran Weather (Simulated)';
                        });
                    }
                }
            },
            true
        ); // Use capture phase for reliability
        // Window events
        window.addEventListener('online', () => this._handleOnline());
        window.addEventListener('offline', () => this._handleOffline());
    }

    /**
     * Initialize weather data
     * Automatically uses mock data in development mode
     * @private
     */
    /**
     * Initialize weather data
     * Handles both development (mock data) and production (real API) modes
     * @private
     */
    async _initializeWeather() {
        try {
            this._setLoading(true);

            // ========== DEVELOPMENT MODE (localhost) ==========
            if (this._isDevelopmentMode()) {
                console.log('[WeatherApp] Development mode: using simulated Tehran weather');

                // Set Tehran name immediately for better UX
                const locationNameEl = document.querySelector('.location-name');
                if (locationNameEl) {
                    locationNameEl.textContent = 'Tehran';
                    locationNameEl.classList.remove('skeleton');
                }

                // Force Celsius units
                this.state.units = 'metric';
                this.renderer.updateUnits('metric');

                // Load Tehran weather (uses mock data automatically)
                await this.getWeatherByCoordinates(35.6892, 51.389);

                // Show dev mode badge
                const badge = document.createElement('div');
                badge.className = 'dev-badge';
                badge.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Simulated climate data (development mode)
            `;
                const header = document.querySelector('.header');
                if (header) header.appendChild(badge);

                this.toast.showInfo('🌤️ Tehran winter weather loaded (9°C, scattered clouds). Units: Celsius');
                return; // Exit early - dev mode complete
            }

            // ========== PRODUCTION MODE (Vercel) ==========
            console.log('[WeatherApp] Production mode: loading real weather data from API');

            try {
                // Attempt 1: Get user's current location via geolocation
                console.log('[WeatherApp] Attempting geolocation...');
                const position = await this.geolocationManager.getCurrentPosition();

                if (position) {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    console.log(`[WeatherApp] Geolocation successful: ${lat}, ${lon}`);

                    //  PARALLEL REQUESTS - City name + Weather data SIMULTANEOUSLY
                    // Both requests start at the same time → Total time = max(time1, time2) not sum
                    try {
                        // Start BOTH requests in parallel (weather + reverse geocoding)
                        const [cityName, weatherData] = await Promise.all([
                            this._reverseGeocode(lat, lon), // Gets city name
                            this.weatherService.getWeather({ lat, lon, units: this.state.units }), // Gets weather
                        ]);

                        // Use reverse geocoded city name (never "Your Location")
                        weatherData.name = cityName;

                        // Get forecast data (sequential is fine - mock data is fast)
                        const forecastData = await this.weatherService.getForecast({
                            lat,
                            lon,
                            units: this.state.units,
                        });

                        // Update state with CORRECT city name from the start
                        this.state.currentWeather = weatherData;
                        this.state.forecast = forecastData;
                        this.state.currentLocation = { lat, lon };

                        // Render UI ONCE with complete data (city name + weather)
                        this._updateUI();

                        // Show success with ACTUAL city name (not "Your Location")
                        this.toast.showSuccess(`✅ Weather loaded for ${cityName}`);
                    } catch (error) {
                        console.error('[WeatherApp] Error loading weather after geolocation:', error);
                        throw error; // Propagate to outer catch block for fallback
                    }

                    return; // Exit early - success path complete
                }
                this._initFavoriteButton(); // Initialize favorite button state
            } catch (geoError) {
                console.warn('[WeatherApp] Geolocation failed:', geoError.message);
                // Continue to fallback location
            }

            // Attempt 2: Try fallback location using IP geolocation
            console.log('[WeatherApp] Attempting fallback location via IP geolocation...');
            try {
                const fallbackLocation = await this.geolocationManager.getFallbackLocation();
                if (fallbackLocation && fallbackLocation.lat && fallbackLocation.lon) {
                    console.log(
                        `[WeatherApp] Fallback location found: ${fallbackLocation.city || 'Unknown'}, ${fallbackLocation.country}`
                    );
                    await this.getWeatherByCoordinates(fallbackLocation.lat, fallbackLocation.lon);
                    this.toast.showInfo(
                        `🌤️ Weather loaded for ${fallbackLocation.city || 'your location'} (via IP geolocation)`
                    );
                    return;
                }
            } catch (fallbackError) {
                console.warn('[WeatherApp] Fallback location failed:', fallbackError.message);
            }

            // Attempt 3: Fallback to Tehran (most reliable default)
            console.log('[WeatherApp] Using Tehran as final fallback location');

            await this.getWeatherByCoordinates(35.6892, 51.389);
            this.toast.showInfo('🌤️ Weather loaded for Tehran (geolocation unavailable)');
        } catch (error) {
            console.error('[WeatherApp] Critical initialization error:', error);

            // NEVER leave app stuck in loading state
            this._setLoading(false);

            //  Create error container SAFELY without HTML injection
            const errorContainer = document.createElement('div');
            errorContainer.className = 'error-container';
            errorContainer.setAttribute('role', 'alert');
            errorContainer.innerHTML = `
        <div style="text-align: center; padding: 24px; max-width: 500px; margin: 0 auto;">
            <svg width="64" height="64" viewBox="0 0 24 24" style="margin: 0 auto 16px; color: var(--color-error);">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
            <h3 style="margin: 0 0 12px 0; font-size: 1.3rem; font-weight: 600;">⚠️ Weather Service Unavailable</h3>
            <p style="margin: 0 0 16px 0; color: var(--color-text-secondary); line-height: 1.5;">
                Could not connect to weather API. Common causes:
            </p>
            <ul style="text-align: left; margin: 0 0 24px 24px; color: var(--color-text-secondary); line-height: 1.6;">
                <li>Missing API key in Vercel environment variables</li>
                <li>Network connectivity issues</li>
                <li>OpenWeatherMap service downtime</li>
                <li>Edge Function not deployed correctly</li>
            </ul>
            <button class="btn btn-primary btn-retry-tehran" type="button" 
                style="width: 100%; max-width: 320px; padding: 12px 24px; font-size: 1.05rem; margin-bottom: 16px;">
                🌤️ Load Tehran Weather (Simulated)
            </button>
            <div style="background: rgba(74, 85, 104, 0.1); border-radius: 8px; padding: 16px; margin-top: 16px;">
                <p style="margin: 0 0 8px 0; font-weight: 500; color: var(--color-text);">
                    🔧 For Production Deployment:
                </p>
                <ol style="margin: 0; padding-left: 20px; text-align: left; font-size: 0.9rem; color: var(--color-text-secondary);">
                    <li>Set <code>WEATHER_API_KEY</code> in Vercel Dashboard</li>
                    <li>Verify <code>api/weather.js</code> exists at ROOT level</li>
                    <li>Redeploy project after configuration changes</li>
                </ol>
            </div>
            <p style="margin-top: 20px; font-size: 0.85rem; color: var(--color-text-muted);">
                Request ID: <span class="request-id">${Date.now()}</span>
            </p>
        </div>
    `;

            // Replace weather card content SAFELY
            const weatherCard = document.querySelector('#current-weather .weather-card');
            if (weatherCard) {
                weatherCard.innerHTML = ''; // Clear existing content
                weatherCard.appendChild(errorContainer);

                // Attach event listener AFTER DOM insertion with DELEGATION
                const retryBtn = errorContainer.querySelector('.btn-retry-tehran');
                if (retryBtn) {
                    // Use once: true to prevent duplicate handlers
                    retryBtn.addEventListener(
                        'click',
                        async () => {
                            console.log('[WeatherApp] User clicked retry button - loading Tehran mock data');
                            this._setLoading(true);

                            try {
                                // Force development mode behavior for this retry
                                await this.getWeatherByCoordinates(35.6892, 51.389);
                                this.toast.showSuccess('✅ Tehran weather loaded successfully (simulated data)');
                            } catch (retryError) {
                                console.error('[WeatherApp] Retry failed:', retryError);
                                this.toast.showError('Failed to load weather. Check console for details.');
                            } finally {
                                this._setLoading(false);
                            }
                        },
                        { once: true }
                    ); // Prevent duplicate handlers

                    console.log('[WeatherApp] ✅ Retry button event listener attached successfully');
                } else {
                    console.error('[WeatherApp] ❌ Retry button NOT FOUND in DOM after insertion');
                    this.toast.showError('Error UI loaded but retry button missing. Check console.');
                }
            } else {
                console.error('[WeatherApp] ❌ Weather card container not found');
                this.toast.showError('Critical UI error. Please refresh the page.');
            }

            // Log actionable diagnostics
            console.group('🔍 WEATHER SERVICE DEBUG INFO');
            console.log('Error:', error.message);
            console.log('API Base:', this.weatherService.apiBase);
            console.log('Is Dev Mode:', this._isDevelopmentMode());
            console.log(
                'Test Edge Function URL:',
                `${window.location.origin}/api/weather?lat=35.6892&lon=51.3890&units=metric&type=current`
            );
            console.log('💡 ACTION: Open URL above directly in browser to test Edge Function');
            console.groupEnd();

            // No return - allow finally block to execute (redundant but safe)
        } finally {
            this._setLoading(false);

            //  Force hide spinner after 100ms if still visible
            setTimeout(() => {
                if (this.loadingSpinner && this.loadingSpinner.isVisible?.()) {
                    console.warn('[WeatherApp] EMERGENCY: Forcing spinner hide after timeout');
                    this.loadingSpinner.hide();
                }
            }, 100);
        }
    }

    /**
     * Check if running in development environment
     * @private
     * @returns {boolean} True if development mode
     */
    _isDevelopmentMode() {
        return (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:'
        );
    }

    /**
     * Get weather for current location
     * Bypasses geolocation in development mode to avoid timeout errors
     * @returns {Promise<void>}
     */
    async getCurrentLocationWeather() {
        try {
            this._setLoading(true);

            // Bypass geolocation in development mode
            if (this._isDevelopmentMode()) {
                console.log('[WeatherApp] Development mode: Skipping geolocation, using default location');
                await this.getWeatherByCoordinates(this.config.defaultLocation.lat, this.config.defaultLocation.lon);
                this.toast.showInfo('📍 Geolocation disabled in development. Using San Francisco location.');
                return;
            }

            // Production mode: attempt actual geolocation
            const position = await this.geolocationManager.getCurrentPosition();

            if (position) {
                await this.getWeatherByCoordinates(position.coords.latitude, position.coords.longitude);
                this.toast.showSuccess('✅ Location updated successfully');
            } else {
                throw new Error('No position data received');
            }
        } catch (error) {
            console.error('[WeatherApp] Error getting current location:', error);

            //  Fallback to default location on ANY error (including timeout)
            this.toast.showError('⚠️ Location access failed. Using default location.');

            try {
                await this.getWeatherByCoordinates(this.config.defaultLocation.lat, this.config.defaultLocation.lon);
            } catch (fallbackError) {
                console.error('[WeatherApp] Fallback location failed:', fallbackError);
                this.toast.showError('Failed to load weather data');
            }
        } finally {
            this._setLoading(false);
        }
    }

    /**
     * Get weather by coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<void>}
     */
    async getWeatherByCoordinates(lat, lon) {
        try {
            this._setLoading(true);
            this._setError(null);

            // Fetch current weather
            const weatherData = await this.weatherService.getWeather({
                lat,
                lon,
                units: this.state.units,
            });

            // Fetch forecast
            const forecastData = await this.weatherService.getForecast({
                lat,
                lon,
                units: this.state.units,
            });

            // Update state
            this.state.currentWeather = weatherData;
            this.state.forecast = forecastData;
            this.state.currentLocation = { lat, lon };

            // Update UI
            this._updateUI();

            // Announce to screen readers
            const cityName = weatherData.name || 'Unknown location';
            a11yAnnounce(`Weather loaded for ${cityName}`);
        } catch (error) {
            console.error('[WeatherApp] Error fetching weather:', error);
            this._setError(error.message || 'Failed to fetch weather data');
            this.toast.showError('Failed to load weather data');
        } finally {
            this._setLoading(false);
        }
    }

    /**
     * Toggle temperature units
     * @returns {Promise<void>}
     */
    async toggleUnits() {
        try {
            this._setLoading(true);

            // Toggle units
            this.state.units = this.state.units === 'metric' ? 'imperial' : 'metric';

            // Save new units preference
            this.storageManager.saveUnits(this.state.units);

            // Update UI immediately
            this.renderer.updateUnits(this.state.units);

            // Refresh weather data if we have a location
            if (this.state.currentLocation) {
                await this.getWeatherByCoordinates(this.state.currentLocation.lat, this.state.currentLocation.lon);
            }

            // Show success message
            const unitLabel = this.state.units === 'metric' ? 'Celsius' : 'Fahrenheit';
            this.toast.showSuccess(`Switched to ${unitLabel}`);
        } catch (error) {
            console.error('[WeatherApp] Error toggling units:', error);
            this.toast.showError('Failed to change units');
            this._setLoading(false);
        }
    }

    /**
     * Update UI with current state
     * @private
     */
    _updateUI() {
        if (this.state.error) {
            this.renderer.showError(this.state.error);
            return;
        }

        if (this.state.currentWeather) {
            this.renderer.renderCurrentWeather(this.state.currentWeather, this.state.units);
        }

        if (this.state.forecast) {
            this.renderer.renderForecast(this.state.forecast, this.state.units);
        }
        this.renderer.updateUnits(this.state.units);
    }

    /**
     * Set loading state
     * @private
     * @param {boolean} isLoading - Loading state
     */
    _setLoading(isLoading) {
        this.state.isLoading = isLoading;

        if (isLoading) {
            this.loadingSpinner.show();
        } else {
            this.loadingSpinner.hide();
        }
    }

    /**
     * Set error state
     * @private
     * @param {string|null} error - Error message or null
     */
    _setError(error) {
        this.state.error = error;

        if (error) {
            this.renderer.showError(error);
        }
    }

    /**
     * Handle online event
     * @private
     */
    _handleOnline() {
        console.log('[WeatherApp] Connection restored');
        this.toast.showSuccess('Connection restored');

        // Try to refresh weather data
        if (this.state.currentLocation) {
            this.getWeatherByCoordinates(this.state.currentLocation.lat, this.state.currentLocation.lon);
        }
    }

    /**
     * Handle offline event
     * @private
     */
    _handleOffline() {
        console.log('[WeatherApp] Offline detected');
        this.toast.showWarning('You are offline. Showing cached data.');
    }

    /**
     * Destroy application and cleanup
     */
    destroy() {
        console.log('[WeatherApp] Destroying...');

        // Destroy UI components
        if (this.loadingSpinner) this.loadingSpinner.destroy();
        if (this.toast) this.toast.destroy();

        // Clear state
        this.state = null;
    }

    /**
     * Get weather for selected location from search
     * Overrides weather data name with search result name for accuracy
     * @param {Object} location - Location object with name, lat, lon
     * @returns {Promise<void>}
     */
    async getWeatherByLocation(location) {
        try {
            // Validate location data
            if (!location || !location.lat || !location.lon || !location.name) {
                throw new Error('Invalid location data received');
            }

            this._setLoading(true);

            // Fetch weather data using coordinates
            const weatherData = await this.weatherService.getWeather({
                lat: location.lat,
                lon: location.lon,
                units: this.state.units,
            });

            //  Override API name with search result name
            // This ensures UI shows exactly what user selected (Tokyo, Cairo, etc.)
            weatherData.name = location.name;

            // Preserve country code if available in search result
            if (location.country) {
                weatherData.sys = weatherData.sys || {};
                weatherData.sys.country = location.country;
            }

            // Also update forecast with location name
            const forecastData = await this.weatherService.getForecast({
                lat: location.lat,
                lon: location.lon,
                units: this.state.units,
            });

            // Update application state
            this.state.currentWeather = weatherData;
            this.state.forecast = forecastData;
            this.state.currentLocation = {
                lat: location.lat,
                lon: location.lon,
                name: location.name, // Store for reference
            };

            // Update UI immediately
            this._updateUI();

            // Show success message
            this.toast.showSuccess(`✅ Weather updated for ${location.name}`);
        } catch (error) {
            console.error('[WeatherApp] Error loading location weather:', error);
            this.toast.showError('Failed to load weather for this location. Please try again.');
        } finally {
            this._setLoading(false);
        }
    }

    /**
     * Reverse geocode coordinates to city name with localStorage caching
     * Caches results for 24 hours to avoid Nominatim rate limits and improve performance
     * @private
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<string>} City name or formatted coordinates fallback
     */
    async _reverseGeocode(lat, lon) {
        //  Round to 4 decimals (11m precision) for cache efficiency
        const cacheKey = `weather_geocode_${lat.toFixed(4)}_${lon.toFixed(4)}`;
        const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

        // CHECK CACHE FIRST (avoids API call entirely on repeat visits)
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const { city, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    console.log(
                        `[WeatherApp] ✅ Using CACHED geocode: "${city}" for ${lat.toFixed(4)}, ${lon.toFixed(4)}`
                    );
                    return city;
                }
            }
        } catch (error) {
            console.warn('[WeatherApp] Cache read error (ignoring):', error.message);
        }

        // MAKE API REQUEST WITH ENHANCED TIMEOUT (5s instead of 3s)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased to 5s

            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`,
                {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'WeatherApp/1.0 (https://weather-app.vercel.app)',
                        Accept: 'application/json',
                    },
                }
            );

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const address = data.address;

            // EXTRACT BEST AVAILABLE LOCATION NAME
            const rawName =
                address.city ||
                address.town ||
                address.village ||
                address.suburb ||
                address.hamlet ||
                address.state_district ||
                address.state ||
                address.country ||
                `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`;

            // CLEAN AND NORMALIZE NAME
            const cityName = rawName
                .replace(/ (Province|County|District|Region|State|Governorate|Oblast)$/i, '')
                .replace(/(City|Town|Village)$/i, '')
                .trim()
                .replace(/\s+/g, ' ');

            // CACHE SUCCESSFUL RESULT (24-hour expiry)
            try {
                localStorage.setItem(
                    cacheKey,
                    JSON.stringify({
                        city: cityName,
                        timestamp: Date.now(),
                        source: 'nominatim',
                    })
                );
                console.log(`[WeatherApp] 🗺️ Cached geocode: "${cityName}" for ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
            } catch (cacheError) {
                console.warn('[WeatherApp] Cache write failed (ignoring):', cacheError.message);
            }

            return cityName;
        } catch (error) {
            // SMART FALLBACK: Use cached value if available, otherwise format coordinates
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const { city } = JSON.parse(cached);
                    console.warn(`[WeatherApp] ⚠️ Geocoding failed, using STALE CACHE: "${city}"`);
                    return city;
                }
            } catch (e) {}

            // Final fallback: formatted coordinates
            const fallback = `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`;
            console.warn(`[WeatherApp] ❌ Geocoding failed completely. Using fallback: "${fallback}"`);
            return fallback;
        }
    }
}
