/**
 * Main Application Entry Point
 * Initializes the WeatherApp with dependency injection
 * Handles application lifecycle and error boundaries
 */

// Import main CSS file - this will load all styles
// import '../css/main.css';

// Import core application class
import { WeatherApp } from './core/WeatherApp.js';

// Application configuration
const APP_CONFIG = {
    // API base URL - should be configured based on deployment environment
    // For local development with Netlify Dev: '/.netlify/functions/weather'
    // For production: '/api/weather'
    apiBase: '/api/weather',

    // Default units (metric = Celsius, imperial = Fahrenheit)
    defaultUnits: 'metric',

    // Default location to Tehran, Iran
    defaultLocation: {
        lat: 35.6892, // Tehran coordinates
        lon: 51.389,
        name: 'Tehran', // Added name for immediate display
        country: 'IR',
    },

    // Enable debug mode in development
    debug: true,
};

// Global error handler
window.addEventListener('error', (event) => {
    console.error('[Global Error]', event.error);

    // Show user-friendly error message
    if (event.error && !event.error.message?.includes('Script error')) {
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            const toast = document.createElement('div');
            toast.className = 'toast toast-error';
            toast.setAttribute('role', 'alert');
            toast.innerHTML = `
                <div class="toast-content">
                    <strong>Error:</strong> Something went wrong. Please try again.
                </div>
            `;
            toastContainer.appendChild(toast);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                toast.remove();
            }, 5000);
        }
    }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]', event.reason);
    event.preventDefault();
});

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Main] Initializing WeatherFlow application...');

    try {
        // Create and initialize WeatherApp instance
        window.weatherApp = new WeatherApp(APP_CONFIG);

        console.log('[Main] WeatherFlow application initialized successfully');

        // Expose app instance to window for debugging purposes (development only)
        if (APP_CONFIG.debug) {
            window.app = window.weatherApp;
            console.log('[Main] App instance exposed to window.app for debugging');
        }
    } catch (error) {
        console.error('[Main] Failed to initialize application:', error);

        // Show critical error to user
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.innerHTML = `
                <div class="critical-error">
                    <h1>Application Error</h1>
                    <p>Failed to start the weather application.</p>
                    <p>Please refresh the page or try again later.</p>
                    <button onclick="location.reload()" class="btn btn-primary">
                        Refresh Page
                    </button>
                </div>
            `;
        }
    }
});

// Handle beforeunload to cleanup resources
window.addEventListener('beforeunload', () => {
    if (window.weatherApp && typeof window.weatherApp.destroy === 'function') {
        window.weatherApp.destroy();
    }
});

// Service Worker update notification
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Notify user about new version
        if (confirm('New version available! Reload to update?')) {
            window.location.reload();
        }
    });
}

console.log('[Main] WeatherFlow application loaded');
