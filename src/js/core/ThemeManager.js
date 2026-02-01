/**
 * ThemeManager Class
 * Handles dark/light mode theming with system preference detection
 * Persists user preferences and manages theme transitions
 *
 * @class ThemeManager
 */
export class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.systemPreference = null;
    this.themeChangeCallbacks = [];

    // Detect system preference
    this._detectSystemPreference();

    // Listen for system preference changes
    this._setupSystemListener();
  }

  /**
   * Detect system color scheme preference
   * @private
   */
  _detectSystemPreference() {
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      this.systemPreference = "dark";
    } else {
      this.systemPreference = "light";
    }
  }

  /**
   * Setup listener for system theme changes
   * @private
   */
  _setupSystemListener() {
    if (window.matchMedia) {
      const darkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      // Modern browsers
      if (darkMediaQuery.addEventListener) {
        darkMediaQuery.addEventListener("change", (e) => {
          this.systemPreference = e.matches ? "dark" : "light";
          this._notifyThemeChange();
        });
      }
      // Legacy browsers
      else if (darkMediaQuery.addListener) {
        darkMediaQuery.addListener((e) => {
          this.systemPreference = e.matches ? "dark" : "light";
          this._notifyThemeChange();
        });
      }
    }
  }

  /**
   * Apply saved theme from storage
   * @returns {string} Applied theme
   */
  applySavedTheme() {
    const savedTheme = localStorage.getItem("weather_app_theme") || "system";
    return this.setTheme(savedTheme);
  }

  /**
   * Set theme manually
   * @param {string} theme - 'light', 'dark', or 'system'
   * @returns {string} Applied theme
   */
  setTheme(theme) {
    if (!["light", "dark", "system"].includes(theme)) {
      console.error("[ThemeManager] Invalid theme:", theme);
      theme = "system";
    }

    // Save preference
    localStorage.setItem("weather_app_theme", theme);

    // Determine actual theme to apply
    let actualTheme;
    if (theme === "system") {
      actualTheme = this.systemPreference;
    } else {
      actualTheme = theme;
    }

    // Apply theme to document
    this._applyTheme(actualTheme);

    // Update theme toggle button
    this._updateThemeToggleButton(actualTheme);

    // Notify callbacks
    this._notifyThemeChange(actualTheme);

    return actualTheme;
  }

  /**
   * Toggle between light and dark mode
   * @returns {string} New theme
   */
  toggleTheme() {
    const currentSavedTheme =
      localStorage.getItem("weather_app_theme") || "system";

    let newTheme;
    if (currentSavedTheme === "system") {
      // If on system, switch to opposite of system preference
      newTheme = this.systemPreference === "dark" ? "light" : "dark";
    } else if (currentSavedTheme === "light") {
      newTheme = "dark";
    } else {
      newTheme = "light";
    }

    return this.setTheme(newTheme);
  }

  /**
   * Apply theme to document
   * @private
   * @param {string} theme - Theme to apply
   */
  _applyTheme(theme) {
    if (this.currentTheme === theme) {
      return;
    }

    // Remove old theme
    if (this.currentTheme) {
      document.documentElement.removeAttribute(
        `data-theme-${this.currentTheme}`,
      );
      document.documentElement.classList.remove(`theme-${this.currentTheme}`);
    }

    // Apply new theme
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.add(`theme-${theme}`);

    // Update theme color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      if (theme === "dark") {
        metaThemeColor.setAttribute("content", "#1a202c");
      } else {
        metaThemeColor.setAttribute("content", "#4c6fff");
      }
    }

    this.currentTheme = theme;
  }

  /**
   * Update theme toggle button appearance
   * @private
   * @param {string} theme - Current theme
   */
  _updateThemeToggleButton(theme) {
    const toggleButton = document.getElementById("theme-toggle");
    if (!toggleButton) return;

    const sunIcon = toggleButton.querySelector(".icon-sun");
    const moonIcon = toggleButton.querySelector(".icon-moon");

    if (theme === "dark") {
      if (sunIcon) sunIcon.style.display = "none";
      if (moonIcon) moonIcon.style.display = "block";
      toggleButton.setAttribute("aria-pressed", "true");
      toggleButton.setAttribute("aria-label", "Switch to light mode");
    } else {
      if (sunIcon) sunIcon.style.display = "block";
      if (moonIcon) moonIcon.style.display = "none";
      toggleButton.setAttribute("aria-pressed", "false");
      toggleButton.setAttribute("aria-label", "Switch to dark mode");
    }
  }

  /**
   * Get current theme
   * @returns {string|null} Current theme or null
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get system preference
   * @returns {string} System theme preference
   */
  getSystemPreference() {
    return this.systemPreference;
  }

  /**
   * Get saved preference
   * @returns {string} Saved theme preference
   */
  getSavedPreference() {
    return localStorage.getItem("weather_app_theme") || "system";
  }

  /**
   * Register theme change callback
   * @param {Function} callback - Callback function
   */
  onThemeChange(callback) {
    if (typeof callback === "function") {
      this.themeChangeCallbacks.push(callback);
    }
  }

  /**
   * Notify all callbacks of theme change
   * @private
   * @param {string} theme - New theme
   */
  _notifyThemeChange(theme = this.currentTheme) {
    this.themeChangeCallbacks.forEach((callback) => {
      try {
        callback(theme);
      } catch (error) {
        console.error("[ThemeManager] Callback error:", error);
      }
    });
  }

  /**
   * Remove theme change callback
   * @param {Function} callback - Callback to remove
   */
  removeThemeChangeCallback(callback) {
    const index = this.themeChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.themeChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Cleanup listeners
   */
  destroy() {
    // Remove media query listeners if possible
    // (Note: There's no standard way to remove matchMedia listeners)
    this.themeChangeCallbacks = [];
  }
}
