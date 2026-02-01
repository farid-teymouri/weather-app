/**
 * Helper Functions Module
 * Utility functions for weather app
 * Pure functions with no side effects
 */

/**
 * Format temperature based on units
 * @param {number} temp - Temperature value
 * @param {string} units - 'metric' or 'imperial'
 * @returns {string} Formatted temperature
 */
export function formatTemperature(temp, units = "metric") {
  if (temp === undefined || temp === null) {
    return "--";
  }

  const value = parseFloat(temp);
  if (isNaN(value)) {
    return "--";
  }

  // Round to nearest whole number
  const rounded = Math.round(value);

  return rounded.toString();
}

/**
 * Format wind speed based on units
 * @param {number} speed - Wind speed in m/s
 * @param {string} units - 'metric' or 'imperial'
 * @returns {string} Formatted wind speed
 */
export function formatWindSpeed(speed, units = "metric") {
  if (speed === undefined || speed === null) {
    return "--";
  }

  const value = parseFloat(speed);
  if (isNaN(value)) {
    return "--";
  }

  if (units === "imperial") {
    // Convert m/s to mph (1 m/s = 2.237 mph)
    const mph = Math.round(value * 2.237);
    return `${mph} mph`;
  } else {
    // Keep as m/s
    return `${Math.round(value)} m/s`;
  }
}

/**
 * Get weather icon SVG based on weather condition
 * @param {string} condition - Weather condition (e.g., 'Clear', 'Clouds', 'Rain')
 * @returns {string} SVG icon HTML
 */
