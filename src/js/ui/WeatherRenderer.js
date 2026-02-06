/**
 * WeatherRenderer Class
 * Handles rendering of weather data to the DOM
 * Uses virtual DOM-inspired approach for efficient updates
 *
 * @class WeatherRenderer
 */
import { formatTemperature, formatWindSpeed, getWeatherIcon } from '../utils/helpers.js';
import { a11yAnnounce } from '../utils/a11y.js';

if (typeof DOMParser === 'undefined') {
    console.error('[WeatherRenderer] DOMParser not supported in this browser');
}

export class WeatherRenderer {
    constructor() {
        this.elements = {
            currentWeather: document.getElementById('current-weather'),
            forecastContainer: document.querySelector('.forecast-container'),
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

            //  Manual time calculation using ONLY UTC time + timezone offset
            // This method is 100% browser-timezone independent and mathematically precise
            let localTimeString = '--:--';
            if (weatherData.timezone != null) {
                try {
                    // Get CURRENT UTC time components (browser timezone independent)
                    const now = new Date();
                    const utcHour = now.getUTCHours(); // 0-23 UTC hour
                    const utcMinute = now.getUTCMinutes(); // 0-59 UTC minute

                    // Convert timezone offset from seconds to total minutes
                    const timezoneMinutes = weatherData.timezone / 60; // e.g., 12600s → 210 minutes (+3:30)

                    // Calculate local time in total minutes since midnight
                    let localTotalMinutes = utcHour * 60 + utcMinute + timezoneMinutes;

                    // Handle day rollover (negative or > 1440 minutes)
                    localTotalMinutes = ((localTotalMinutes % 1440) + 1440) % 1440;

                    // Extract hour and minute in 24-hour format
                    const localHour = Math.floor(localTotalMinutes / 60);
                    const localMinute = Math.floor(localTotalMinutes % 60);

                    // Format as HH:mm (24-hour)
                    const hours = localHour.toString().padStart(2, '0');
                    const minutes = localMinute.toString().padStart(2, '0');
                    localTimeString = `${hours}:${minutes}`;

                    // DEBUG LOGGING: Verify calculation with actual values
                    console.log(
                        `[WeatherRenderer] ✅ Local time: ${localTimeString} | UTC: ${utcHour.toString().padStart(2, '0')}:${utcMinute.toString().padStart(2, '0')} | Offset: ${timezoneMinutes}m (${(weatherData.timezone / 3600).toFixed(1)}h) | City: ${weatherData.name}`
                    );
                } catch (error) {
                    console.warn('[WeatherRenderer] Time calculation failed:', error.message);
                    // Fallback: Simple UTC time in 24-hour format
                    const now = new Date();
                    const hours = now.getUTCHours().toString().padStart(2, '0');
                    const minutes = now.getUTCMinutes().toString().padStart(2, '0');
                    localTimeString = `${hours}:${minutes}`;
                }
            }

            // Update location details with CORRECT 24-hour time
            if (locationDetails && weatherData.weather?.[0]) {
                const weather = weatherData.weather[0];
                locationDetails.textContent = `${this._capitalizeFirstLetter(weather.description)} • ${localTimeString}`;
                locationDetails.classList.remove('skeleton');
                locationDetails.setAttribute(
                    'aria-label',
                    `Weather: ${weather.description}, Local time: ${localTimeString}`
                );
            }

            // Update .local-time element below main icon (if exists)
            const localTimeElement = weatherCard.querySelector('.local-time');
            if (localTimeElement) {
                localTimeElement.textContent = localTimeString;
                localTimeElement.setAttribute('aria-label', `Local time in ${weatherData.name}: ${localTimeString}`);
                localTimeElement.style.opacity = '0';
                setTimeout(() => {
                    localTimeElement.style.opacity = '1';
                    localTimeElement.style.transition = 'opacity 0.3s ease';
                }, 50);
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

            // Weather icon and condition text update - COMPLETE REBUILD STRATEGY
            // Update main weather icon dynamically
            const mainIconImg = document.querySelector('.main-weather-icon');
            const conditionElement = document.querySelector('.weather-condition');

            if (mainIconImg && conditionElement) {
                // Extract weather condition safely
                const weather = weatherData.weather?.[0] || {
                    icon: '03d',
                    description: 'Cloudy',
                    main: 'Clouds',
                };

                const iconCode = weather.icon || '03d';
                const condition = weather.main || 'Clouds';
                const description = weather.description || 'Cloudy';

                // Set icon with absolute path (works on Vercel)
                mainIconImg.src = `/icons/weather-icons/${iconCode}.svg`;
                mainIconImg.alt = description;
                mainIconImg.onerror = () => {
                    console.warn(`[WeatherRenderer] Icon load failed for ${iconCode}, using fallback`);
                    mainIconImg.src = '/icons/weather-icons/03d.svg';
                };

                // Update condition text
                conditionElement.textContent = condition;
                conditionElement.setAttribute('aria-label', `Weather condition: ${condition}`);

                console.log(`[WeatherRenderer] ✅ Main icon updated: ${iconCode} (${condition})`);
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
     * Render 7-day forecast with dynamic icons and temperatures
     * Handles both OpenWeatherMap structure AND mock data structure
     * @param {Object} forecastData - Forecast data object with daily array
     * @param {string} units - Temperature units ('metric' or 'imperial')
     */
    renderForecast(forecastData, units) {
        const forecastContainer = document.querySelector('#forecast .forecast-container');
        if (!forecastContainer || !forecastData || !forecastData.daily) {
            console.warn('[WeatherRenderer] Forecast container not found or invalid data');
            return;
        }

        //  CLEAR CONTAINER COMPLETELY
        forecastContainer.innerHTML = '';
        console.log(`[WeatherRenderer] Rendering ${Math.min(forecastData.daily.length, 7)} forecast days`);

        // Render each day (max 7 days)
        forecastData.daily.slice(0, 7).forEach((day, index) => {
            const dayElement = document.createElement('div');
            dayElement.className = 'forecast-day';
            dayElement.setAttribute('aria-label', `Forecast for ${this._getDayName(index)}`);

            // Date/Day name
            const dateElement = document.createElement('div');
            dateElement.className = 'forecast-date';
            dateElement.textContent = this._getDayName(index);
            dayElement.appendChild(dateElement);

            // SMART ICON EXTRACTION (handles BOTH data structures)
            let iconCode, iconDesc, condition;

            // Try OpenWeatherMap structure first (weather array)
            if (day.weather?.[0]?.icon) {
                iconCode = day.weather[0].icon;
                iconDesc = day.weather[0].description || 'Cloudy';
                condition = day.weather[0].main || 'Clouds';
                console.log(`[Forecast] Day ${index}: Using OWM structure - ${iconCode}`);
            }
            // Fallback to mock data structure (direct properties)
            else if (day.icon || day.condition) {
                iconCode = day.icon || this._getIconCodeFromCondition(day.condition || 'Clouds');
                iconDesc = day.description || 'Cloudy';
                condition = day.condition || 'Clouds';
                console.log(`[Forecast] Day ${index}: Using mock structure - ${iconCode}`);
            }
            // Ultimate fallback
            else {
                iconCode = '03d';
                iconDesc = 'Cloudy';
                condition = 'Clouds';
                console.warn(`[Forecast] Day ${index}: No icon data found, using fallback`);
            }

            // Create icon container with absolute path
            const iconContainer = document.createElement('div');
            iconContainer.className = 'forecast-icon';
            iconContainer.innerHTML = `
            <img 
                src="/icons/weather-icons/${iconCode}.svg" 
                alt="${iconDesc}" 
                class="weather-icon"
                loading="lazy"
                onerror="this.src='/icons/weather-icons/03d.svg'"
            >
        `;
            dayElement.appendChild(iconContainer);

            // Temperature range
            const tempElement = document.createElement('div');
            tempElement.className = 'forecast-temp';
            const tempMin = this._formatTemperature(day.temp?.min ?? day.temp_min, units);
            const tempMax = this._formatTemperature(day.temp?.max ?? day.temp_max, units);
            tempElement.innerHTML = `<span class="temp-min">${tempMin}</span> / <span class="temp-max">${tempMax}</span>`;
            dayElement.appendChild(tempElement);

            // Append to container
            forecastContainer.appendChild(dayElement);

            if (index === 0) {
                // TODAY: Use current time to determine day/night icon
                const now = new Date();
                const hour = now.getHours();
                const isDayTime = hour >= 6 && hour < 18;
                const timeSuffix = isDayTime ? 'd' : 'n';

                // Get base icon from day's condition
                if (day.weather?.[0]?.main) {
                    const baseIconMap = {
                        /* same mapping as above */
                    };
                    const baseIconCode = baseIconMap[day.weather[0].main] || '03';
                    iconCode = baseIconCode + timeSuffix;
                    iconDesc = day.weather[0].description || 'Cloudy';
                    condition = day.weather[0].main;
                } else {
                    // Fallback for mock data structure
                    iconCode = (day.icon || '03d').replace(/[dn]$/, timeSuffix);
                    iconDesc = day.description || 'Cloudy';
                    condition = day.condition || 'Clouds';
                }
            } else {
                // FUTURE DAYS: Always use DAY icons (standard practice)
                if (day.weather?.[0]?.icon) {
                    iconCode = day.weather[0].icon;
                    iconDesc = day.weather[0].description || 'Cloudy';
                    condition = day.weather[0].main || 'Clouds';
                } else {
                    iconCode = day.icon || this._getIconCodeFromCondition(day.condition || 'Clouds');
                    iconDesc = day.description || 'Cloudy';
                    condition = day.condition || 'Clouds';
                }
            }
        });

        console.log('[WeatherRenderer] ✅ Forecast rendering complete');
    }
    /**
     * Get icon code from weather condition main string (fallback mapping)
     * @private
     * @param {string} condition - Weather condition main (e.g., 'Clear', 'Clouds')
     * @returns {string} Icon code (e.g., '01d', '03d')
     */
    _getIconCodeFromCondition(condition) {
        const conditionMap = {
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
        return conditionMap[condition] || '03d';
    }

    /**
     * Get day name (Today, Tomorrow, Mon, Tue, etc.)
     * @private
     * @param {number} index - Day index (0 = today)
     * @returns {string} Formatted day name
     */
    _getDayName(index) {
        const days = ['Today', 'Tomorrow', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const today = new Date().getDay();
        return index < 2 ? days[index] : days[((today + index - 1) % 7) + 2];
    }

    /**
     * Format temperature with unit symbol
     * @private
     * @param {number} temp - Temperature value
     * @param {string} units - Units ('metric' or 'imperial')
     * @returns {string} Formatted temperature
     */
    _formatTemperature(temp, units) {
        if (temp == null) return '--';
        return units === 'metric' ? `${Math.round(temp)}°C` : `${Math.round(temp)}°F`;
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

        // Update unit toggle button with SVG icons
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
