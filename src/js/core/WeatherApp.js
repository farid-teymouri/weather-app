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
import { FavoritesManager } from '../ui/FavoritesManager.js';
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
        this.favoritesManager = null;
        this.toast = null;
        this.loadingSpinner = null;

        // Application state
        this.state = {
            currentWeather: null,
            forecast: null,
            favorites: [],
            units: this.storageManager.getUnits() || this.config.defaultUnits,
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

        // Load saved favorites
        this._loadFavorites();

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
        this.favoritesManager = new FavoritesManager(this.storageManager);
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
        // Window events
        window.addEventListener('online', () => this._handleOnline());
        window.addEventListener('offline', () => this._handleOffline());
    }

    /**
     * Initialize weather data
     * Automatically uses mock data in development mode
     * @private
     */
    async _initializeWeather() {
        try {
            this._setLoading(true);

            // Use mock data in development to avoid API dependency
            if (this._isDevelopmentMode()) {
                console.log('[WeatherApp] Development mode: using default location (San Francisco)');
                await this.getWeatherByCoordinates(this.config.defaultLocation.lat, this.config.defaultLocation.lon);
                this.toast.showInfo('Using mock data for development. No API calls made.');
                return;
            }

            // Try to get user's current location
            const position = await this.geolocationManager.getCurrentPosition();

            if (position) {
                this.state.currentLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                };

                await this.getWeatherByCoordinates(position.coords.latitude, position.coords.longitude);
            } else {
                // Fallback to default location
                console.log('[WeatherApp] Using default location');
                await this.getWeatherByCoordinates(this.config.defaultLocation.lat, this.config.defaultLocation.lon);
            }
        } catch (error) {
            console.error('[WeatherApp] Error initializing weather:', error);
            this.toast.showError('Unable to load weather data. Please try again.');

            // Final fallback to default location
            try {
                await this.getWeatherByCoordinates(this.config.defaultLocation.lat, this.config.defaultLocation.lon);
            } catch (fallbackError) {
                console.error('[WeatherApp] Fallback failed:', fallbackError);
                this._setError('Failed to load weather data');
            }
        } finally {
            this._setLoading(false);
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

            // ✅ CRITICAL FIX: Bypass geolocation in development mode
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

            // ✅ Fallback to default location on ANY error (including timeout)
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

        // Update unit toggle display
        const unitLabel = this.state.units === 'metric' ? '°C' : '°F';
        const unitToggle = document.getElementById('unit-toggle');
        if (unitToggle) {
            const display = unitToggle.querySelector('.unit-display');
            if (display) {
                display.textContent = unitLabel;
            }
        }
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
     * Load favorites from storage with safety check
     * @private
     */
    _loadFavorites() {
        try {
            // Ensure we always have an array
            const rawFavorites = this.favoritesManager.getFavorites();
            this.state.favorites = Array.isArray(rawFavorites) ? rawFavorites : [];
            this.renderer.renderFavorites(this.state.favorites);
        } catch (error) {
            console.error('[WeatherApp] Error loading favorites:', error);
            this.state.favorites = []; // Safe default
            this.renderer.renderFavorites([]);
        }
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

            // ✅ CRITICAL FIX: Override API name with search result name
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

            // Suggest adding to favorites if not already saved
            if (!this._isFavorite(location)) {
                this.toast.showInfo(`💡 Press Ctrl+D to save ${location.name} to favorites`);
            }
        } catch (error) {
            console.error('[WeatherApp] Error loading location weather:', error);
            this.toast.showError('Failed to load weather for this location. Please try again.');
        } finally {
            this._setLoading(false);
        }
    }
    /**
     * Check if location is already in favorites
     * @private
     * @param {Object} location - Location to check
     * @returns {boolean} True if location is favorited
     */
    _isFavorite(location) {
        if (!location || !location.lat || !location.lon) {
            return false;
        }

        return this.state.favorites.some((fav) => fav.lat === location.lat && fav.lon === location.lon);
    }
}