export function getWeatherIcon(condition) {
  const icons = {
    Clear: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="25" fill="#f6ad55"/>
                <line x1="50" y1="15" x2="50" y2="25" stroke="#f6ad55" stroke-width="3" stroke-linecap="round"/>
                <line x1="50" y1="75" x2="50" y2="85" stroke="#f6ad55" stroke-width="3" stroke-linecap="round"/>
                <line x1="15" y1="50" x2="25" y2="50" stroke="#f6ad55" stroke-width="3" stroke-linecap="round"/>
                <line x1="75" y1="50" x2="85" y2="50" stroke="#f6ad55" stroke-width="3" stroke-linecap="round"/>
                <line x1="25" y1="25" x2="32" y2="32" stroke="#f6ad55" stroke-width="3" stroke-linecap="round"/>
                <line x1="75" y1="25" x2="68" y2="32" stroke="#f6ad55" stroke-width="3" stroke-linecap="round"/>
                <line x1="25" y1="75" x2="32" y2="68" stroke="#f6ad55" stroke-width="3" stroke-linecap="round"/>
                <line x1="75" y1="75" x2="68" y2="68" stroke="#f6ad55" stroke-width="3" stroke-linecap="round"/>
            </svg>
        `,
    Clouds: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <path d="M80 50c0-11-9-20-20-20s-20 9-20 20c0 3 1 6 2 9H20c-6 0-10 5-10 11s4 11 10 11h60c6 0 10-5 10-11s-4-11-10-11z" fill="#a0aec0"/>
            </svg>
        `,
    Rain: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <path d="M80 50c0-11-9-20-20-20s-20 9-20 20c0 3 1 6 2 9H20c-6 0-10 5-10 11s4 11 10 11h60c6 0 10-5 10-11s-4-11-10-11z" fill="#4299e1"/>
                <line x1="30" y1="70" x2="30" y2="85" stroke="#4299e1" stroke-width="3" stroke-linecap="round"/>
                <line x1="50" y1="70" x2="50" y2="85" stroke="#4299e1" stroke-width="3" stroke-linecap="round"/>
                <line x1="70" y1="70" x2="70" y2="85" stroke="#4299e1" stroke-width="3" stroke-linecap="round"/>
            </svg>
        `,
    Drizzle: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <path d="M80 50c0-11-9-20-20-20s-20 9-20 20c0 3 1 6 2 9H20c-6 0-10 5-10 11s4 11 10 11h60c6 0 10-5 10-11s-4-11-10-11z" fill="#63b3ed"/>
                <line x1="30" y1="70" x2="30" y2="80" stroke="#63b3ed" stroke-width="2" stroke-linecap="round"/>
                <line x1="40" y1="70" x2="40" y2="80" stroke="#63b3ed" stroke-width="2" stroke-linecap="round"/>
                <line x1="50" y1="70" x2="50" y2="80" stroke="#63b3ed" stroke-width="2" stroke-linecap="round"/>
                <line x1="60" y1="70" x2="60" y2="80" stroke="#63b3ed" stroke-width="2" stroke-linecap="round"/>
                <line x1="70" y1="70" x2="70" y2="80" stroke="#63b3ed" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `,
    Thunderstorm: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <path d="M80 50c0-11-9-20-20-20s-20 9-20 20c0 3 1 6 2 9H20c-6 0-10 5-10 11s4 11 10 11h60c6 0 10-5 10-11s-4-11-10-11z" fill="#dd6b20"/>
                <path d="M45 65L55 65L50 85L60 65L70 65L55 45L50 65L40 65Z" fill="#dd6b20"/>
            </svg>
        `,
    Snow: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <path d="M80 50c0-11-9-20-20-20s-20 9-20 20c0 3 1 6 2 9H20c-6 0-10 5-10 11s4 11 10 11h60c6 0 10-5 10-11s-4-11-10-11z" fill="#718096"/>
                <path d="M50 75L40 85L45 90L50 80L55 90L60 85Z" fill="#718096"/>
                <circle cx="35" cy="65" r="3" fill="#718096"/>
                <circle cx="65" cy="65" r="3" fill="#718096"/>
            </svg>
        `,
    Mist: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <path d="M80 50c0-11-9-20-20-20s-20 9-20 20c0 3 1 6 2 9H20c-6 0-10 5-10 11s4 11 10 11h60c6 0 10-5 10-11s-4-11-10-11z" fill="#cbd5e0"/>
                <line x1="20" y1="75" x2="80" y2="75" stroke="#cbd5e0" stroke-width="4" stroke-linecap="round"/>
                <line x1="20" y1="80" x2="80" y2="80" stroke="#cbd5e0" stroke-width="4" stroke-linecap="round"/>
                <line x1="20" y1="85" x2="80" y2="85" stroke="#cbd5e0" stroke-width="4" stroke-linecap="round"/>
            </svg>
        `,
    Smoke: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="40" r="20" fill="#a0aec0" opacity="0.6"/>
                <circle cx="40" cy="60" r="15" fill="#a0aec0" opacity="0.4"/>
                <circle cx="60" cy="65" r="12" fill="#a0aec0" opacity="0.3"/>
            </svg>
        `,
    Haze: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="30" fill="#a0aec0" opacity="0.3"/>
                <line x1="30" y1="50" x2="70" y2="50" stroke="#a0aec0" stroke-width="3" stroke-linecap="round"/>
                <line x1="50" y1="30" x2="50" y2="70" stroke="#a0aec0" stroke-width="3" stroke-linecap="round"/>
            </svg>
        `,
    Dust: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="40" cy="50" r="10" fill="#dd6b20" opacity="0.6"/>
                <circle cx="60" cy="55" r="8" fill="#dd6b20" opacity="0.4"/>
                <circle cx="50" cy="45" r="12" fill="#dd6b20" opacity="0.5"/>
            </svg>
        `,
    Fog: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <rect x="20" y="60" width="60" height="25" rx="5" fill="#cbd5e0"/>
                <line x1="25" y1="72" x2="75" y2="72" stroke="#a0aec0" stroke-width="2"/>
                <line x1="25" y1="78" x2="75" y2="78" stroke="#a0aec0" stroke-width="2"/>
                <line x1="25" y1="84" x2="75" y2="84" stroke="#a0aec0" stroke-width="2"/>
            </svg>
        `,
    Sand: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <path d="M30 80L50 60L70 80Z" fill="#dd6b20"/>
                <circle cx="40" cy="50" r="8" fill="#dd6b20" opacity="0.6"/>
                <circle cx="60" cy="45" r="6" fill="#dd6b20" opacity="0.4"/>
            </svg>
        `,
    Ash: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="25" fill="#718096" opacity="0.4"/>
                <circle cx="40" cy="40" r="8" fill="#718096" opacity="0.6"/>
                <circle cx="60" cy="60" r="6" fill="#718096" opacity="0.5"/>
            </svg>
        `,
    Squall: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <path d="M80 50c0-11-9-20-20-20s-20 9-20 20c0 3 1 6 2 9H20c-6 0-10 5-10 11s4 11 10 11h60c6 0 10-5 10-11s-4-11-10-11z" fill="#4299e1"/>
                <path d="M30 70L40 60L50 70L60 60L70 70" stroke="#4299e1" stroke-width="3" fill="none"/>
            </svg>
        `,
    Tornado: `
            <svg class="weather-icon" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="25" fill="#dd6b20" opacity="0.2"/>
                <path d="M50 30L60 40L55 50L65 60L60 70L50 80L40 70L45 60L35 50L40 40Z" fill="#dd6b20"/>
            </svg>
        `,
  };

  return icons[condition] || icons["Clouds"];
}

