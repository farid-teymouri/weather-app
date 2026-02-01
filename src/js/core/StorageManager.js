/**
 * StorageManager Class
 * Handles localStorage operations with encryption and validation
 * Implements secure storage patterns for sensitive data
 *
 * @class StorageManager
 */
export class StorageManager {
  constructor() {
    this.storageKeyPrefix = "weather_app_";
    this.encryptionEnabled = this._isEncryptionSupported();
  }

  /**
   * Check if encryption is supported
   * @private
   * @returns {boolean} True if Web Crypto API is available
   */
  _isEncryptionSupported() {
    return (
      typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined"
    );
  }

  /**
   * Generate encryption key from password
   * @private
   * @param {string} password - Password to derive key from
   * @returns {Promise<CryptoKey>} CryptoKey object
   */
  async _deriveKey(password) {
    if (!this.encryptionEnabled) {
      throw new Error("Encryption not supported in this browser");
    }

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"],
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("weather_app_salt_2026"), // Fixed salt for consistency
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
  }

  /**
   * Encrypt data
   * @private
   * @param {string} data - Data to encrypt
   * @returns {Promise<string>} Encrypted data as base64 string
   */
  async _encrypt(data) {
    if (!this.encryptionEnabled) {
      return btoa(data); // Fallback to base64 encoding
    }

    try {
      const key = await this._deriveKey(this._getMasterKey());
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        key,
        dataBuffer,
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error("[StorageManager] Encryption failed:", error);
      return btoa(data); // Fallback
    }
  }

  /**
   * Decrypt data
   * @private
   * @param {string} encryptedData - Encrypted data as base64 string
   * @returns {Promise<string>} Decrypted data
   */
  async _decrypt(encryptedData) {
    if (!this.encryptionEnabled) {
      return atob(encryptedData); // Fallback from base64
    }

    try {
      const key = await this._deriveKey(this._getMasterKey());
      const combined = Uint8Array.from(atob(encryptedData), (c) =>
        c.charCodeAt(0),
      );

      // Extract IV (first 12 bytes)
      const iv = combined.slice(0, 12);
      const encryptedBuffer = combined.slice(12);

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        key,
        encryptedBuffer,
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error("[StorageManager] Decryption failed:", error);
      return atob(encryptedData); // Fallback
    }
  }

  /**
   * Get master encryption key
   * @private
   * @returns {string} Master key
   */
  _getMasterKey() {
    // In production, this should be derived from user password or secure source
    // For this demo, we use a combination of device-specific data
    const deviceKey =
      navigator.userAgent +
      navigator.language +
      window.screen.width +
      window.screen.height;
    return "weather_app_master_key_" + this._simpleHash(deviceKey);
  }

  /**
   * Simple hash function for device fingerprinting
   * @private
   * @param {string} str - String to hash
   * @returns {string} Hash string
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Save data to localStorage with optional encryption
   * @param {string} key - Storage key
   * @param {*} value - Data to save
   * @param {boolean} encrypt - Whether to encrypt the data
   * @returns {Promise<boolean>} Success status
   */
  async save(key, value, encrypt = true) {
    try {
      const fullKey = this.storageKeyPrefix + key;
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        version: "1.0",
      });

      let storedValue;
      if (encrypt) {
        storedValue = await this._encrypt(serializedValue);
      } else {
        storedValue = serializedValue;
      }

