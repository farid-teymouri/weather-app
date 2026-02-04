/**
 * SearchManager Class
 * Handles location search with autocomplete and debouncing
 * Manages search UI and user interactions
 *
 * @class SearchManager
 */
export class SearchManager {
    constructor(weatherService) {
        this.weatherService = weatherService;
        this.searchInput = document.getElementById('location-search');
        this.searchClearBtn = document.getElementById('search-clear');
        this.autocompleteContainer = null;
        this.searchTimeout = null;
        this.DEBOUNCE_DELAY = 300; // milliseconds
        this.MAX_RESULTS = 5;

        this._initialize();
    }

    /**
     * Initialize search functionality
     * @private
     */
    _initialize() {
        if (!this.searchInput) {
            console.warn('[SearchManager] Search input not found');
            return;
        }

        // Create autocomplete container
        this._createAutocompleteContainer();

        // Setup event listeners
        this._setupEventListeners();
    }

    /**
     * Create autocomplete dropdown container
     * @private
     */
    _createAutocompleteContainer() {
        this.autocompleteContainer = document.createElement('div');
        this.autocompleteContainer.className = 'autocomplete-container';
        this.autocompleteContainer.setAttribute('role', 'listbox');
        this.autocompleteContainer.setAttribute('aria-label', 'Search suggestions');
        this.autocompleteContainer.style.display = 'none';

        this.searchInput.parentNode.appendChild(this.autocompleteContainer);
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        // Input event with debouncing
        this.searchInput.addEventListener('input', (e) => this._handleInput(e));

        // Keydown events for keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => this._handleKeyDown(e));

        // Focus and blur events
        this.searchInput.addEventListener('focus', () => this._handleFocus());
        this.searchInput.addEventListener('blur', (e) => this._handleBlur(e));

        // Clear button
        if (this.searchClearBtn) {
            this.searchClearBtn.addEventListener('click', () => this._clearSearch());
        }
    }

    /**
     * Handle input event with debouncing
     * @private
     * @param {Event} event - Input event
     */
    _handleInput(event) {
        const query = event.target.value.trim();

        // Show/hide clear button
        this._updateClearButton(query);

        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Clear autocomplete if query is empty
        if (query.length === 0) {
            this._hideAutocomplete();
            return;
        }

        // Don't search if query is too short
        if (query.length < 2) {
            return;
        }

        // Debounce search
        this.searchTimeout = setTimeout(() => {
            this._performSearch(query);
        }, this.DEBOUNCE_DELAY);
    }