/**
 * Format date to readable string
 * @param {number|Date} timestamp - Timestamp or Date object
 * @param {string} format - Format type ('short', 'long', 'weekday')
 * @returns {string} Formatted date
 */
export function formatDate(timestamp, format = "short") {
  const date = new Date(timestamp);

  const options = {
    short: { month: "short", day: "numeric" },
    long: { year: "numeric", month: "long", day: "numeric" },
    weekday: { weekday: "short" },
  };

  return date.toLocaleDateString(undefined, options[format] || options.short);
}

/**
 * Format time to readable string
 * @param {number|Date} timestamp - Timestamp or Date object
 * @returns {string} Formatted time
 */
export function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get weather description with proper capitalization
 * @param {string} description - Weather description
 * @returns {string} Capitalized description
 */
export function capitalizeWeatherDescription(description) {
  if (!description) return "";

  return description
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Calculate UV index risk level
 * @param {number} uvIndex - UV index value
 * @returns {Object} Risk level and color
 */
export function getUVIndexInfo(uvIndex) {
  if (uvIndex <= 2) {
    return { level: "Low", color: "green", message: "Low risk" };
  } else if (uvIndex <= 5) {
    return { level: "Moderate", color: "yellow", message: "Moderate risk" };
  } else if (uvIndex <= 7) {
    return { level: "High", color: "orange", message: "High risk" };
  } else if (uvIndex <= 10) {
    return { level: "Very High", color: "red", message: "Very high risk" };
  } else {
    return { level: "Extreme", color: "purple", message: "Extreme risk" };
  }
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if value is empty
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && Object.keys(value).length === 0) return true;
  return false;
}

/**
 * Generate unique ID
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique ID
 */
export function generateId(prefix = "") {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (typeof num !== "number") return num;
  return num.toLocaleString();
}

/**
 * Get day of week from timestamp
 * @param {number} timestamp - Timestamp
 * @returns {string} Day of week
 */
export function getDayOfWeek(timestamp) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const date = new Date(timestamp);
  return days[date.getDay()];
}

/**
 * Check if date is today
 * @param {number|Date} date - Date to check
 * @returns {boolean} True if today
 */
export function isToday(date) {
  const checkDate = new Date(date);
  const today = new Date();
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
}

/**
 * Calculate wind direction abbreviation
 * @param {number} degrees - Wind direction in degrees
 * @returns {string} Direction abbreviation
 */
export function getWindDirection(degrees) {
  if (degrees === undefined) return "";

  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return directions[Math.round(degrees / 22.5) % 16];
}

/**
 * Clamp number between min and max
 * @param {number} num - Number to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped number
 */
export function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

/**
 * Linear interpolation
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(start, end, t) {
  return start * (1 - t) + end * t;
}
