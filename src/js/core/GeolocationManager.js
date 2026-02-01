/**
 * GeolocationManager Class
 * Handles browser geolocation API with proper permission handling
 * Implements fallback strategies and error handling
 *
 * @class GeolocationManager
 */
export class GeolocationManager {
    constructor() {
        this.isSupported = 'geolocation' in navigator;
        this.permissionState = null;
        this.watchId = null;
    }

    /**
     * Check if geolocation is supported
     * @returns {boolean} True if supported
     */
    isGeolocationSupported() {
        return this.isSupported;
    }

    /**
     * Get current position with permission handling
     * @param {Object} options - Geolocation options
     * @returns {Promise<GeolocationPosition>} Position object
     */
    async getCurrentPosition(options = {}) {
        if (!this.isSupported) {
            throw new Error('Geolocation is not supported in this browser');
        }

        // Default options with INCREASED timeout for reliability
        const geolocationOptions = {
            enableHighAccuracy: true,
            timeout: 15000, // ✅ Increased from 10s to 15s for better reliability
            maximumAge: 300000, // 5 minutes cache
            ...options,
        };

        try {
            // Check permission state if available
            if (navigator.permissions) {
                const permissionStatus = await navigator.permissions.query({
                    name: 'geolocation',
                });
                this.permissionState = permissionStatus.state;

                if (permissionStatus.state === 'denied') {
                    throw new Error(
                        'Geolocation permission denied. Please enable location access in browser settings.'
                    );
                }
            }

            // Get current position with custom timeout
            return await this._getCurrentPositionWithTimeout(geolocationOptions);
        } catch (error) {
            console.error('[GeolocationManager] Position error:', error);

            // ✅ Provide user-friendly error messages
            if (error.code === 1 || error.message.includes('denied')) {
                throw new Error('Location access denied. Please allow location permission.');
            } else if (error.code === 2 || error.message.includes('unavailable')) {
                throw new Error('Location information unavailable. Please check GPS settings.');
            } else if (error.code === 3 || error.message.includes('timeout')) {
                throw new Error('Location request timed out. Please try again or use search.');
            }

            throw error;
        }
    }

    /**
     * Get current position with custom timeout
     * @private
     * @param {Object} options - Geolocation options
     * @returns {Promise<GeolocationPosition>}
     */
    _getCurrentPositionWithTimeout(options) {
        return new Promise((resolve, reject) => {
            // Set timeout
            const timeoutId = setTimeout(() => {
                reject(new Error('Location request timed out after 10 seconds'));
            }, options.timeout || 10000);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeoutId);
                    resolve(position);
                },
                (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                },
                options
            );
        });
    }

    /**
     * Watch position for continuous updates
     * @param {Function} successCallback - Callback on position update
     * @param {Function} errorCallback - Callback on error
     * @param {Object} options - Geolocation options
     * @returns {number} Watch ID
     */
    watchPosition(successCallback, errorCallback, options = {}) {
        if (!this.isSupported) {
            throw new Error('Geolocation is not supported');
        }

        const geolocationOptions = {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 60000,
            ...options,
        };

        this.watchId = navigator.geolocation.watchPosition(successCallback, errorCallback, geolocationOptions);

        return this.watchId;
    }

    /**
     * Clear watch position
     */
    clearWatch() {
        if (this.watchId !== null && this.isSupported) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    /**
     * Request geolocation permission
     * @returns {Promise<string>} Permission state
     */
    async requestPermission() {
        if (!this.isSupported) {
            return 'unsupported';
        }

        if (!navigator.permissions) {
            // Try to get position to trigger permission dialog
            try {
                await this.getCurrentPosition({ maximumAge: 0 });
                return 'granted';
            } catch (error) {
                return 'denied';
            }
        }

        try {
            const permissionStatus = await navigator.permissions.query({
                name: 'geolocation',
            });

            this.permissionState = permissionStatus.state;

            // Listen for permission changes
            permissionStatus.onchange = () => {
                this.permissionState = permissionStatus.state;
            };

            return permissionStatus.state;
        } catch (error) {
            console.error('[GeolocationManager] Error requesting permission:', error);
            return 'prompt';
        }
    }

    /**
     * Get current permission state
     * @returns {string|null} Permission state or null
     */
    getPermissionState() {
        return this.permissionState;
    }

    /**
     * Get user's approximate location using IP geolocation as fallback
     * @returns {Promise<Object|null>} Location object or null
     */
    async getFallbackLocation() {
        try {
            // Use a free IP geolocation service as fallback
            const response = await fetch('https://ipapi.co/json/', {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to get location from IP');
            }

            const data = await response.json();

            return {
                lat: data.latitude,
                lon: data.longitude,
                city: data.city,
                region: data.region,
                country: data.country_name,
                source: 'ip',
            };
        } catch (error) {
            console.error('[GeolocationManager] Fallback location failed:', error);
            return null;
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.clearWatch();
        this.permissionState = null;
    }
}
