/**
 * WeatherRenderer Class
 * Handles rendering of weather data to the DOM
 * Uses virtual DOM-inspired approach for efficient updates
 *
 * @class WeatherRenderer
 */
import { formatTemperature, formatWindSpeed, getWeatherIcon } from '../utils/helpers.js';
import { a11yAnnounce } from '../utils/a11y.js';

export class WeatherRenderer {
    constructor() {
        this.elements = {
            currentWeather: document.getElementById('current-weather'),
            forecastContainer: document.querySelector('.forecast-container'),
            favoritesList: document.getElementById('favorites-list'),
            temperatureUnit: document.querySelector('.temperature-unit'),
            unitDisplay: document.querySelector('.unit-display'),
        };

        // Bind methods for event handlers
        this._handleRetryClick = this._handleRetryClick.bind(this);
    }

    /**
     * Render current weather data
     * @param {Object} weatherData - Weather data object
     * @param {string} units - Temperature units
     */
    renderCurrentWeather(weatherData, units) {
        if (!this.elements.currentWeather) return;

        try {
            // Get weather card
            const weatherCard = this.elements.currentWeather.querySelector('.weather-card');
            if (!weatherCard) {
                console.warn('[WeatherRenderer] Weather card element not found');
                return;
            }

            // Location info
            const locationName = weatherCard.querySelector('.location-name');
            const locationDetails = weatherCard.querySelector('.location-details');

            if (locationName) {
                locationName.textContent = weatherData.name || 'Unknown Location';
                locationName.classList.remove('skeleton');
            }

            if (locationDetails && weatherData.weather?.[0]) {
                const weather = weatherData.weather[0];
                const date = new Date();
                const timeString = date.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                });

                locationDetails.textContent = `${this._capitalizeFirstLetter(weather.description)} • ${timeString}`;
                locationDetails.classList.remove('skeleton');
            }

            // Temperature
            const tempValue = weatherCard.querySelector('.temperature-value');
            const tempUnit = weatherCard.querySelector('.temperature-unit');

            if (tempValue && weatherData.main?.temp !== undefined) {
                const temp = formatTemperature(weatherData.main.temp, units);
                tempValue.textContent = temp;
                tempValue.classList.remove('skeleton');
            }

            if (tempUnit) {
                tempUnit.textContent = units === 'metric' ? '°C' : '°F';
            }

            // Weather icon
            const weatherIconContainer = weatherCard.querySelector('.weather-icon-container');
            const weatherCondition = weatherCard.querySelector('.weather-condition');

            if (weatherIconContainer && weatherData.weather?.[0]) {
                const iconSvg = getWeatherIcon(weatherData.weather[0].main);
                // Replace entire container content to avoid outerHTML issues
                weatherIconContainer.innerHTML = `
          <div class="weather-icon-wrapper">
            ${iconSvg}
          </div>
          ${weatherCondition ? `<p class="weather-condition">${this._capitalizeFirstLetter(weatherData.weather[0].description)}</p>` : ''}
        `;

                // Remove skeleton from container
                weatherIconContainer.classList.remove('skeleton');
            }

            // Weather details
            this._renderWeatherDetails(weatherCard, weatherData, units);

