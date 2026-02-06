/**
 * LoadingSpinner Class
 * Handles loading spinner visibility with DOM resilience
 * Re-queries element if not found initially (critical for Vercel)
 */
export class LoadingSpinner {
    constructor() {
        // DO NOT cache element reference - query on demand
        this.selector = '.loading-spinner';
    }

    /**
     * Show loading spinner
     */
    show() {
        const spinner = document.querySelector(this.selector);
        if (spinner) {
            spinner.style.display = 'flex';
            spinner.setAttribute('aria-busy', 'true');
            console.log('[LoadingSpinner] Shown');
        } else {
            console.warn('[LoadingSpinner] Element not found for show()');
        }
    }

    /**
     * Hide loading spinner
     */
    hide() {
        const spinner = document.querySelector(this.selector);
        if (spinner) {
            spinner.style.display = 'none';
            spinner.removeAttribute('aria-busy');
            console.log('[LoadingSpinner] Hidden');
        } else {
            console.warn('[LoadingSpinner] Element not found for hide() - possible DOM mutation');
        }
    }

    /**
     * Check if spinner is visible
     * @returns {boolean}
     */
    isVisible() {
        const spinner = document.querySelector(this.selector);
        return spinner && window.getComputedStyle(spinner).display !== 'none';
    }

    /**
     * Cleanup
     */
    destroy() {
        this.hide();
    }
}