      localStorage.setItem(fullKey, storedValue);
      return true;
    } catch (error) {
      console.error("[StorageManager] Save failed:", error);
      return false;
    }
  }

  /**
   * Load data from localStorage with optional decryption
   * @param {string} key - Storage key
   * @param {boolean} decrypt - Whether to decrypt the data
   * @returns {Promise<any|null>} Data or null
   */
  async load(key, decrypt = true) {
    try {
      const fullKey = this.storageKeyPrefix + key;
      const storedValue = localStorage.getItem(fullKey);

      if (!storedValue) {
        return null;
      }

      let serializedValue;
      if (decrypt) {
        serializedValue = await this._decrypt(storedValue);
      } else {
        serializedValue = storedValue;
      }

      const parsed = JSON.parse(serializedValue);

      // Validate data structure
      if (!parsed.data || !parsed.timestamp) {
        throw new Error("Invalid data structure");
      }

      // Check if data is expired (optional)
      const age = Date.now() - parsed.timestamp;
      if (age > 30 * 24 * 60 * 60 * 1000) {
        // 30 days
        console.warn("[StorageManager] Data is older than 30 days");
      }

      return parsed.data;
    } catch (error) {
      console.error("[StorageManager] Load failed:", error);
      return null;
    }
  }

  /**
   * Remove data from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} Success status
   */
  remove(key) {
    try {
      const fullKey = this.storageKeyPrefix + key;
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error("[StorageManager] Remove failed:", error);
      return false;
    }
  }

  /**
   * Clear all stored data
   * @returns {boolean} Success status
   */
  clear() {
    try {
      // Only clear keys with our prefix
      Object.keys(localStorage)
        .filter((key) => key.startsWith(this.storageKeyPrefix))
        .forEach((key) => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error("[StorageManager] Clear failed:", error);
      return false;
    }
  }

  /**
   * Get storage usage statistics
   * @returns {Object} Storage statistics
   */
  getStorageStats() {
    let totalSize = 0;
    const keys = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storageKeyPrefix)) {
        const value = localStorage.getItem(key);
        const size = (key.length + value.length) * 2; // Approximate size in bytes
        totalSize += size;
        keys.push({
          key: key.replace(this.storageKeyPrefix, ""),
          size: size,
        });
      }
    }

    return {
      totalSize: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      itemCount: keys.length,
      items: keys,
    };
  }

  /**
   * Save favorites list
   * @param {Array} favorites - Array of favorite locations
   * @returns {Promise<boolean>} Success status
   */
  async saveFavorites(favorites) {
    // Validate favorites array
    if (!Array.isArray(favorites)) {
      console.error("[StorageManager] Favorites must be an array");
      return false;
    }

    // Sanitize favorites data
    const sanitizedFavorites = favorites.map((fav) => ({
      name: fav.name || "",
      lat: parseFloat(fav.lat) || 0,
      lon: parseFloat(fav.lon) || 0,
      country: fav.country || "",
      state: fav.state || "",
    }));

    return await this.save("favorites", sanitizedFavorites, true);
  }

  /**
   * Load favorites list
   * @returns {Promise<Array>} Array of favorite locations
   */
  async loadFavorites() {
    const favorites = await this.load("favorites", true);
    return favorites || [];
  }

  /**
   * Save temperature units preference
   * @param {string} units - 'metric' or 'imperial'
   * @returns {Promise<boolean>} Success status
   */
  async saveUnits(units) {
    if (!["metric", "imperial"].includes(units)) {
      console.error("[StorageManager] Invalid units:", units);
      return false;
    }
    return await this.save("units", units, false);
  }

  /**
   * Load temperature units preference
   * @returns {Promise<string|null>} Units preference or null
   */
  async loadUnits() {
    return await this.load("units", false);
  }

  /**
   * Get units synchronously (for initial app load)
   * @returns {string} Units preference or default
   */
  getUnits() {
    try {
      const fullKey = this.storageKeyPrefix + "units";
      const storedValue = localStorage.getItem(fullKey);
      return storedValue || "metric";
    } catch (error) {
      console.error("[StorageManager] Get units failed:", error);
      return "metric";
    }
  }

  /**
   * Save theme preference
   * @param {string} theme - 'light', 'dark', or 'system'
   * @returns {Promise<boolean>} Success status
   */
  async saveTheme(theme) {
    if (!["light", "dark", "system"].includes(theme)) {
      console.error("[StorageManager] Invalid theme:", theme);
      return false;
    }
    return await this.save("theme", theme, false);
  }

  /**
   * Load theme preference
   * @returns {Promise<string|null>} Theme preference or null
   */
  async loadTheme() {
    return await this.load("theme", false);
  }

  /**
   * Check if key exists in storage
   * @param {string} key - Storage key
   * @returns {boolean} True if key exists
   */
  hasKey(key) {
    const fullKey = this.storageKeyPrefix + key;
    return localStorage.getItem(fullKey) !== null;
  }

  /**
   * Get all keys in storage
   * @returns {Array<string>} Array of keys
   */
  getAllKeys() {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(this.storageKeyPrefix))
      .map((key) => key.replace(this.storageKeyPrefix, ""));
  }
}
