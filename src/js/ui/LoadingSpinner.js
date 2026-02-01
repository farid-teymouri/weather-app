/**
 * LoadingSpinner Class
 * Manages loading overlay and spinner animations
 * Provides smooth transitions and accessibility support
 *
 * @class LoadingSpinner
 */
export class LoadingSpinner {
  constructor() {
    this.loadingOverlay = document.getElementById("loading-overlay");
    this.isLoading = false;
    this.showTimeout = null;
    this.MIN_SHOW_DURATION = 300; // Minimum time to show spinner

    this._initialize();
  }

  /**
   * Initialize loading overlay
   * @private
   */
  _initialize() {
    if (!this.loadingOverlay) {
      console.warn("[LoadingSpinner] Loading overlay not found, creating one");
      this._createLoadingOverlay();
    }
  }

  /**
   * Create loading overlay if it doesn't exist
   * @private
   */
  _createLoadingOverlay() {
    this.loadingOverlay = document.createElement("div");
    this.loadingOverlay.id = "loading-overlay";
    this.loadingOverlay.className = "loading-overlay";
    this.loadingOverlay.setAttribute("aria-hidden", "true");
    this.loadingOverlay.setAttribute("aria-busy", "false");

    this.loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-ring"></div>
                <p class="loading-text">Loading weather data...</p>
            </div>
        `;

    document.body.appendChild(this.loadingOverlay);
  }

  /**
   * Show loading spinner
   * @param {string} [message] - Custom loading message
   */
  show(message) {
    if (this.isLoading) return;

    this.isLoading = true;

    // Set custom message if provided
    if (message && this.loadingOverlay) {
      const textElement = this.loadingOverlay.querySelector(".loading-text");
      if (textElement) {
        textElement.textContent = message;
      }
    }

    // Show overlay after brief delay to avoid flickering
    this.showTimeout = setTimeout(() => {
      if (this.loadingOverlay) {
        this.loadingOverlay.style.display = "flex";
        this.loadingOverlay.setAttribute("aria-hidden", "false");
        this.loadingOverlay.setAttribute("aria-busy", "true");

        // Trigger animation
        requestAnimationFrame(() => {
          this.loadingOverlay.classList.add("loading-show");
        });
      }
    }, 100);
  }

  /**
   * Hide loading spinner
   */
  hide() {
    if (!this.isLoading) return;

    // Clear show timeout if spinner hasn't appeared yet
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }

    this.isLoading = false;

    if (this.loadingOverlay) {
      this.loadingOverlay.classList.remove("loading-show");
      this.loadingOverlay.setAttribute("aria-hidden", "true");
      this.loadingOverlay.setAttribute("aria-busy", "false");

      // Hide after animation completes
      setTimeout(() => {
        if (this.loadingOverlay) {
          this.loadingOverlay.style.display = "none";
        }
      }, 300);
    }
  }

  /**
   * Check if loading spinner is visible
   * @returns {boolean} True if loading
   */
  isVisible() {
    return this.isLoading;
  }

  /**
   * Show spinner with auto-hide after duration
   * @param {number} duration - Duration in milliseconds
   * @param {string} [message] - Custom message
   */
  showForDuration(duration, message) {
    this.show(message);

    setTimeout(() => {
      this.hide();
    }, duration);
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
    }

    if (this.loadingOverlay && this.loadingOverlay.parentNode) {
      this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
    }

    this.isLoading = false;
  }
}
