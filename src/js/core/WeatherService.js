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
    constructor(apiBase = '/.netlify/functions/weather') {
        this.apiBase = apiBase;
        this.cache = new Map();
        this.lastRequestTime = 0;
        this.REQUEST_COOLDOWN = 1000; // 1 second minimum between requests
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    }

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
        try {
            // Use mock data in development to avoid API dependency
            if (this._isDevelopmentMode()) {
                console.log('[WeatherService] Using MOCK data (no API call)');
                return this._getMockWeatherData(lat, lon, units);
            }

            // Validate input parameters
            this._validateCoordinates(lat, lon);
            this._validateUnits(units);

            // Check cache first
            const cacheKey = this._generateCacheKey(lat, lon, units);
            const cachedData = this._getCachedData(cacheKey);

            if (cachedData) {
                console.log('[WeatherService] Returning cached weather data');
                return cachedData;
            }

            // Implement request throttling
            await this._throttleRequest();

            // Fetch weather data from API
            const response = await fetch(this._buildWeatherUrl(lat, lon, units), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            });

            // Handle API errors
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Sanitize response data to prevent XSS
            const sanitizedData = this._sanitizeWeatherData(data);

            // Cache the data
            this._cacheData(cacheKey, sanitizedData);

            return sanitizedData;
        } catch (error) {
            console.error('[WeatherService] Error fetching weather:', error);

            // Fallback to mock data in development if API fails
            if (this._isDevelopmentMode()) {
                console.warn('[WeatherService] API failed, falling back to MOCK data');
                return this._getMockWeatherData(lat, lon, units);
            }

            throw this._handleError(error);
        }
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
            const response = await fetch(this._buildForecastUrl(lat, lon, units), {
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

    /**
     * Generate location-specific mock weather data
     * Uses coordinates to determine realistic weather patterns
     * @private
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {string} units - Temperature units ('metric' or 'imperial')
     * @returns {Object} Mock weather data with location-appropriate values
     */
    _getMockWeatherData(lat, lon, units) {
        // Generate deterministic seed from coordinates for consistent results
        const seed = Math.abs(Math.sin(lat * lon + lat + lon) * 10000);

        // Calculate base temperature based on latitude (warmer near equator)
        // Formula: 30°C at equator (0°), decreases by ~0.4°C per degree latitude
        const baseTempC = 30 - Math.abs(lat) * 0.4;

        // Add small deterministic variation based on coordinates
        const tempVariation = (seed % 7) - 3; // Range: -3 to +3
        let tempC = baseTempC + tempVariation;

        // Clamp to realistic global range
        tempC = Math.max(-15, Math.min(45, tempC));

        // Convert to selected units
        const temp = units === 'metric' ? Math.round(tempC) : Math.round((tempC * 9) / 5 + 32);

        // Determine weather condition based on latitude zones
        let condition, description, icon, humidity;
        const absLat = Math.abs(lat);

        if (absLat > 60) {
            // Polar regions: Snow or overcast
            condition = seed % 2 === 0 ? 'Snow' : 'Clouds';
            description = condition === 'Snow' ? 'light snow' : 'overcast clouds';
            icon = condition === 'Snow' ? '13d' : '04d';
            humidity = condition === 'Snow' ? 85 : 75;
        } else if (absLat > 30) {
            // Temperate zones: Mix of conditions
            const mod = seed % 3;
            if (mod === 0) {
                condition = 'Rain';
                description = 'light rain';
                icon = '10d';
                humidity = 85;
            } else if (mod === 1) {
                condition = 'Clouds';
                description = 'scattered clouds';
                icon = '03d';
                humidity = 70;
            } else {
                condition = 'Clear';
                description = 'clear sky';
                icon = '01d';
                humidity = 50;
            }
        } else {
            // Tropical zones: Clear or rain
            condition = seed % 2 === 0 ? 'Clear' : 'Rain';
            description = condition === 'Clear' ? 'clear sky' : 'moderate rain';
            icon = condition === 'Clear' ? '01d' : '10d';
            humidity = condition === 'Rain' ? 80 : 60;
        }

        // Wind direction based on coordinates
        const windDeg = Math.round(seed * 360) % 360;

        // Timezone approximation (for sunrise/sunset calculations)
        const timezoneOffset = Math.round(lon / 15) * 3600;

        return {
            // Note: name/country will be overridden by WeatherApp
            name: 'Unknown Location',
            sys: {
                country: 'XX',
                sunrise: Math.floor(Date.now() / 1000) + timezoneOffset + 21600, // +6 hours
                sunset: Math.floor(Date.now() / 1000) + timezoneOffset + 64800, // +18 hours
            },
            main: {
                temp: temp,
                feels_like: temp - 1,
                temp_min: temp - 3,
                temp_max: temp + 3,
                pressure: 1015,
                humidity: humidity,
            },
            weather: [
                {
                    main: condition,
                    description: description,
                    icon: icon,
                },
            ],
            wind: {
                speed: units === 'metric' ? 3.6 : 8,
                deg: windDeg,
            },
            clouds: { all: condition === 'Clouds' ? 75 : condition === 'Rain' ? 90 : 10 },
            dt: Math.floor(Date.now() / 1000),
            timezone: timezoneOffset,
            coord: { lat: lat, lon: lon },
        };
    }
    /**
     * Generate mock forecast data for development
     * @private
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {string} units - Temperature units ('metric' or 'imperial')
     * @returns {Object} Mock forecast data
     */
    _getMockForecastData(lat, lon, units) {
        const daily = [];
        const baseTempC = 30 - Math.abs(lat) * 0.4;
        const seedBase = Math.abs(Math.sin(lat * lon) * 10000);

        for (let i = 0; i < 7; i++) {
            const seed = (seedBase + i * 100) % 1000;
            const tempVariation = (seed % 5) - 2;
            let tempC = baseTempC + tempVariation + i * 0.3;
            tempC = Math.max(-10, Math.min(40, tempC));

            const temp = units === 'metric' ? Math.round(tempC) : Math.round((tempC * 9) / 5 + 32);

            // Cycle through conditions
            const conditions = [
                { main: 'Clear', desc: 'clear sky', icon: '01d' },
                { main: 'Clouds', desc: 'few clouds', icon: '02d' },
                { main: 'Rain', desc: 'light rain', icon: '10d' },
            ];
            const condition = conditions[i % 3];

            daily.push({
                dt: Math.floor(Date.now() / 1000) + i * 86400,
                temp: {
                    day: temp,
                    min: temp - 5,
                    max: temp + 3,
                    night: temp - 3,
                    eve: temp + 1,
                    morn: temp - 4,
                },
                weather: [
                    {
                        main: condition.main,
                        description: condition.desc,
                        icon: condition.icon,
                    },
                ],
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

        return `${this.apiBase}/search?${params.toString()}`;
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
        if (!Array.isArray(results)) {
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
}
