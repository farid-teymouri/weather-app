/**
 * Constants Module
 * Application-wide constants and configuration
 */

// API Configuration
export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api/weather',
    TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000, // 2 seconds
};

// Weather Icons Mapping
export const WEATHER_ICONS = {
    '01d': 'clear-day',
    '01n': 'clear-night',
    '02d': 'partly-cloudy-day',
    '02n': 'partly-cloudy-night',
    '03d': 'cloudy',
    '03n': 'cloudy',
    '04d': 'cloudy',
    '04n': 'cloudy',
    '09d': 'rain',
    '09n': 'rain',
    '10d': 'rain',
    '10n': 'rain',
    '11d': 'thunderstorm',
    '11n': 'thunderstorm',
    '13d': 'snow',
    '13n': 'snow',
    '50d': 'mist',
    '50n': 'mist',
};

// Weather Conditions Mapping
export const WEATHER_CONDITIONS = {
    Clear: { icon: 'sun', color: '#f6ad55', description: 'Clear sky' },
    Clouds: { icon: 'cloud', color: '#a0aec0', description: 'Cloudy' },
    Rain: { icon: 'rain', color: '#4299e1', description: 'Rainy' },
    Drizzle: { icon: 'rain', color: '#63b3ed', description: 'Drizzle' },
    Thunderstorm: {
        icon: 'thunderstorm',
        color: '#dd6b20',
        description: 'Thunderstorm',
    },
    Snow: { icon: 'snow', color: '#718096', description: 'Snow' },
    Mist: { icon: 'mist', color: '#cbd5e0', description: 'Mist' },
    Smoke: { icon: 'smoke', color: '#a0aec0', description: 'Smoke' },
    Haze: { icon: 'haze', color: '#a0aec0', description: 'Haze' },
    Dust: { icon: 'dust', color: '#dd6b20', description: 'Dust' },
    Fog: { icon: 'fog', color: '#cbd5e0', description: 'Fog' },
    Sand: { icon: 'sand', color: '#dd6b20', description: 'Sand' },
    Ash: { icon: 'ash', color: '#718096', description: 'Ash' },
    Squall: { icon: 'squall', color: '#4299e1', description: 'Squall' },
    Tornado: { icon: 'tornado', color: '#dd6b20', description: 'Tornado' },
};

// Temperature Units
export const TEMPERATURE_UNITS = {
    METRIC: {
        label: 'Celsius',
        symbol: '°C',
        conversion: {
            toFahrenheit: (c) => (c * 9) / 5 + 32,
            toCelsius: (c) => c,
        },
    },
    IMPERIAL: {
        label: 'Fahrenheit',
        symbol: '°F',
        conversion: {
            toFahrenheit: (f) => f,
            toCelsius: (f) => ((f - 32) * 5) / 9,
        },
    },
};

// Default Location (San Francisco)
export const DEFAULT_LOCATION = {
    lat: 37.7749,
    lon: -122.4194,
    name: 'San Francisco',
    country: 'US',
    state: 'CA',
};

// LocalStorage Keys
export const STORAGE_KEYS = {
    FAVORITES: 'weather_app_favorites',
    UNITS: 'weather_app_units',
    THEME: 'weather_app_theme',
    LAST_LOCATION: 'weather_app_last_location',
    CACHE_TIMESTAMP: 'weather_app_cache_timestamp',
};

// App Configuration
export const APP_CONFIG = {
    NAME: 'WeatherFlow',
    VERSION: '1.0.0',
    AUTHOR: 'Farid Teymouri',
    DEBUG: import.meta.env.DEV || false,
    MAX_FAVORITES: 50,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    WEATHER_UPDATE_INTERVAL: 30 * 60 * 1000, // 30 minutes
};

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
    TOGGLE_THEME: ['Meta', 'd'],
    TOGGLE_UNITS: ['Meta', 't'],
    FOCUS_SEARCH: ['Meta', 'l'],
    TOGGLE_FAVORITES: ['Meta', 'f'],
    ADD_FAVORITE: ['Meta', 'd'],
    REFRESH: ['Meta', 'r'],
};

// Accessibility
export const ARIA_ROLES = {
    ALERT: 'alert',
    BUTTON: 'button',
    COMBOBOX: 'combobox',
    LISTBOX: 'listbox',
    OPTION: 'option',
    STATUS: 'status',
    TAB: 'tab',
    TABLIST: 'tablist',
    TABPANEL: 'tabpanel',
};

// Error Messages
export const ERROR_MESSAGES = {
    GEOLOCATION_DENIED: 'Please allow location access to get weather for your area',
    GEOLOCATION_UNAVAILABLE: 'Location information unavailable',
    GEOLOCATION_TIMEOUT: 'Location request timed out',
    NETWORK_ERROR: 'Network error. Please check your connection',
    API_ERROR: 'Failed to fetch weather data. Please try again later',
    INVALID_LOCATION: 'Invalid location coordinates',
    SEARCH_FAILED: 'Failed to search locations',
    FAVORITE_LIMIT: 'Maximum number of favorites reached',
    STORAGE_FULL: 'Storage is full. Cannot save more data',
};

// Animation Durations
export const ANIMATION_DURATIONS = {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
    LOADING: 1000,
};

// Breakpoints
export const BREAKPOINTS = {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    XXL: 1536,
};

// Color Palette
export const COLORS = {
    PRIMARY: '#4c6fff',
    PRIMARY_DARK: '#3a5ce5',
    PRIMARY_LIGHT: '#6d8bff',
    SECONDARY: '#8c52ff',
    SUCCESS: '#38a169',
    WARNING: '#dd6b20',
    ERROR: '#e53e3e',
    INFO: '#4299e1',
};

// HTTP Status Codes
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
};

// Request Headers
export const REQUEST_HEADERS = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
};

// Cache Strategies
export const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
    NETWORK_ONLY: 'network-only',
    CACHE_ONLY: 'cache-only',
};

// Feature Flags
export const FEATURE_FLAGS = {
    ENABLE_GEOLOCATION: true,
    ENABLE_FAVORITES: true,
    ENABLE_DARK_MODE: true,
    ENABLE_PWA: true,
    ENABLE_OFFLINE: true,
    ENABLE_ANIMATIONS: true,
};
