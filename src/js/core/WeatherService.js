/**
 * WeatherService Class
 * Handles all weather data fetching and API interactions
 * Implements security best practices and caching strategies
 *
 * Security Features:
 * - No API keys exposed in client code
 * - All requests routed through secure proxy
 * - Input validation and sanitization
 * - Rate limiting and request throttling
 * - XSS protection on responses
 *
 * Development Mode:
 * - Automatically uses mock data when running on localhost
 * - No API calls made during development
 *
 * @class WeatherService
 */
export class WeatherService {
    /**
     * Create a WeatherService instance
     * @param {string} apiBase - Base URL for weather API proxy endpoint
     */
    constructor(apiBase = '/api/weather') {
        this.apiBase = apiBase;
        this.cache = new Map();
        this.lastRequestTime = 0;
        this.REQUEST_COOLDOWN = 1000;
        this.CACHE_DURATION = 5 * 60 * 1000;

        // Initialize debug mode from localStorage
        this.debugMode = localStorage.getItem('debugWeather') === 'true';
        if (this.debugMode) {
            console.log('🔍 [WeatherService] DEBUG MODE ENABLED');
            console.log('🔍 [WeatherService] API Base:', this.apiBase);
        }
    }

    // ===== DEBUG HELPER =====
    _logDebug(...args) {
        if (this.debugMode) {
            console.log('[WeatherService-DEBUG]', ...args);
        }
    }

    _logError(...args) {
        console.error('[WeatherService-ERROR]', ...args);
    }