    /**
     * Perform search with autocomplete
     * @private
     * @param {string} query - Search query
     */
    async _performSearch(query) {
        try {
            // ✅ Show loading indicator in search input
            this.searchInput.classList.add('search-loading');

            const results = await this.weatherService.searchLocations(query);
            this._showAutocomplete(results);
        } catch (error) {
            console.error('[SearchManager] Search failed:', error);
            this._hideAutocomplete();
        } finally {
            // ✅ Remove loading indicator
            this.searchInput.classList.remove('search-loading');
        }
    }
    // In SearchManager class, update _showAutocomplete method
    _showAutocomplete(results) {
        if (!this.autocompleteContainer) {
            console.warn('[SearchManager] Autocomplete container not found');
            return;
        }

        // Clear existing results
        this.autocompleteContainer.innerHTML = '';

        // Hide if no results or empty query
        if (!results || results.length === 0) {
            this._hideAutocomplete();
            return;
        }

        // Create results list
        const resultsList = document.createElement('div');
        resultsList.className = 'search-results';
        resultsList.setAttribute('role', 'listbox');
        resultsList.setAttribute('aria-label', 'Search results');

        // Add results
        results.forEach((result, index) => {
            const item = document.createElement('button');
            item.className = 'search-result-item';
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', 'false');
            item.setAttribute('data-index', index);

            // Build location text (handle missing state)
            const locationText = result.state
                ? `${result.name}, ${result.state}, ${result.country}`
                : `${result.name}, ${result.country}`;

            item.innerHTML = `
            <div class="result-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </div>
            <div class="result-text">
                <div class="result-name">${this._escapeHtml(result.name)}</div>
                <div class="result-subtitle">${this._escapeHtml(locationText)}</div>
            </div>
        `;

            item.addEventListener('click', (e) => {
                e.preventDefault();
                this._selectResult(result);
            });

            resultsList.appendChild(item);
        });

        // Add to container
        this.autocompleteContainer.appendChild(resultsList);
        this.autocompleteContainer.style.display = 'block';

        // Add keyboard navigation
        this._setupKeyboardNav(results);

        console.log(`[SearchManager] Showing ${results.length} autocomplete results`);
    }

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
     * Create autocomplete item element
     * @private
     * @param {Object} result - Search result
     * @param {number} index - Item index
     * @returns {HTMLElement} Autocomplete item
     */
    _createAutocompleteItem(result, index) {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', 'false');
        item.setAttribute('data-index', index);

        const locationText = result.state
            ? `${result.name}, ${result.state}, ${result.country}`
            : `${result.name}, ${result.country}`;

        item.innerHTML = `
            <div class="autocomplete-item-content">
                <svg class="autocomplete-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                </svg>
                <span class="autocomplete-location">${locationText}</span>
            </div>
        `;

        // Click handler
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            this._selectResult(result);
        });

        return item;
    }

    /**
     * Select search result
     * @private
     * @param {Object} result - Selected result
     */
    _selectResult(result) {
        // Dispatch custom event
        const event = new CustomEvent('search:select', {
            detail: result,
            bubbles: true,
            cancelable: true,
        });

        this.searchInput.dispatchEvent(event);

        // Clear search
        this._clearSearch();
    }

    /**
     * Hide autocomplete dropdown
     * @private
     */
    _hideAutocomplete() {
        if (this.autocompleteContainer) {
            this.autocompleteContainer.style.display = 'none';
            this.autocompleteContainer.setAttribute('aria-expanded', 'false');
            this.autocompleteContainer.innerHTML = '';
        }
    }

    /**
     * Handle keydown events
     * @private
     * @param {KeyboardEvent} event - Keyboard event
     */
    _handleKeyDown(event) {
        const key = event.key;

        // Escape key - clear search and hide autocomplete
        if (key === 'Escape') {
            this._clearSearch();
            event.preventDefault();
        }

        // Enter key - select first result or search
        if (key === 'Enter' && this.searchInput.value.trim().length > 0) {
            if (this.autocompleteContainer.style.display !== 'none') {
                const firstItem = this.autocompleteContainer.querySelector('.autocomplete-item');
                if (firstItem) {
                    firstItem.click();
                }
            }
            event.preventDefault();
        }

        // Arrow keys for navigation
        if (key === 'ArrowDown' || key === 'ArrowUp') {
            this._navigateResults(key === 'ArrowDown');
            event.preventDefault();
        }
    }

    /**
     * Navigate through autocomplete results
     * @private
     * @param {boolean} down - True for down, false for up
     */
    _navigateResults(down) {
        const items = this.autocompleteContainer.querySelectorAll('.autocomplete-item');
        if (items.length === 0) return;

        // Find currently selected item
        const selectedItem = this.autocompleteContainer.querySelector('[aria-selected="true"]');
        let nextIndex = 0;

        if (selectedItem) {
            const currentIndex = parseInt(selectedItem.getAttribute('data-index'));
            items.forEach((item) => item.setAttribute('aria-selected', 'false'));

            if (down) {
                nextIndex = (currentIndex + 1) % items.length;
            } else {
                nextIndex = (currentIndex - 1 + items.length) % items.length;
            }
        }

        // Select next item
        const nextItem = items[nextIndex];
        if (nextItem) {
            nextItem.setAttribute('aria-selected', 'true');
            nextItem.scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Handle focus event
     * @private
     */
    _handleFocus() {
        // Show autocomplete if there are results
        if (this.searchInput.value.trim().length > 0 && this.autocompleteContainer.innerHTML) {
            this.autocompleteContainer.style.display = 'block';
        }
    }

    /**
     * Handle blur event
     * @private
     * @param {FocusEvent} event - Focus event
     */
    _handleBlur(event) {
        // Hide autocomplete after brief delay to allow click events
        setTimeout(() => {
            if (!this.autocompleteContainer.contains(document.activeElement)) {
                this._hideAutocomplete();
            }
        }, 200);
    }

    /**
     * Clear search input
     * @private
     */
    _clearSearch() {
        this.searchInput.value = '';
        this._updateClearButton('');
        this._hideAutocomplete();
        this.searchInput.focus();
    }

    /**
     * Update clear button visibility
     * @private
     * @param {string} query - Current query
     */
    _updateClearButton(query) {
        if (this.searchClearBtn) {
            this.searchClearBtn.style.display = query.length > 0 ? 'block' : 'none';
        }
    }

    /**
     * Focus search input
     */
    focus() {
        if (this.searchInput) {
            this.searchInput.focus();
        }
    }

    /**
     * Get current search value
     * @returns {string} Current search value
     */
    getValue() {
        return this.searchInput ? this.searchInput.value.trim() : '';
    }

    /**
     * Set search value
     * @param {string} value - Value to set
     */
    setValue(value) {
        if (this.searchInput) {
            this.searchInput.value = value;
            this._updateClearButton(value);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        if (this.autocompleteContainer && this.autocompleteContainer.parentNode) {
            this.autocompleteContainer.parentNode.removeChild(this.autocompleteContainer);
        }
    }
}