            // Announce update to screen readers
            const cityName = weatherData.name || 'Unknown location';
            const temp = weatherData.main?.temp !== undefined ? `${weatherData.main.temp}` : 'unknown';
            a11yAnnounce(`Weather updated for ${cityName}. Temperature is ${temp} degrees.`);
        } catch (error) {
            console.error('[WeatherRenderer] Error rendering current weather:', error);
            this.showError('Failed to display weather data. Please try again.');
        }
    }

    /**
     * Render weather details (feels like, humidity, wind, pressure)
     * Includes defensive checks to prevent "--" display on missing data
     * @private
     * @param {HTMLElement} weatherCard - Weather card element
     * @param {Object} weatherData - Weather data with complete fields
     * @param {string} units - Temperature units
     */
    _renderWeatherDetails(weatherCard, weatherData, units) {
        const detailItems = weatherCard.querySelectorAll('.detail-item');

        // Defensive check: ensure weatherData.main exists
        if (!weatherData || !weatherData.main) {
            console.warn('[WeatherRenderer] Missing weatherData.main, using fallback values');
            detailItems.forEach((item) => {
                const valueEl = item.querySelector('.detail-value');
                if (valueEl) valueEl.textContent = '--';
            });
            return;
        }

        detailItems.forEach((item, index) => {
            const valueElement = item.querySelector('.detail-value');
            if (!valueElement) return;

            let value = '--';

            try {
                switch (index) {
                    case 0: // Feels like
                        if (typeof weatherData.main.feels_like === 'number') {
                            value = `${formatTemperature(weatherData.main.feels_like, units)}°`;
                        }
                        break;
                    case 1: // Humidity
                        if (typeof weatherData.main.humidity === 'number') {
                            value = `${weatherData.main.humidity}%`;
                        }
                        break;
                    case 2: // Wind
                        if (weatherData.wind?.speed !== undefined) {
                            const windSpeed = formatWindSpeed(weatherData.wind.speed, units);
                            const windDirection = this._getWindDirection(weatherData.wind.deg);
                            value = windDirection ? `${windSpeed} ${windDirection}` : windSpeed;
                        }
                        break;
                    case 3: // Pressure
                        if (typeof weatherData.main.pressure === 'number') {
                            value = `${weatherData.main.pressure} hPa`;
                        }
                        break;
                }
            } catch (error) {
                console.error(`[WeatherRenderer] Error rendering detail ${index}:`, error);
                value = '--';
            }

            valueElement.textContent = value;
            valueElement.classList.remove('skeleton');

            // Add ARIA label for screen readers
            valueElement.setAttribute(
                'aria-label',
                `${item.querySelector('.detail-label')?.textContent || 'Value'}: ${value}`
            );
        });
    }

    /**
     * Get wind direction abbreviation
     * @private
     * @param {number} degrees - Wind direction in degrees
     * @returns {string} Direction abbreviation
     */
    _getWindDirection(degrees) {
        if (degrees === undefined || degrees === null) return '';

        const directions = [
            'N',
            'NNE',
            'NE',
            'ENE',
            'E',
            'ESE',
            'SE',
            'SSE',
            'S',
            'SSW',
            'SW',
            'WSW',
            'W',
            'WNW',
            'NW',
            'NNW',
        ];

        // Ensure degrees is within valid range
        const normalizedDegrees = ((degrees % 360) + 360) % 360;
        return directions[Math.round(normalizedDegrees / 22.5) % 16];
    }

    /**
     * Render forecast data
     * @param {Object} forecastData - Forecast data object
     * @param {string} units - Temperature units
     */
    renderForecast(forecastData, units) {
        if (!this.elements.forecastContainer) {
            console.warn('[WeatherRenderer] Forecast container not found');
            return;
        }

        try {
            // Clear existing forecast items
            this.elements.forecastContainer.innerHTML = '';

            // Render forecast items
            if (forecastData?.daily && Array.isArray(forecastData.daily)) {
                const forecastDays = forecastData.daily.slice(0, 7);

                if (forecastDays.length === 0) {
                    this.elements.forecastContainer.innerHTML = `
            <div class="forecast-empty" role="alert">
              <p>No forecast data available</p>
            </div>
          `;
                    return;
                }

                forecastDays.forEach((day, index) => {
                    const forecastItem = this._createForecastItem(day, index, units);
                    this.elements.forecastContainer.appendChild(forecastItem);
                });
            } else {
                console.warn('[WeatherRenderer] No valid forecast data provided');
                this.elements.forecastContainer.innerHTML = `
          <div class="forecast-empty" role="alert">
            <p>Forecast data unavailable</p>
          </div>
        `;
            }
        } catch (error) {
            console.error('[WeatherRenderer] Error rendering forecast:', error);
            this.elements.forecastContainer.innerHTML = `
        <div class="forecast-error" role="alert">
          <p>Failed to load forecast</p>
        </div>
      `;
        }
    }

    /**
     * Create a forecast item element
     * @private
     * @param {Object} day - Daily forecast data
     * @param {number} index - Day index
     * @param {string} units - Temperature units
     * @returns {HTMLElement} Forecast item element
     */
    _createForecastItem(day, index, units) {
        const item = document.createElement('div');
        item.setAttribute('role', 'listitem');
        item.className = 'forecast-item';
        item.setAttribute('aria-label', `Forecast for ${index === 0 ? 'today' : 'tomorrow'}`);

        try {
            const date = new Date((day.dt || 0) * 1000);
            const dayName = index === 0 ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' });

            const tempMin = formatTemperature(day.temp?.min, units);
            const tempMax = formatTemperature(day.temp?.max, units);
            const weather = day.weather?.[0];

            item.innerHTML = `
        <div class="forecast-day" aria-label="${dayName}">${dayName}</div>
        <div class="forecast-icon" aria-hidden="true">
          ${weather ? getWeatherIcon(weather.main) : '<div class="icon-placeholder"></div>'}
        </div>
        <div class="forecast-temp">
          <span class="temp-max" aria-label="High temperature">${tempMax}°</span>
          <span class="temp-min" aria-label="Low temperature">${tempMin}°</span>
        </div>
      `;
        } catch (error) {
            console.error('[WeatherRenderer] Error creating forecast item:', error);
            item.innerHTML = `
        <div class="forecast-day">Day ${index + 1}</div>
        <div class="forecast-icon">
          <div class="icon-placeholder"></div>
        </div>
        <div class="forecast-temp">
          <span class="temp-max">--°</span>
          <span class="temp-min">--°</span>
        </div>
      `;
        }

        return item;
    }

    /**
     * Render favorites list with safety checks
     * Handles empty states and invalid data gracefully
     * @param {Array} favorites - Array of favorite locations
     */
    renderFavorites(favorites) {
        if (!this.elements.favoritesList) return;

        try {
            // Ensure we always work with an array
            const favoritesArray = Array.isArray(favorites) ? favorites : [];

            // Clear existing favorites
            this.elements.favoritesList.innerHTML = '';

            // Handle empty state
            if (favoritesArray.length === 0) {
                this.elements.favoritesList.innerHTML = `
                <p class="favorites-empty" role="status">
                    No favorites yet. Search for a location and press Ctrl+D to add it!
                </p>
            `;
                return;
            }

            // Create favorite items
            favoritesArray.forEach((favorite, index) => {
                const favoriteItem = this._createFavoriteItem(favorite, index);
                this.elements.favoritesList.appendChild(favoriteItem);
            });

            // Announce update to screen readers
            if (favoritesArray.length > 0) {
                a11yAnnounce(`${favoritesArray.length} favorite locations loaded`);
            }
        } catch (error) {
            console.error('[WeatherRenderer] Error rendering favorites:', error);
            this.elements.favoritesList.innerHTML = `
            <p class="favorites-error" role="alert">
                Failed to load favorites
            </p>
        `;
        }
    }

    /**
     * Create a favorite item element
     * @private
     * @param {Object} favorite - Favorite location
     * @param {number} index - Item index
     * @returns {HTMLElement} Favorite item element
     */
    _createFavoriteItem(favorite, index) {
        const item = document.createElement('div');
        item.className = 'favorite-item';
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-label', `View weather for ${favorite.name}`);
        item.setAttribute('data-index', index);

        // Add keyboard support
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });

        const locationText = favorite.state
            ? `${favorite.name}, ${favorite.state}, ${favorite.country}`
            : `${favorite.name}, ${favorite.country}`;

        item.innerHTML = `
      <div class="favorite-item-content">
        <svg class="favorite-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2" 
                stroke-linecap="round" 
                stroke-linejoin="round" />
        </svg>
        <span class="favorite-location">${this._escapeHtml(locationText)}</span>
      </div>
      <button class="favorite-remove" type="button" aria-label="Remove ${favorite.name} from favorites">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2" 
                stroke-linecap="round"/>
        </svg>
      </button>
    `;

        return item;
    }

    /**
     * Update temperature units display with SVG icons
     * @param {string} units - New temperature units ('metric' or 'imperial')
     */
    updateUnits(units) {
        // Update temperature unit in weather card (small display next to temp)
        if (this.elements.temperatureUnit) {
            this.elements.temperatureUnit.textContent = units === 'metric' ? '°C' : '°F';
        }

        // ✅ CRITICAL FIX: Update unit toggle button with SVG icons
        const unitToggle = document.getElementById('unit-toggle');
        if (!unitToggle) return;

        const display = unitToggle.querySelector('.unit-display');
        if (!display) return;

        // Set appropriate SVG icon based on units
        if (units === 'metric') {
            // Celsius icon (blue/cool tones)
            display.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 30 30" aria-label="Celsius" aria-hidden="false">
                <path fill="currentColor" d="M9.75 10.98c0-.5.18-.93.53-1.28c.36-.36.78-.53 1.28-.53c.49 0 .92.18 1.27.53c.35.36.53.78.53 1.28s-.18.93-.53 1.28c-.35.36-.78.53-1.27.53c-.5 0-.93-.18-1.28-.53s-.53-.78-.53-1.28m.88 0c0 .26.09.48.27.67c.19.19.41.28.67.28s.48-.09.67-.28s.28-.41.28-.67s-.09-.48-.28-.67s-.41-.28-.67-.28s-.48.09-.67.28a.92.92 0 0 0-.27.67m3.89 4.42c0 .77.21 1.45.64 2.05q.33.465.93.75c.39.18.84.28 1.34.28c1.46 0 2.38-.56 2.75-1.67c.04-.14.02-.28-.06-.41a.5.5 0 0 0-.33-.23a.44.44 0 0 0-.4.07c-.12.08-.2.19-.23.34c0 .01 0 .02-.01.05l-.02.07q-.165.285-.45.45c-.31.19-.72.28-1.23.28c-.31 0-.59-.05-.83-.16c-.4-.17-.68-.47-.85-.89c-.11-.27-.17-.6-.17-.97v-3.22q0-.225.03-.45c.04-.38.19-.73.45-1.04c.29-.35.75-.52 1.38-.52q.78 0 1.23.27q.3.18.45.45c.01.02.01.05.02.08s.01.05.01.06c.04.14.12.24.23.3c.12.07.25.08.4.05c.14-.03.25-.11.33-.23s.1-.25.06-.4v-.01l-.08-.23c-.05-.11-.14-.26-.28-.43c-.13-.18-.29-.32-.45-.44c-.21-.15-.48-.27-.82-.38q-.51-.15-1.11-.15c-.51 0-.95.09-1.35.27c-.39.18-.7.42-.91.73c-.43.59-.65 1.28-.65 2.07v3.21z"/>
            </svg>
            <span class="sr-only">Celsius</span>
        `;
            unitToggle.setAttribute('aria-label', 'Switch to Fahrenheit');
        } else {
            // Fahrenheit icon (orange/warm tones)
            display.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 30 30" aria-label="Fahrenheit" aria-hidden="false">
                <path fill="currentColor" d="M9.67 11.01c0-.5.18-.93.53-1.28s.78-.53 1.28-.53c.49 0 .92.18 1.27.53c.35.36.53.78.53 1.28s-.18.93-.53 1.29s-.78.54-1.27.54s-.92-.18-1.28-.54a1.8 1.8 0 0 1-.53-1.29m.88 0c0 .26.09.48.27.67c.19.19.41.28.67.28s.48-.09.67-.28s.28-.41.28-.67a.87.87 0 0 0-.28-.66a.95.95 0 0 0-.67-.28c-.26 0-.48.09-.67.27c-.18.18-.27.4-.27.67m4.41 6.89a.514.514 0 0 0 .52.52a.514.514 0 0 0 .52-.52v-3.79h2.86c.14 0 .27-.05.37-.16s.15-.23.15-.38s-.05-.27-.15-.38a.52.52 0 0 0-.38-.15h-2.86v-2.73h3.82q.21 0 .36-.15c.15-.15.14-.23.14-.38s-.05-.27-.14-.38s-.21-.15-.36-.15h-4.77c-.07 0-.1.04-.1.11v8.54z"/>
            </svg>
            <span class="sr-only">Fahrenheit</span>
        `;
            unitToggle.setAttribute('aria-label', 'Switch to Celsius');
        }

        // Announce change to screen readers
        a11yAnnounce(`Temperature units changed to ${units === 'metric' ? 'Celsius' : 'Fahrenheit'}`);
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        console.error('[WeatherRenderer] Error:', message);

        if (this.elements.currentWeather) {
            this.elements.currentWeather.innerHTML = `
        <div class="error-message" role="alert">
          <svg class="error-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
          </svg>
          <p>${this._escapeHtml(message)}</p>
          <button class="btn btn-primary" id="retry-btn" type="button">Try Again</button>
        </div>
      `;

            // Add event listener to retry button
            const retryBtn = this.elements.currentWeather.querySelector('#retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', this._handleRetryClick);
            }
        }
    }

    /**
     * Handle retry button click
     * @private
     */
    _handleRetryClick() {
        // Dispatch custom event for parent to handle
        const event = new CustomEvent('weather:retry', {
            bubbles: true,
            cancelable: true,
        });

        if (this.elements.currentWeather) {
            this.elements.currentWeather.dispatchEvent(event);
        }
    }

    /**
     * Clear all rendered content
     */
    clear() {
        try {
            if (this.elements.currentWeather) {
                const weatherCard = this.elements.currentWeather.querySelector('.weather-card');
                if (weatherCard) {
                    weatherCard.innerHTML = `
            <div class="location-info">
              <h3 class="location-name skeleton">Loading...</h3>
              <p class="location-details skeleton">Loading weather details...</p>
            </div>
            <div class="temperature-display">
              <span class="temperature-value skeleton">--</span>
              <span class="temperature-unit">°C</span>
            </div>
            <div class="weather-icon-container skeleton">
              <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="4"/>
              </svg>
            </div>
            <div class="weather-details">
              <div class="detail-item">
                <span class="detail-label">Feels Like:</span>
                <span class="detail-value skeleton">--°</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Humidity:</span>
                <span class="detail-value skeleton">--%</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Wind:</span>
                <span class="detail-value skeleton">-- m/s</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Pressure:</span>
                <span class="detail-value skeleton">-- hPa</span>
              </div>
            </div>
          `;
                }
            }

            if (this.elements.forecastContainer) {
                this.elements.forecastContainer.innerHTML = `
          ${Array(3)
              .fill()
              .map(
                  () => `
            <div class="forecast-skeleton" role="listitem">
              <div class="forecast-day skeleton">Loading...</div>
              <div class="forecast-icon skeleton"></div>
              <div class="forecast-temp skeleton">--° / --°</div>
            </div>
          `
              )
              .join('')}
        `;
            }

            console.log('[WeatherRenderer] Content cleared and reset to loading state');
        } catch (error) {
            console.error('[WeatherRenderer] Error clearing content:', error);
        }
    }

    /**
     * Capitalize first letter of a string
     * @private
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    _capitalizeFirstLetter(str) {
        if (typeof str !== 'string' || str.length === 0) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Escape HTML special characters
     * @private
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    _escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Cleanup event listeners
     */
    destroy() {
        // Remove retry button event listener if exists
        const retryBtn = this.elements.currentWeather?.querySelector('#retry-btn');
        if (retryBtn) {
            retryBtn.removeEventListener('click', this._handleRetryClick);
        }

        // Clear references
        this.elements = null;
    }
}