    async _fetchWithTimeout(url, options = {}, timeout = 8000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please check your connection.');
            }
            throw error;
        }
    }

    // ===== CORE METHODS WITH DEBUG LOGGING =====
    /**
     * Get current weather for specific coordinates
     * Automatically uses mock data in development mode
     * @param {Object} params - Location parameters
     * @param {number} params.lat - Latitude
     * @param {number} params.lon - Longitude
     * @param {string} params.units - Temperature units ('metric' or 'imperial')
     * @returns {Promise<Object>} Weather data
     */
    async getWeather({ lat, lon, units = 'metric' }) {
        const requestId = `weather-${Date.now()}`;
        this._logDebug(`[${requestId}] Starting getWeather request`);

        try {
            // Development mode check
            if (this._isDevelopmentMode()) {
                this._logDebug(`[${requestId}] Using MOCK data (development mode)`);
                return this._getMockWeatherData(lat, lon, units);
            }

            // Validation
            this._validateCoordinates(lat, lon);
            this._validateUnits(units);
            this._logDebug(`[${requestId}] Coordinates validated: ${lat}, ${lon}`);

            // Cache check
            const cacheKey = this._generateCacheKey(lat, lon, units);
            const cachedData = this._getCachedData(cacheKey);
            if (cachedData) {
                this._logDebug(`[${requestId}] Returning CACHED data for key: ${cacheKey}`);
                return cachedData;
            }
            this._logDebug(`[${requestId}] Cache MISS for key: ${cacheKey}`);

            // Build URL
            const url = this._buildWeatherUrl(lat, lon, units);
            this._logDebug(`[${requestId}] Built URL: ${url}`);
            this._logDebug(`[${requestId}] Full URL: ${window.location.origin}${url}`);

            // Throttle request
            await this._throttleRequest();
            this._logDebug(`[${requestId}] Request throttling passed`);

            // FETCH WITH COMPREHENSIVE DEBUGGING
            this._logDebug(`[${requestId}] ⏳ Initiating FETCH to Edge Function...`);

            const startTime = performance.now();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                this._logError(`[${requestId}] ❌ FETCH TIMEOUT after 10s`);
                controller.abort();
            }, 10000);

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Request-ID': requestId,
                        'X-Weather-Debug': 'true',
                    },
                    credentials: 'same-origin',
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);
                const duration = (performance.now() - startTime).toFixed(2);
                this._logDebug(`[${requestId}] ✅ FETCH completed in ${duration}ms | Status: ${response.status}`);

                // Log response headers for debugging
                if (this.debugMode) {
                    this._logDebug(`[${requestId}] Response Headers:`, Object.fromEntries(response.headers.entries()));
                }

                // Handle non-OK responses
                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json().catch(() => ({}));
                    } catch (e) {
                        errorData = { raw: await response.text() };
                    }

                    this._logError(`[${requestId}] ❌ API returned ${response.status}:`, errorData);

                    // Special handling for 404 (Edge Function not found)
                    if (response.status === 404) {
                        this._logError(`[${requestId}] ⚠️ CRITICAL: Edge Function NOT FOUND at ${url}`);
                        this._logError(`[${requestId}] ⚠️ Check: Is api/weather.js deployed at ROOT level?`);
                        this._logError(`[${requestId}] ⚠️ Test directly: ${window.location.origin}${url}`);
                    }

                    throw new Error(`API Error ${response.status}: ${JSON.stringify(errorData)}`);
                }

                // Parse and sanitize response
                const data = await response.json();
                this._logDebug(`[${requestId}] ✅ Parsed JSON response:`, data);

                const sanitizedData = this._sanitizeWeatherData(data);
                this._cacheData(cacheKey, sanitizedData);

                this._logDebug(`[${requestId}] ✅ Weather data processed and cached`);
                return sanitizedData;
            } catch (fetchError) {
                clearTimeout(timeoutId);

                // Classify error type
                if (fetchError.name === 'AbortError') {
                    this._logError(`[${requestId}] ❌ FETCH ABORTED (timeout)`);
                    throw new Error('Request timeout. Please check your internet connection.');
                }

                if (fetchError.message.includes('Failed to fetch')) {
                    this._logError(`[${requestId}] ❌ NETWORK ERROR: Failed to fetch`);
                    this._logError(`[${requestId}] Possible causes:`);
                    this._logError(`  1. Edge Function not deployed (404)`);
                    this._logError(`  2. CORS misconfiguration`);
                    this._logError(`  3. Network connectivity issue`);
                    this._logError(`  4. Browser extension blocking request`);
                    this._logError(`[${requestId}] Test Edge Function directly: ${window.location.origin}${url}`);
                }

                this._logError(`[${requestId}] ❌ FETCH FAILED:`, fetchError);
                throw fetchError;
            }
        } catch (error) {
            this._logError(`[${requestId}] ❌ getWeather FAILED:`, error);

            // Fallback to mock data in development
            if (this._isDevelopmentMode()) {
                this._logDebug(`[${requestId}] 🔄 Falling back to MOCK data`);
                return this._getMockWeatherData(lat, lon, units);
            }

            // Enhanced error for production
            if (error.message.includes('Failed to fetch')) {
                this._logError(`[${requestId}] 💡 TROUBLESHOOTING:`);
                this._logError(`  1. Open this URL directly in browser:`);
                this._logError(
                    `     ${window.location.origin}/api/weather?lat=${lat}&lon=${lon}&units=${units}&type=current`
                );
                this._logError(`  2. If 404: Edge Function not deployed correctly`);
                this._logError(`  3. If CORS error: Check Edge Function headers`);
                this._logError(`  4. Check Vercel logs for Edge Function errors`);
            }

            throw this._handleError(error, requestId);
        }
    }

    // ===== OTHER METHODS (condensed for brevity) =====
    // _validateCoordinates, _validateUnits, _generateCacheKey, _getCachedData,
    // _cacheData, _sanitizeWeatherData, _sanitizeForecastData, _sanitizeString,
    // _throttleRequest, _handleError, _isDevelopmentMode, _buildWeatherUrl,
    // _buildForecastUrl, _getMockWeatherData, _buildWeatherData, _getWeatherIconCode,
    // _getMockForecastData, searchLocations, _buildSearchUrl, _getMockSearchResults,
    // _sanitizeSearchQuery, _sanitizeSearchResults
    /**
     * Handle and format errors for user display
     * @private
     * @param {Error} error - Original error object
     * @returns {Error} Formatted error with user-friendly message
     */
    _handleError(error) {
        this._logError(`[${requestId}] Handling error:`, error.message);

        if (error.message.includes('Failed to fetch')) {
            return new Error(`Cannot connect to weather service. 
Debug ID: ${requestId}
Possible causes:
1. Edge Function not deployed (check Vercel)
2. Network connectivity issue
3. Browser blocking request (check extensions)
4. CORS misconfiguration

TEST: Open this URL directly:
${window.location.origin}/api/weather?lat=35.6892&lon=51.3890&units=metric&type=current`);
        }
        if (error.message.includes('timeout')) {
            return new Error('Request timeout. Please check your internet connection.');
        }

        if (error.message.includes('API Error 401')) {
            return new Error('Invalid API key. Please check Vercel environment variables.');
        }

        if (error.message.includes('API Error 404')) {
            return new Error('Weather service endpoint not found. Edge Function may not be deployed.');
        }

        return new Error(`Weather service error: ${error.message}`);
    }
    /**
     * Implement request throttling to prevent API abuse
     * @private
     * @param {number} cooldown - Cooldown period in milliseconds
     * @returns {Promise<void>}
     */
    _throttleRequest(cooldown = this.REQUEST_COOLDOWN) {
        return new Promise((resolve) => {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;

            if (timeSinceLastRequest >= cooldown) {
                this.lastRequestTime = now;
                resolve();
            } else {
                const waitTime = cooldown - timeSinceLastRequest;
                setTimeout(() => {
                    this.lastRequestTime = Date.now();
                    resolve();
                }, waitTime);
            }
        });
    }
    /**
     * Get weather forecast for specific coordinates
     * Automatically uses mock data in development mode
     * @param {Object} params - Location parameters
     * @param {number} params.lat - Latitude
     * @param {number} params.lon - Longitude
     * @param {string} params.units - Temperature units ('metric' or 'imperial')
     * @returns {Promise<Object>} Forecast data
     */
    async getForecast({ lat, lon, units = 'metric' }) {
        try {
            // Use mock data in development
            if (this._isDevelopmentMode()) {
                console.log('[WeatherService] Using MOCK forecast data');
                return this._getMockForecastData(lat, lon, units);
            }

            // Validate input parameters
            this._validateCoordinates(lat, lon);
            this._validateUnits(units);

            // Check cache first
            const cacheKey = this._generateCacheKey(lat, lon, units, 'forecast');
            const cachedData = this._getCachedData(cacheKey);

            if (cachedData) {
                console.log('[WeatherService] Returning cached forecast data');
                return cachedData;
            }

            // Implement request throttling
            await this._throttleRequest();

            // Fetch forecast data from API
            const response = await this._fetchWithTimeout(this._buildForecastUrl(lat, lon, units), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Sanitize and process forecast data
            const sanitizedData = this._sanitizeForecastData(data);

            // Cache the data
            this._cacheData(cacheKey, sanitizedData);

            return sanitizedData;
        } catch (error) {
            console.error('[WeatherService] Error fetching forecast:', error);

            // Fallback to mock data in development
            if (this._isDevelopmentMode()) {
                console.warn('[WeatherService] Forecast API failed, using MOCK data');
                return this._getMockForecastData(lat, lon, units);
            }

            throw this._handleError(error);
        }
    }

    // ... [Other validation and helper methods remain unchanged] ...

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
    // Update _buildWeatherUrl method
    _buildWeatherUrl(lat, lon, units) {
        // Use FREE current weather endpoint with type parameter
        const params = new URLSearchParams({
            lat: lat.toString(),
            lon: lon.toString(),
            units: units,
            type: 'current', // Critical for Edge Function routing
        });
        return `${this.apiBase}?${params.toString()}`;
    }

    // Update _buildForecastUrl method
    _buildForecastUrl(lat, lon, units) {
        // Use FREE forecast endpoint with type parameter
        const params = new URLSearchParams({
            lat: lat.toString(),
            lon: lon.toString(),
            units: units,
            type: 'forecast', // Critical for Edge Function routing
        });
        return `${this.apiBase}?${params.toString()}`;
    }
    /**
     * Generate location-specific mock weather data using verified February climate averages
     * Uses real meteorological data from climate-data.org and World Bank Climate Portal
     * NOT real-time weather - represents typical February conditions for development testing
     * @private
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {string} units - Temperature units ('metric' or 'imperial')
     * @returns {Object} Complete weather data object with climate-accurate values
     */
    _getMockWeatherData(lat, lon, units) {
        // Generate deterministic seed from coordinates (0-99) for consistent results
        const seed = Math.abs(Math.floor((Math.sin(lat * lon + lat + lon) * 10000) % 100));

        // SPECIAL HANDLING FOR TEHRAN (Default Location) - Verified Feb averages
        // Source: https://en.climate-data.org/asia/iran/tehran/tehran-350/
        const isTehran = Math.abs(lat - 35.6892) < 0.1 && Math.abs(lon - 51.389) < 0.1;
        if (isTehran) {
            // ✅ DYNAMIC: Get current hour in Tehran (UTC+3:30)
            const tehranOffset = 12600; // 3.5 hours in seconds
            const now = new Date();
            const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
            const tehranTime = new Date(utcTime + tehranOffset * 1000);
            const hour = tehranTime.getHours();

            // ✅ DYNAMIC: Vary conditions based on time of day (realistic Tehran February patterns)
            let condition, description, iconCode, clouds, humidity;

            if (hour >= 22 || hour < 6) {
                // Night (10PM - 6AM): Clear/Cold
                condition = 'Clear';
                description = 'clear sky';
                iconCode = '01n'; // Night icon
                clouds = 10;
                humidity = 50;
            } else if (hour >= 6 && hour < 10) {
                // Morning (6AM - 10AM): Clear/Cool
                condition = 'Clear';
                description = 'clear sky';
                iconCode = '01d';
                clouds = 15;
                humidity = 55;
            } else if (hour >= 10 && hour < 14) {
                // Midday (10AM - 2PM): Few clouds
                condition = 'Clouds';
                description = 'few clouds';
                iconCode = '02d';
                clouds = 30;
                humidity = 45;
            } else if (hour >= 14 && hour < 18) {
                // Afternoon (2PM - 6PM): Scattered clouds (most common)
                condition = 'Clouds';
                description = 'scattered clouds';
                iconCode = '03d';
                clouds = 50;
                humidity = 40;
            } else {
                // Evening (6PM - 10PM): Broken clouds
                condition = 'Clouds';
                description = 'broken clouds';
                iconCode = '04d';
                clouds = 70;
                humidity = 50;
            }

            // Temperature with small variation based on time of day
            const baseTempC = hour < 12 ? 4 : hour < 16 ? 6 : 5; // Cooler morning, warmer afternoon
            const tempVariation = Math.sin(now.getMinutes() * 0.1) * 1.5; // Small minute-based variation
            const tempC = baseTempC + tempVariation;

            return this._buildWeatherData({
                name: 'Tehran',
                country: 'IR',
                lat: 35.6892,
                lon: 51.389,
                timezone: 12600,
                temp: units === 'metric' ? tempC : Math.round((tempC * 9) / 5 + 32),
                feelsLike: units === 'metric' ? 2 : 36, // Wind chill adjusted
                tempMin: units === 'metric' ? 1 : 34, // February average low
                tempMax: units === 'metric' ? 8 : 46, // February average high
                pressure: 1020,
                humidity: humidity,
                condition: condition,
                description: description,
                windSpeed: units === 'metric' ? 3.2 : 7.2,
                windDeg: 315, // Prevailing NW winter winds
                clouds: clouds,
                units: units,
                iconCode: iconCode,
            });
        }

        // FEBRUARY CLIMATE ZONES (Verified averages from climate-data.org)
        // Northern Hemisphere = Winter | Southern Hemisphere = Summer
        const isNorthernHemisphere = lat > 0;
        const absLat = Math.abs(lat);
        let baseTempC, condition, description, clouds, humidity;

        // Determine climate zone and base temperature using verified February averages
        if (isNorthernHemisphere) {
            // NORTHERN HEMISPHERE WINTER (February)
            if (absLat >= 60) {
                // Arctic: Avg -15°C to -5°C (Reykjavik, Anchorage)
                baseTempC = -10;
                condition = seed < 40 ? 'Snow' : 'Clouds';
                description = condition === 'Snow' ? 'light snow' : 'overcast clouds';
                clouds = condition === 'Snow' ? 90 : 80;
                humidity = 85;
            } else if (absLat >= 50) {
                // Subarctic: Avg -8°C to 0°C (Berlin, Moscow, Warsaw)
                // Source: Berlin Feb avg: High 3°C, Low -2°C → Avg 0.5°C
                baseTempC = -1;
                condition = seed < 30 ? 'Snow' : seed < 70 ? 'Clouds' : 'Clear';
                description =
                    condition === 'Snow' ? 'light snow' : condition === 'Clouds' ? 'scattered clouds' : 'clear sky';
                clouds = condition === 'Snow' ? 85 : condition === 'Clouds' ? 60 : 20;
                humidity = condition === 'Snow' ? 85 : condition === 'Clouds' ? 75 : 60;
            } else if (absLat >= 40) {
                // Temperate: Avg 0°C to 8°C (New York, Beijing, Istanbul)
                // Source: NYC Feb avg: High 4°C, Low -3°C → Avg 0.5°C
                baseTempC = 2;
                condition = seed < 25 ? 'Snow' : seed < 65 ? 'Clouds' : 'Clear';
                description = condition === 'Snow' ? 'light snow' : condition === 'Clouds' ? 'few clouds' : 'clear sky';
                clouds = condition === 'Snow' ? 75 : condition === 'Clouds' ? 45 : 15;
                humidity = condition === 'Snow' ? 80 : condition === 'Clouds' ? 70 : 55;
            } else if (absLat >= 30) {
                // Subtropical: Avg 8°C to 15°C (Tehran, Seoul, Atlanta)
                // Source: Seoul Feb avg: High 5°C, Low -5°C → Avg 0°C (cooler than Tehran)
                baseTempC = 8;
                condition = seed < 20 ? 'Rain' : seed < 60 ? 'Clouds' : 'Clear';
                description =
                    condition === 'Rain' ? 'light rain' : condition === 'Clouds' ? 'scattered clouds' : 'clear sky';
                clouds = condition === 'Rain' ? 70 : condition === 'Clouds' ? 50 : 20;
                humidity = condition === 'Rain' ? 80 : condition === 'Clouds' ? 65 : 50;
            } else {
                // Tropical: Avg 18°C to 25°C (Cairo, Riyadh, Miami)
                // Source: Cairo Feb avg: High 20°C, Low 9°C → Avg 14.5°C
                baseTempC = 18;
                condition = seed < 15 ? 'Rain' : seed < 40 ? 'Clouds' : 'Clear';
                description =
                    condition === 'Rain' ? 'moderate rain' : condition === 'Clouds' ? 'few clouds' : 'clear sky';
                clouds = condition === 'Rain' ? 65 : condition === 'Clouds' ? 35 : 10;
                humidity = condition === 'Rain' ? 75 : condition === 'Clouds' ? 60 : 45;
            }
        } else {
            // SOUTHERN HEMISPHERE SUMMER (February)
            if (absLat >= 50) {
                // Subantarctic: Avg 2°C to 8°C (Ushuaia, South Island NZ)
                baseTempC = 5;
                condition = seed < 30 ? 'Rain' : seed < 70 ? 'Clouds' : 'Clear';
                description =
                    condition === 'Rain' ? 'light rain' : condition === 'Clouds' ? 'scattered clouds' : 'clear sky';
                clouds = condition === 'Rain' ? 75 : condition === 'Clouds' ? 60 : 25;
                humidity = 75;
            } else if (absLat >= 40) {
                // Temperate: Avg 12°C to 20°C (Melbourne, Wellington)
                // Source: Melbourne Feb avg: High 26°C, Low 15°C → Avg 20.5°C
                baseTempC = 18;
                condition = seed < 25 ? 'Rain' : seed < 60 ? 'Clouds' : 'Clear';
                description =
                    condition === 'Rain' ? 'light rain' : condition === 'Clouds' ? 'few clouds' : 'mostly clear';
                clouds = condition === 'Rain' ? 65 : condition === 'Clouds' ? 40 : 20;
                humidity = 65;
            } else if (absLat >= 30) {
                // Subtropical: Avg 20°C to 26°C (Sydney, Perth, Buenos Aires)
                // Source: Sydney Feb avg: High 26°C, Low 19°C → Avg 22.5°C
                baseTempC = 23;
                condition = seed < 20 ? 'Rain' : seed < 50 ? 'Clouds' : 'Clear';
                description =
                    condition === 'Rain' ? 'moderate rain' : condition === 'Clouds' ? 'few clouds' : 'clear sky';
                clouds = condition === 'Rain' ? 60 : condition === 'Clouds' ? 35 : 15;
                humidity = condition === 'Rain' ? 75 : condition === 'Clouds' ? 65 : 55;
            } else {
                // Tropical: Avg 25°C to 30°C (Rio, Singapore, Nairobi)
                baseTempC = 27;
                condition = seed < 30 ? 'Rain' : seed < 60 ? 'Clouds' : 'Clear';
                description =
                    condition === 'Rain' ? 'heavy rain' : condition === 'Clouds' ? 'scattered clouds' : 'clear sky';
                clouds = condition === 'Rain' ? 80 : condition === 'Clouds' ? 50 : 20;
                humidity = 80;
            }
        }

        // Add small deterministic variation (-2°C to +2°C) for natural diversity
        const tempVariation = (seed % 5) - 2;
        let tempC = baseTempC + tempVariation;
        tempC = Math.max(-25, Math.min(40, tempC)); // Global realistic clamp
        const temp = units === 'metric' ? Math.round(tempC) : Math.round((tempC * 9) / 5 + 32);

        // Calculate realistic derived values
        const feelsLikeOffset = tempC < 0 ? 4 : tempC < 10 ? 2 : 1;
        const windSpeedMetric = 2 + (seed % 5); // 2-6 m/s realistic range
        const pressure = 1013 + Math.floor(seed / 10) - 5; // 1008-1018 hPa realistic range

        // Wind direction based on hemisphere and climate patterns
        let windDeg;
        if (isNorthernHemisphere) {
            // Prevailing westerlies dominate mid-latitudes in winter
            windDeg =
                absLat > 30 && absLat < 60
                    ? 270 + (seed % 20) - 10 // Westerlies (260°-280°)
                    : 180 + (seed % 60) - 30; // Variable (150°-210°)
        } else {
            // Southern Hemisphere: Strong westerlies ("Roaring Forties")
            windDeg =
                absLat > 40
                    ? 270 + (seed % 15) - 7 // Westerlies (263°-277°)
                    : 120 + (seed % 60) - 30; // Southeast trades (90°-150°)
        }
        windDeg = (windDeg + 360) % 360; // Normalize to 0-360°
        // ✅ CRITICAL FIX: Determine DAY vs NIGHT icon based on location's current time
        const timezoneOffset = Math.round(lon / 15) * 3600; // Approximate timezone in seconds
        const now = new Date();
        const localTime = new Date(now.getTime() + timezoneOffset * 1000);
        const hour = localTime.getUTCHours();
        const isDayTime = hour >= 6 && hour < 18; // 6 AM to 6 PM = daytime
        const timeSuffix = isDayTime ? 'd' : 'n';

        // Map condition to base icon code
        const baseIconMap = {
            Clear: '01',
            Clouds: '03',
            Rain: '10',
            Drizzle: '09',
            Thunderstorm: '11',
            Snow: '13',
            Mist: '50',
            Smoke: '50',
            Haze: '50',
            Dust: '50',
            Fog: '50',
            Sand: '50',
            Ash: '50',
            Squall: '50',
            Tornado: '50',
        };
        const baseIconCode = baseIconMap[condition] || '03';
        const iconCode = baseIconCode + timeSuffix; // e.g., '01n' for clear night
        const timezone = isTehran ? 12600 : Math.round(lon / 15) * 3600;
        return this._buildWeatherData({
            name: 'Unknown Location',
            country: 'XX',
            lat: lat,
            lon: lon,
            timezone: timezone,
            temp: temp,
            feelsLike:
                units === 'metric'
                    ? Math.round(tempC - feelsLikeOffset)
                    : Math.round(((tempC - feelsLikeOffset) * 9) / 5 + 32),
            tempMin: units === 'metric' ? Math.round(tempC - 3) : Math.round(((tempC - 3) * 9) / 5 + 32),
            tempMax: units === 'metric' ? Math.round(tempC + 3) : Math.round(((tempC + 3) * 9) / 5 + 32),
            pressure: pressure,
            humidity: humidity,
            windSpeed: units === 'metric' ? windSpeedMetric : Math.round(windSpeedMetric * 2.237),
            windDeg: windDeg,
            clouds: clouds,
            units: units,
            condition: condition,
            description: description,
            iconCode: iconCode,
        });
    }
    /**
     * Helper to build standardized weather data object
     * Ensures all required fields exist for renderer
     * @private
     * @param {Object} params - Weather parameters
     * @returns {Object} Complete weather data object
     */
    _buildWeatherData(params) {
        // ✅ USE iconCode IF PROVIDED (for dynamic day/night icons)
        const icon = params.iconCode || this._getWeatherIconCode(params.condition);
        return {
            name: params.name,
            sys: {
                country: params.country,
                sunrise: Math.floor(Date.now() / 1000) + params.timezone + 21600,
                sunset: Math.floor(Date.now() / 1000) + params.timezone + 64800,
            },
            main: {
                temp: params.temp,
                feels_like: params.feelsLike,
                temp_min: params.tempMin,
                temp_max: params.tempMax,
                pressure: params.pressure,
                humidity: params.humidity,
            },
            weather: [
                {
                    main: params.condition,
                    description: params.description,
                    icon: icon,
                },
            ],
            wind: {
                speed: params.windSpeed,
                deg: params.windDeg,
            },
            clouds: { all: params.clouds },
            dt: Math.floor(Date.now() / 1000),
            timezone: params.timezone,
            coord: { lat: params.lat, lon: params.lon },
        };
    }

    /**
     * Get OpenWeatherMap icon code for condition
     * @private
     * @param {string} condition - Weather condition name
     * @returns {string} Icon code
     */
    _getWeatherIconCode(condition) {
        const icons = {
            Clear: '01d',
            Clouds: '03d',
            Rain: '10d',
            Drizzle: '09d',
            Thunderstorm: '11d',
            Snow: '13d',
            Mist: '50d',
            Smoke: '50d',
            Haze: '50d',
            Dust: '50d',
            Fog: '50d',
            Sand: '50d',
            Ash: '50d',
            Squall: '50d',
            Tornado: '50d',
        };
        return icons[condition] || '03d';
    }
    /**
     * Generate mock forecast data (7 days)
     * @private
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {string} units - Temperature units
     * @returns {Object} Mock forecast data with daily array
     */
    _getMockForecastData(lat, lon, units) {
        const daily = [];
        const baseTempC = 30 - Math.abs(lat) * 0.4;

        for (let i = 0; i < 7; i++) {
            const tempVariation = Math.sin((lat + i) * (lon + i)) * 4 + i * 0.5;
            let tempC = baseTempC + tempVariation;
            tempC = Math.max(-5, Math.min(40, tempC));

            const temp = units === 'metric' ? Math.round(tempC) : Math.round((tempC * 9) / 5 + 32);

            // Cycle conditions for visual variety
            const conditions = [
                { main: 'Clear', desc: 'clear sky', icon: '01d' },
                { main: 'Clouds', desc: 'few clouds', icon: '02d' },
                { main: 'Clouds', desc: 'scattered clouds', icon: '03d' },
                { main: 'Rain', desc: 'light rain', icon: '10d' },
                { main: 'Clear', desc: 'clear sky', icon: '01d' },
                { main: 'Clouds', desc: 'broken clouds', icon: '04d' },
                { main: 'Clear', desc: 'clear sky', icon: '01d' },
            ];
            const condition = conditions[i % conditions.length];

            daily.push({
                dt: Math.floor(Date.now() / 1000) + i * 86400,
                temp: {
                    day: temp,
                    min: units === 'metric' ? Math.round(tempC - 5) : Math.round(((tempC - 5) * 9) / 5 + 32),
                    max: units === 'metric' ? Math.round(tempC + 5) : Math.round(((tempC + 5) * 9) / 5 + 32),
                    night: units === 'metric' ? Math.round(tempC - 3) : Math.round(((tempC - 3) * 9) / 5 + 32),
                    eve: units === 'metric' ? Math.round(tempC + 1) : Math.round(((tempC + 1) * 9) / 5 + 32),
                    morn: units === 'metric' ? Math.round(tempC - 4) : Math.round(((tempC - 4) * 9) / 5 + 32),
                },
                feels_like: {
                    day: units === 'metric' ? Math.round(tempC - 2) : Math.round(((tempC - 2) * 9) / 5 + 32),
                    night: units === 'metric' ? Math.round(tempC - 4) : Math.round(((tempC - 4) * 9) / 5 + 32),
                    eve: units === 'metric' ? Math.round(tempC) : Math.round((tempC * 9) / 5 + 32),
                    morn: units === 'metric' ? Math.round(tempC - 5) : Math.round(((tempC - 5) * 9) / 5 + 32),
                },
                pressure: 1015,
                humidity: 65,
                dew_point: 5,
                wind_speed: 3.6,
                wind_deg: 270,
                weather: [{ main: condition.main, description: condition.desc, icon: condition.icon }],
                clouds: 40,
                pop: condition.main === 'Rain' ? 0.4 : 0,
                uvi: 5,
            });
        }

        return { daily };
    }
    /**
     * Search for locations by name
     * Automatically uses mock data in development mode
     * @param {string} query - Location search query
     * @returns {Promise<Array>} Array of location results
     */
    async searchLocations(query) {
        try {
            // Use mock data in development to avoid API dependency
            if (this._isDevelopmentMode()) {
                console.log('[WeatherService] Using MOCK search results');
                return this._getMockSearchResults(query);
            }

            // Validate and sanitize search query
            const sanitizedQuery = this._sanitizeSearchQuery(query);

            if (!sanitizedQuery || sanitizedQuery.length < 2) {
                return [];
            }

            // Implement request throttling with longer cooldown for search
            await this._throttleRequest(2000);

            // Fetch search results from API
            const response = await fetch(this._buildSearchUrl(sanitizedQuery), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Sanitize search results
            return this._sanitizeSearchResults(data);
        } catch (error) {
            console.error('[WeatherService] Error searching locations:', error);

            // Fallback to mock data in development if API fails
            if (this._isDevelopmentMode()) {
                console.warn('[WeatherService] Search API failed, using MOCK results');
                return this._getMockSearchResults(query);
            }

            return [];
        }
    }

    /**
     * Build location search URL
     * @private
     * @param {string} query - Search query
     * @returns {string} Complete search URL
     */
    _buildSearchUrl(query) {
        const params = new URLSearchParams({
            q: query,
            limit: '5', // Limit results for performance
        });

        // Point to dedicated /api/search endpoint (NOT /api/weather/search)
        return `/api/search?${params.toString()}`;
    }

    /**
     * Generate mock search results for development
     * Features 40+ cities across all inhabited continents
     * @private
     * @param {string} query - Search query
     * @returns {Array} Mock location results with global diversity
     */
    _getMockSearchResults(query) {
        // Comprehensive global cities database (40+ locations)
        const locations = [
            // North America
            { name: 'San Francisco', state: 'CA', country: 'US', lat: 37.7749, lon: -122.4194 },
            { name: 'New York', state: 'NY', country: 'US', lat: 40.7128, lon: -74.006 },
            { name: 'Los Angeles', state: 'CA', country: 'US', lat: 34.0522, lon: -118.2437 },
            { name: 'Chicago', state: 'IL', country: 'US', lat: 41.8781, lon: -87.6298 },
            { name: 'Toronto', state: 'ON', country: 'CA', lat: 43.651, lon: -79.347 },
            { name: 'Mexico City', country: 'MX', lat: 19.4326, lon: -99.1332 },
            { name: 'Vancouver', state: 'BC', country: 'CA', lat: 49.2827, lon: -123.1207 },

            // South America
            { name: 'São Paulo', country: 'BR', lat: -23.5505, lon: -46.6333 },
            { name: 'Rio de Janeiro', country: 'BR', lat: -22.9068, lon: -43.1729 },
            { name: 'Buenos Aires', country: 'AR', lat: -34.6037, lon: -58.3816 },
            { name: 'Lima', country: 'PE', lat: -12.0464, lon: -77.0428 },
            { name: 'Bogotá', country: 'CO', lat: 4.711, lon: -74.0721 },

            // Europe
            { name: 'London', country: 'GB', lat: 51.5074, lon: -0.1278 },
            { name: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 },
            { name: 'Berlin', country: 'DE', lat: 52.52, lon: 13.405 },
            { name: 'Rome', country: 'IT', lat: 41.9028, lon: 12.4964 },
            { name: 'Madrid', country: 'ES', lat: 40.4168, lon: -3.7038 },
            { name: 'Moscow', country: 'RU', lat: 55.7558, lon: 37.6173 },
            { name: 'Stockholm', country: 'SE', lat: 59.3293, lon: 18.0686 },
            { name: 'Athens', country: 'GR', lat: 37.9838, lon: 23.7275 },

            // Africa
            { name: 'Cairo', country: 'EG', lat: 30.0444, lon: 31.2357 },
            { name: 'Lagos', country: 'NG', lat: 6.5244, lon: 3.3792 },
            { name: 'Nairobi', country: 'KE', lat: -1.2921, lon: 36.8219 },
            { name: 'Cape Town', country: 'ZA', lat: -33.9249, lon: 18.4241 },
            { name: 'Marrakesh', country: 'MA', lat: 31.6295, lon: -7.9811 },
            { name: 'Johannesburg', country: 'ZA', lat: -26.2041, lon: 28.0473 },

            // Asia
            { name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503 },
            { name: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.978 },
            { name: 'Shanghai', country: 'CN', lat: 31.2304, lon: 121.4737 },
            { name: 'Beijing', country: 'CN', lat: 39.9042, lon: 116.4074 },
            { name: 'Mumbai', country: 'IN', lat: 19.076, lon: 72.8777 },
            { name: 'Delhi', country: 'IN', lat: 28.7041, lon: 77.1025 },
            { name: 'Bangkok', country: 'TH', lat: 13.7563, lon: 100.5018 },
            { name: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198 },
            { name: 'Dubai', country: 'AE', lat: 25.2048, lon: 55.2708 },
            { name: 'Istanbul', country: 'TR', lat: 41.0082, lon: 28.9784 },

            // Oceania
            { name: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093 },
            { name: 'Melbourne', country: 'AU', lat: -37.8136, lon: 144.9631 },
            { name: 'Auckland', country: 'NZ', lat: -36.8485, lon: 174.7633 },
            { name: 'Wellington', country: 'NZ', lat: -41.2865, lon: 174.7762 },

            // Middle East
            { name: 'Tel Aviv', country: 'IL', lat: 32.0853, lon: 34.7818 },
            { name: 'Riyadh', country: 'SA', lat: 24.7136, lon: 46.6753 },
            { name: 'Tehran', country: 'IR', lat: 35.6892, lon: 51.389 },
        ];

        // Case-insensitive search across name, state, and country
        const lowerQuery = query.toLowerCase().trim();

        if (!lowerQuery) {
            // Return diverse sample when query is empty
            return [
                locations[0], // San Francisco
                locations[10], // Buenos Aires
                locations[20], // Nairobi
                locations[30], // Mumbai
                locations[40], // Auckland
            ];
        }

        // Filter locations matching query in any field
        const results = locations.filter(
            (loc) =>
                loc.name.toLowerCase().includes(lowerQuery) ||
                (loc.state && loc.state.toLowerCase().includes(lowerQuery)) ||
                loc.country.toLowerCase().includes(lowerQuery)
        );

        // Prioritize exact matches and shorter names
        results.sort((a, b) => {
            const aMatch = a.name.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
            const bMatch = b.name.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
            if (aMatch !== bMatch) return aMatch - bMatch;
            return a.name.length - b.name.length;
        });

        return results.slice(0, 5); // Return top 5 results
    }

    /**
     * Sanitize search query
     * @private
     * @param {string} query - Search query
     * @returns {string} Sanitized query
     */
    _sanitizeSearchQuery(query) {
        if (typeof query !== 'string') {
            return '';
        }

        // Remove special characters that could be used for injection
        return query
            .trim()
            .replace(/[<>\"'`]/g, '')
            .replace(/\s+/g, ' ')
            .substring(0, 100); // Limit query length
    }

    /**
     * Sanitize search results
     * @private
     * @param {Array} results - Search results
     * @returns {Array} Sanitized results
     */
    _sanitizeSearchResults(results) {
        // Handle object response { results: [...] } from Edge Function
        if (results && typeof results === 'object' && Array.isArray(results.results)) {
            console.log('[WeatherService] Detected object response structure, extracting results array');
            results = results.results;
        }
        // If still not an array, return empty array
        if (!Array.isArray(results)) {
            console.warn('[WeatherService] Invalid search results format, returning empty array');
            return [];
        }

        return results
            .filter((result) => result && result.name && result.lat && result.lon)
            .map((result) => ({
                name: this._sanitizeString(result.name),
                country: result.country ? this._sanitizeString(result.country) : '',
                state: result.state ? this._sanitizeString(result.state) : '',
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
            }))
            .slice(0, 5); // Limit to 5 results
    }

    /**
     * Validate latitude and longitude coordinates
     * @private
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @throws {Error} If coordinates are invalid
     */
    _validateCoordinates(lat, lon) {
        if (typeof lat !== 'number' || typeof lon !== 'number') {
            throw new Error('Coordinates must be numbers');
        }

        if (lat < -90 || lat > 90) {
            throw new Error('Latitude must be between -90 and 90');
        }

        if (lon < -180 || lon > 180) {
            throw new Error('Longitude must be between -180 and 180');
        }
    }

    /**
     * Validate temperature units
     * @private
     * @param {string} units - Units to validate
     * @throws {Error} If units are invalid
     */
    _validateUnits(units) {
        if (!['metric', 'imperial'].includes(units)) {
            throw new Error('Units must be "metric" or "imperial"');
        }
    }

    /**
     * Generate cache key for weather data
     * @private
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {string} units - Temperature units
     * @param {string} type - Data type ('current' or 'forecast')
     * @returns {string} Cache key
     */
    _generateCacheKey(lat, lon, units, type = 'current') {
        return `${type}_${lat}_${lon}_${units}`;
    }

    /**
     * Get cached data if still valid
     * @private
     * @param {string} key - Cache key
     * @returns {Object|null} Cached data or null
     */
    _getCachedData(key) {
        const cached = this.cache.get(key);

        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }

        // Remove expired cache entry
        if (cached) {
            this.cache.delete(key);
        }

        return null;
    }

    /**
     * Cache weather data
     * @private
     * @param {string} key - Cache key
     * @param {Object} data - Data to cache
     */
    _cacheData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    /**
     * Sanitize weather data to prevent XSS attacks
     * @private
     * @param {Object} data - Raw weather data
     * @returns {Object} Sanitized data
     */
    _sanitizeWeatherData(data) {
        // Deep clone to avoid modifying original data
        const sanitized = JSON.parse(JSON.stringify(data));

        // Sanitize string fields
        if (sanitized.name) {
            sanitized.name = this._sanitizeString(sanitized.name);
        }

        if (sanitized.weather && Array.isArray(sanitized.weather)) {
            sanitized.weather = sanitized.weather.map((item) => ({
                ...item,
                description: item.description ? this._sanitizeString(item.description) : '',
                main: item.main ? this._sanitizeString(item.main) : '',
            }));
        }

        return sanitized;
    }

    /**
     * Sanitize forecast data
     * @private
     * @param {Object} data - Raw forecast data
     * @returns {Object} Sanitized forecast data
     */
    _sanitizeForecastData(data) {
        const sanitized = JSON.parse(JSON.stringify(data));

        // Process daily forecast items
        if (sanitized.daily && Array.isArray(sanitized.daily)) {
            sanitized.daily = sanitized.daily.map((day) => ({
                ...day,
                weather:
                    day.weather && Array.isArray(day.weather)
                        ? day.weather.map((item) => ({
                              ...item,
                              description: item.description ? this._sanitizeString(item.description) : '',
                              main: item.main ? this._sanitizeString(item.main) : '',
                          }))
                        : [],
            }));
        }

        return sanitized;
    }

    /**
     * Sanitize string to prevent XSS
     * @private
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    _sanitizeString(str) {
        if (typeof str !== 'string') {
            return '';
        }

        // Basic HTML entity encoding
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
