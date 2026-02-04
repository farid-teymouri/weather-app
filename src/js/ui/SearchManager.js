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
            // Show loading indicator
            if (this.searchInput) {
                this.searchInput.classList.add('loading');
            }

            console.log('[SearchManager] 🔍 Searching for:', query);
            const results = await this.weatherService.searchLocations(query);
            console.log('[SearchManager] ✅ Received', results.length, 'results from API');

            this._showAutocomplete(results);
        } catch (error) {
            console.error('[SearchManager] ❌ Search failed:', error);
            this._hideAutocomplete();
        } finally {
            // Remove loading indicator
            if (this.searchInput) {
                this.searchInput.classList.remove('loading');
            }
        }
    }
    // In SearchManager class, update _showAutocomplete method
    _showAutocomplete(results) {
        // ✅ CRITICAL DEBUG LOGS
        console.log('[SearchManager] Rendering autocomplete with', results?.length || 0, 'results');

        if (!this.autocompleteContainer) {
            console.error('[SearchManager] ❌ FATAL: #search-autocomplete container NOT FOUND in DOM!');
            console.error(
                '[SearchManager] Check: 1) HTML has id="search-autocomplete" 2) SearchManager initialized after DOM ready'
            );
            return;
        }

        // Clear previous results
        this.autocompleteContainer.innerHTML = '';

        // Hide if no valid results
        if (!results || !Array.isArray(results) || results.length === 0) {
            console.log('[SearchManager] No results to display, hiding autocomplete');
            this._hideAutocomplete();
            return;
        }

        // Create results container
        const resultsList = document.createElement('div');
        resultsList.className = 'search-results';
        resultsList.setAttribute('role', 'listbox');
        resultsList.setAttribute('aria-label', `Search results (${results.length} locations)`);

        // Render each result
        results.forEach((result, index) => {
            const item = document.createElement('button');
            item.className = 'search-result-item';
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', 'false');
            item.setAttribute('data-index', index);
            item.setAttribute('type', 'button');

            // Build location text
            const locationText = result.state
                ? `${result.name}, ${result.state}, ${result.country}`
                : `${result.name}, ${result.country}`;

            item.innerHTML = `
            <div class="result-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </div>
            <div class="result-text">
                <div class="result-name">${this._escapeHtml(result.name)}</div>
                <div class="result-subtitle">${this._escapeHtml(locationText)}</div>
            </div>
        `;

            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[SearchManager] Result clicked:', result.name);
                this._selectResult(result);
            });

            resultsList.appendChild(item);
        });

        // ✅ CRITICAL: Append to container BEFORE showing
        this.autocompleteContainer.appendChild(resultsList);

        // ✅ FORCE VISIBLE WITH ROBUST STYLES
        this.autocompleteContainer.style.display = 'block';
        this.autocompleteContainer.style.opacity = '1';
        this.autocompleteContainer.style.visibility = 'visible';
        this.autocompleteContainer.classList.add('show'); // Trigger CSS animation

        console.log('[SearchManager] ✅ Autocomplete VISIBLE. Container styles:', {
            display: this.autocompleteContainer.style.display,
            opacity: this.autocompleteContainer.style.opacity,
            classList: this.autocompleteContainer.className,
        });

        // Setup keyboard navigation
        const resultItems = this.autocompleteContainer.querySelectorAll('.search-result-item');
        console.log('[SearchManager] Found', resultItems.length, 'result items in DOM');

        if (resultItems.length > 0) {
            this._cleanupKeyboardNav();
            this._setupKeyboardNav(resultItems);
        } else {
            console.warn('[SearchManager] ⚠️ No .search-result-item elements found after rendering!');
        }
    }

    /**
     * Escape HTML to prevent XSS in search results
     * @param {string} str - Input string
     * @returns {string} Sanitized string
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
            this.autocompleteContainer.classList.remove('show');
            this._cleanupKeyboardNav();
            console.log('[SearchManager] Autocomplete hidden');
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
    } /**
     * Escape HTML special characters to prevent XSS
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
     * Setup keyboard navigation for autocomplete results
     * @param {NodeList} items - DOM elements of search results
     */
    _setupKeyboardNav(items) {
        if (!items || items.length === 0) return;

        let currentIndex = -1;
        const self = this;

        // Handle keydown events
        const handleKeydown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentIndex = (currentIndex + 1) % items.length;
                self._highlightItem(items, currentIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentIndex = (currentIndex - 1 + items.length) % items.length;
                self._highlightItem(items, currentIndex);
            } else if (e.key === 'Enter' && currentIndex >= 0) {
                e.preventDefault();
                items[currentIndex].click();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                self._hideAutocomplete();
                if (self.searchInput) self.searchInput.blur();
            }
        };

        // Add listeners
        if (this.searchInput) {
            this.searchInput.addEventListener('keydown', handleKeydown);
        }

        // Cleanup function
        const cleanup = () => {
            if (this.searchInput) {
                this.searchInput.removeEventListener('keydown', handleKeydown);
            }
            document.removeEventListener('click', handleClickOutside);
        };

        // Close on outside click
        const handleClickOutside = (e) => {
            const target = e.target;
            if (
                this.autocompleteContainer &&
                !this.autocompleteContainer.contains(target) &&
                this.searchInput &&
                !this.searchInput.contains(target)
            ) {
                cleanup();
                this._hideAutocomplete();
            }
        };

        document.addEventListener('click', handleClickOutside);

        // Highlight first item
        currentIndex = 0;
        this._highlightItem(items, currentIndex);

        // Store cleanup reference
        this._keyboardCleanup = cleanup;
    }

    /**
     * Highlight selected item in autocomplete list
     * @param {NodeList} items - Result items
     * @param {number} index - Index to highlight
     */
    _highlightItem(items, index) {
        items.forEach((item, i) => {
            if (i === index) {
                item.setAttribute('aria-selected', 'true');
                item.classList.add('highlighted');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.setAttribute('aria-selected', 'false');
                item.classList.remove('highlighted');
            }
        });
    }

    /**
     * Cleanup keyboard navigation listeners
     */
    _cleanupKeyboardNav() {
        if (this._keyboardCleanup) {
            this._keyboardCleanup();
            this._keyboardCleanup = null;
        }
    }
}
