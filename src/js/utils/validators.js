/**
 * Validators Module
 * Input validation and sanitization functions
 * XSS protection and data validation
 */

/**
 * Sanitize HTML string to prevent XSS
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
  if (typeof html !== "string") {
    return "";
  }

  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/<\w+\s+[^>]*on\w+\s*=\s*["'][^"']*["']/gi, "");
}

/**
 * Sanitize string for display
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(str) {
  if (typeof str !== "string") {
    return "";
  }

  return str
    .trim()
    .replace(/[<>\"'`]/g, "") // Remove dangerous characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .substring(0, 200); // Limit length
}

/**
 * Validate latitude
 * @param {number} lat - Latitude value
 * @returns {boolean} True if valid
 */
export function isValidLatitude(lat) {
  if (typeof lat !== "number" && typeof lat !== "string") {
    return false;
  }

  const value = parseFloat(lat);
  return !isNaN(value) && value >= -90 && value <= 90;
}

/**
 * Validate longitude
 * @param {number} lon - Longitude value
 * @returns {boolean} True if valid
 */
export function isValidLongitude(lon) {
  if (typeof lon !== "number" && typeof lon !== "string") {
    return false;
  }

  const value = parseFloat(lon);
  return !isNaN(value) && value >= -180 && value <= 180;
}

/**
 * Validate coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} True if valid
 */
export function isValidCoordinates(lat, lon) {
  return isValidLatitude(lat) && isValidLongitude(lon);
}

/**
 * Validate temperature units
 * @param {string} units - Units to validate
 * @returns {boolean} True if valid
 */
export function isValidUnits(units) {
  return units === "metric" || units === "imperial";
}

/**
 * Validate location object
 * @param {Object} location - Location object
 * @returns {boolean} True if valid
 */
export function isValidLocation(location) {
  if (!location || typeof location !== "object") {
    return false;
  }

  return (
    typeof location.name === "string" &&
    isValidLatitude(location.lat) &&
    isValidLongitude(location.lon)
  );
}

/**
 * Validate weather data
 * @param {Object} data - Weather data
 * @returns {boolean} True if valid
 */
export function isValidWeatherData(data) {
  if (!data || typeof data !== "object") {
    return false;
  }

  return (
    typeof data.name === "string" &&
    data.main &&
    typeof data.main.temp === "number"
  );
}

/**
 * Sanitize weather data
 * @param {Object} data - Weather data
 * @returns {Object} Sanitized data
 */
export function sanitizeWeatherData(data) {
  if (!data || typeof data !== "object") {
    return {};
  }

  const sanitized = {};

  // Sanitize string fields
  if (data.name) {
    sanitized.name = sanitizeString(data.name);
  }

  if (data.weather && Array.isArray(data.weather)) {
    sanitized.weather = data.weather.map((item) => ({
      id: item.id,
      main: sanitizeString(item.main),
      description: sanitizeString(item.description),
      icon: sanitizeString(item.icon),
    }));
  }

  // Copy numeric fields directly
  if (data.main) {
    sanitized.main = {
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      temp_min: data.main.temp_min,
      temp_max: data.main.temp_max,
      pressure: data.main.pressure,
      humidity: data.main.humidity,
    };
  }

  if (data.wind) {
    sanitized.wind = {
      speed: data.wind.speed,
      deg: data.wind.deg,
    };
  }

  if (data.clouds) {
    sanitized.clouds = {
      all: data.clouds.all,
    };
  }

  if (data.dt) {
    sanitized.dt = data.dt;
  }

  if (data.sys) {
    sanitized.sys = {
      type: data.sys.type,
      id: data.sys.id,
      country: sanitizeString(data.sys.country),
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
    };
  }

  if (data.timezone) {
    sanitized.timezone = data.timezone;
  }

  if (data.id) {
    sanitized.id = data.id;
  }

  if (data.cod) {
    sanitized.cod = data.cod;
  }

  return sanitized;
}

/**
 * Validate search query
 * @param {string} query - Search query
 * @returns {boolean} True if valid
 */
export function isValidSearchQuery(query) {
  if (typeof query !== "string") {
    return false;
  }

  const sanitized = sanitizeString(query);
  return sanitized.length >= 2 && sanitized.length <= 100;
}

/**
 * Sanitize search query
 * @param {string} query - Search query
 * @returns {string} Sanitized query
 */
export function sanitizeSearchQuery(query) {
  if (typeof query !== "string") {
    return "";
  }

  return sanitizeString(query);
}

/**
 * Validate favorite location
 * @param {Object} favorite - Favorite location
 * @returns {boolean} True if valid
 */
export function isValidFavorite(favorite) {
  if (!favorite || typeof favorite !== "object") {
    return false;
  }

  return (
    typeof favorite.name === "string" &&
    favorite.name.length > 0 &&
    isValidLatitude(favorite.lat) &&
    isValidLongitude(favorite.lon) &&
    (!favorite.state || typeof favorite.state === "string") &&
    (!favorite.country || typeof favorite.country === "string")
  );
}

/**
 * Sanitize favorite location
 * @param {Object} favorite - Favorite location
 * @returns {Object} Sanitized favorite
 */
export function sanitizeFavorite(favorite) {
  if (!favorite || typeof favorite !== "object") {
    return null;
  }

  const sanitized = {
    name: sanitizeString(favorite.name),
    lat: parseFloat(favorite.lat),
    lon: parseFloat(favorite.lon),
    state: favorite.state ? sanitizeString(favorite.state) : "",
    country: favorite.country ? sanitizeString(favorite.country) : "",
    timestamp: favorite.timestamp || Date.now(),
  };

  if (!isValidFavorite(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Validate array
 * @param {*} arr - Value to validate
 * @returns {boolean} True if valid array
 */
export function isValidArray(arr) {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * Sanitize array of locations
 * @param {Array} locations - Array of locations
 * @returns {Array} Sanitized array
 */
export function sanitizeLocations(locations) {
  if (!isValidArray(locations)) {
    return [];
  }

  return locations
    .map((loc) => sanitizeFavorite(loc))
    .filter((loc) => loc !== null)
    .slice(0, 50); // Limit to 50 results
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Sanitize URL
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL
 */
export function sanitizeUrl(url) {
  if (typeof url !== "string") {
    return "";
  }

  // Remove javascript: and other dangerous protocols
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) {
    return "";
  }

  try {
    return new URL(url).toString();
  } catch (e) {
    return "";
  }
}

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  if (typeof email !== "string") {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (typeof str !== "string") {
    return "";
  }

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Unescape HTML special characters
 * @param {string} str - String to unescape
 * @returns {string} Unescaped string
 */
export function unescapeHtml(str) {
  if (typeof str !== "string") {
    return "";
  }

  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

/**
 * Validate JSON string
 * @param {string} jsonString - JSON string to validate
 * @returns {boolean} True if valid
 */
export function isValidJson(jsonString) {
  try {
    JSON.parse(jsonString);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Sanitize and parse JSON
 * @param {string} jsonString - JSON string
 * @returns {Object|null} Parsed object or null
 */
export function sanitizeJson(jsonString) {
  if (!isValidJson(jsonString)) {
    return null;
  }

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return null;
  }
}

/**
 * Validate color hex code
 * @param {string} color - Color code
 * @returns {boolean} True if valid
 */
export function isValidColor(color) {
  if (typeof color !== "string") {
    return false;
  }

  const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;
  return hexRegex.test(color);
}

/**
 * Validate phone number
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid
 */
export function isValidPhone(phone) {
  if (typeof phone !== "string") {
    return false;
  }

  const phoneRegex =
    /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
}
