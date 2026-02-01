/**
 * Accessibility Helpers Module
 * Functions to improve accessibility and screen reader support
 */

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 */
export function a11yAnnounce(message) {
    if (typeof message !== 'string') {
        return;
    }

    // Create or get aria-live region
    let liveRegion = document.getElementById('a11y-live-region');

    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'a11y-live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        liveRegion.style.clip = 'rect(1px, 1px, 1px, 1px)';
        document.body.appendChild(liveRegion);
    }

    // Clear previous content
    liveRegion.textContent = '';

    // Set new content after brief delay to ensure screen reader picks it up
    setTimeout(() => {
        liveRegion.textContent = message;
    }, 100);
}

/**
 * Focus trap for modals and dialogs
 * @param {HTMLElement} element - Element to trap focus within
 */
export function trapFocus(element) {
    if (!element || !(element instanceof HTMLElement)) {
        return () => {};
    }

    // Get all focusable elements
    const focusableElements = getFocusableElements(element);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Set initial focus
    if (firstFocusable) {
        firstFocusable.focus();
    }

    // Handle tab key
    const handleKeyDown = (e) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            // Shift + Tab: focus previous element
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            // Tab: focus next element
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    };

    element.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
        element.removeEventListener('keydown', handleKeyDown);
    };
}

/**
 * Get all focusable elements within a container
 * @param {HTMLElement} container - Container element
 * @returns {Array} Array of focusable elements
 */
export function getFocusableElements(container) {
    if (!container || !(container instanceof HTMLElement)) {
        return [];
    }

    const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[contenteditable="true"]:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    return Array.from(container.querySelectorAll(focusableSelectors)).filter((el) => {
        // Check if element is visible and not hidden
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });
}

/**
 * Skip to main content
 */
export function skipToMain() {
    const mainContent =
        document.querySelector('main') || document.getElementById('main') || document.querySelector('[role="main"]');

    if (mainContent) {
        mainContent.setAttribute('tabindex', '-1');
        mainContent.focus();
        setTimeout(() => {
            mainContent.removeAttribute('tabindex');
        }, 1000);
    }
}

/**
 * Create visually hidden element for screen readers
 * @param {string} text - Text content
 * @returns {HTMLElement} Visually hidden element
 */
export function createVisuallyHidden(text) {
    const element = document.createElement('span');
    element.textContent = text;
    element.className = 'sr-only';
    return element;
}

/**
 * Add loading state with ARIA attributes
 * @param {HTMLElement} element - Element to mark as loading
 */
export function setLoadingState(element, isLoading) {
    if (!element || !(element instanceof HTMLElement)) {
        return;
    }

    if (isLoading) {
        element.setAttribute('aria-busy', 'true');
        element.setAttribute('aria-live', 'polite');
    } else {
        element.setAttribute('aria-busy', 'false');
        element.removeAttribute('aria-live');
    }
}

/**
 * Create ARIA alert
 * @param {string} message - Alert message
 * @param {string} type - Alert type (assertive/polite)
 * @returns {HTMLElement} Alert element
 */
export function createAriaAlert(message, type = 'assertive') {
    const alert = document.createElement('div');
    alert.setAttribute('role', 'alert');
    alert.setAttribute('aria-live', type);
    alert.setAttribute('aria-atomic', 'true');
    alert.textContent = message;
    alert.style.position = 'absolute';
    alert.style.width = '1px';
    alert.style.height = '1px';
    alert.style.overflow = 'hidden';
    return alert;
}

/**
 * Set ARIA expanded state
 * @param {HTMLElement} element - Element to update
 * @param {boolean} expanded - Expanded state
 */
export function setAriaExpanded(element, expanded) {
    if (!element || !(element instanceof HTMLElement)) {
        return;
    }

    element.setAttribute('aria-expanded', expanded.toString());
}

/**
 * Set ARIA selected state
 * @param {HTMLElement} element - Element to update
 * @param {boolean} selected - Selected state
 */
export function setAriaSelected(element, selected) {
    if (!element || !(element instanceof HTMLElement)) {
        return;
    }

    element.setAttribute('aria-selected', selected.toString());
}

/**
 * Set ARIA disabled state
 * @param {HTMLElement} element - Element to update
 * @param {boolean} disabled - Disabled state
 */
