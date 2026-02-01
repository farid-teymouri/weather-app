/**
 * Toast Class
 * Manages toast notifications with accessibility support
 * Provides success, error, warning, and info notifications
 *
 * @class Toast
 */
export class Toast {
  constructor() {
    this.toastContainer = document.getElementById("toast-container");
    this.toasts = [];
    this.DEFAULT_DURATION = 5000; // 5 seconds
    this.MAX_TOASTS = 5;

    this._initialize();
  }

  /**
   * Initialize toast container
   * @private
   */
  _initialize() {
    if (!this.toastContainer) {
      console.warn("[Toast] Toast container not found, creating one");
      this._createToastContainer();
    }
  }

  /**
   * Create toast container if it doesn't exist
   * @private
   */
  _createToastContainer() {
    this.toastContainer = document.createElement("div");
    this.toastContainer.id = "toast-container";
    this.toastContainer.className = "toast-container";
    this.toastContainer.setAttribute("aria-live", "assertive");
    this.toastContainer.setAttribute("aria-atomic", "true");

    // Add to body
    document.body.appendChild(this.toastContainer);
  }

  /**
   * Show toast notification
   * @private
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, warning, info)
   * @param {number} duration - Duration in milliseconds
   */
  _show(message, type = "info", duration = this.DEFAULT_DURATION) {
    if (!message || typeof message !== "string") {
      console.error("[Toast] Invalid message:", message);
      return;
    }

    // Create toast element
    const toast = this._createToastElement(message, type);

    // Add to container
    this.toastContainer.appendChild(toast);
    this.toasts.push(toast);

    // Enforce max toasts
    if (this.toasts.length > this.MAX_TOASTS) {
      const oldestToast = this.toasts.shift();
      if (oldestToast && oldestToast.parentNode) {
        oldestToast.parentNode.removeChild(oldestToast);
      }
    }

    // Auto-remove after duration
    const timeoutId = setTimeout(() => {
      this._removeToast(toast);
    }, duration);

    // Store timeout ID for cleanup
    toast._timeoutId = timeoutId;

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add("toast-show");
    });
  }

  /**
   * Create toast element
   * @private
   * @param {string} message - Toast message
   * @param {string} type - Toast type
   * @returns {HTMLElement} Toast element
   */
  _createToastElement(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-label", `${type} notification`);

    // Icon based on type
    const icons = {
      success: '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
      error:
        '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
      warning: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
      info: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>',
    };

    const iconSvg = icons[type] || icons.info;

    toast.innerHTML = `
            <div class="toast-content">
                <svg class="toast-icon" viewBox="0 0 24 24" aria-hidden="true">
                    ${iconSvg}
                </svg>
                <div class="toast-message">${this._sanitizeHtml(message)}</div>
                <button class="toast-close" aria-label="Close notification">
                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        `;

    // Close button handler
    const closeButton = toast.querySelector(".toast-close");
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        this._removeToast(toast);
      });
    }

    return toast;
  }

  /**
   * Remove toast notification
   * @private
   * @param {HTMLElement} toast - Toast element to remove
   */
  _removeToast(toast) {
    if (!toast || !toast.parentNode) return;

    // Clear timeout
    if (toast._timeoutId) {
      clearTimeout(toast._timeoutId);
    }

    // Remove from array
    const index = this.toasts.indexOf(toast);
    if (index > -1) {
      this.toasts.splice(index, 1);
    }

    // Animate out
    toast.classList.remove("toast-show");

    // Remove after animation
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Show success toast
   * @param {string} message - Success message
   * @param {number} duration - Duration in milliseconds
   */
  showSuccess(message, duration = this.DEFAULT_DURATION) {
    this._show(message, "success", duration);
  }

  /**
   * Show error toast
   * @param {string} message - Error message
   * @param {number} duration - Duration in milliseconds
   */
  showError(message, duration = this.DEFAULT_DURATION) {
    this._show(message, "error", duration);
  }

  /**
   * Show warning toast
   * @param {string} message - Warning message
   * @param {number} duration - Duration in milliseconds
   */
  showWarning(message, duration = this.DEFAULT_DURATION) {
    this._show(message, "warning", duration);
  }

  /**
   * Show info toast
   * @param {string} message - Info message
   * @param {number} duration - Duration in milliseconds
   */
  showInfo(message, duration = this.DEFAULT_DURATION) {
    this._show(message, "info", duration);
  }

  /**
   * Clear all toasts
   */
  clearAll() {
    this.toasts.forEach((toast) => {
      this._removeToast(toast);
    });
    this.toasts = [];
  }

  /**
   * Sanitize HTML to prevent XSS
   * @private
   * @param {string} html - HTML string
   * @returns {string} Sanitized HTML
   */
  _sanitizeHtml(html) {
    if (typeof html !== "string") {
      return "";
    }

    // Basic HTML escaping
    return html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Cleanup
   */
  destroy() {
    this.clearAll();

    if (this.toastContainer && this.toastContainer.parentNode) {
      this.toastContainer.parentNode.removeChild(this.toastContainer);
    }
  }
}