export function setAriaDisabled(element, disabled) {
    if (!element || !(element instanceof HTMLElement)) {
        return;
    }

    element.setAttribute('aria-disabled', disabled.toString());
    if (disabled) {
        element.setAttribute('tabindex', '-1');
    } else {
        element.removeAttribute('tabindex');
    }
}

/**
 * Create ARIA description
 * @param {string} description - Description text
 * @returns {HTMLElement} Description element
 */
export function createAriaDescription(description) {
    const desc = document.createElement('div');
    desc.setAttribute('role', 'region');
    desc.setAttribute('aria-live', 'polite');
    desc.setAttribute('aria-atomic', 'true');
    desc.textContent = description;
    desc.style.position = 'absolute';
    desc.style.width = '1px';
    desc.style.height = '1px';
    desc.style.overflow = 'hidden';
    return desc;
}

/**
 * Get accessible name for element
 * @param {HTMLElement} element - Element to get name for
 * @returns {string} Accessible name
 */
export function getAccessibleName(element) {
    if (!element || !(element instanceof HTMLElement)) {
        return '';
    }

    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
        return ariaLabel;
    }

    // Check aria-labelledby
    const ariaLabelledby = element.getAttribute('aria-labelledby');
    if (ariaLabelledby) {
        const labelElement = document.getElementById(ariaLabelledby);
        if (labelElement) {
            return labelElement.textContent.trim();
        }
    }

    // Check title attribute
    const title = element.getAttribute('title');
    if (title) {
        return title;
    }

    // Check text content for buttons and links
    if (element.tagName === 'BUTTON' || element.tagName === 'A') {
        return element.textContent.trim();
    }

    return '';
}

/**
 * Ensure sufficient color contrast
 * @param {string} foreground - Foreground color hex
 * @param {string} background - Background color hex
 * @returns {boolean} True if contrast is sufficient (WCAG AA)
 */
export function hasSufficientContrast(foreground, background) {
    // Convert hex to RGB
    const f = hexToRgb(foreground);
    const b = hexToRgb(background);

    if (!f || !b) {
        return false;
    }

    // Calculate relative luminance
    const lumF = getLuminance(f.r, f.g, f.b);
    const lumB = getLuminance(b.r, b.g, b.b);

    // Calculate contrast ratio
    const ratio = (Math.max(lumF, lumB) + 0.05) / (Math.min(lumF, lumB) + 0.05);

    // WCAG AA requires at least 4.5:1 for normal text
    return ratio >= 4.5;
}

/**
 * Convert hex color to RGB
 * @private
 * @param {string} hex - Hex color code
 * @returns {Object|null} RGB object or null
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
}

/**
 * Calculate relative luminance
 * @private
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} Luminance (0-1)
 */
function getLuminance(r, g, b) {
    const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Add keyboard shortcut hint
 * @param {HTMLElement} element - Element to add hint to
 * @param {string} shortcut - Keyboard shortcut (e.g., "Ctrl+K")
 */
export function addKeyboardShortcutHint(element, shortcut) {
    if (!element || !(element instanceof HTMLElement)) {
        return;
    }

    element.setAttribute('aria-keyshortcuts', shortcut);
}

/**
 * Create skip link
 * @returns {HTMLElement} Skip link element
 */
export function createSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    skipLink.addEventListener('click', (e) => {
        e.preventDefault();
        skipToMain();
    });
    return skipLink;
}

/**
 * Initialize skip link
 */
export function initSkipLink() {
    const existing = document.querySelector('.skip-link');
    if (existing) return;

    const skipLink = createSkipLink();
    document.body.insertBefore(skipLink, document.body.firstChild);
}

/**
 * Set page title with ARIA label
 * @param {string} title - Page title
 */
export function setPageTitle(title) {
    if (typeof title !== 'string') {
        return;
    }

    document.title = title;

    // Update aria-label on body
    document.body.setAttribute('aria-label', title);
}

/**
 * Announce page load
 * @param {string} pageTitle - Page title
 */
export function announcePageLoad(pageTitle) {
    const message = `Page loaded: ${pageTitle || document.title}`;
    a11yAnnounce(message);
}

/**
 * Create focus ring style
 * @returns {HTMLStyleElement} Style element
 */
export function createFocusRingStyle() {
    const style = document.createElement('style');
    style.textContent = `
        *:focus-visible {
            outline: 2px solid #4c6fff;
            outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
            *:focus-visible {
                transition: none !important;
            }
        }
    `;
    return style;
}

// Initialize accessibility features on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initSkipLink();
    });
} else {
    initSkipLink();
}
