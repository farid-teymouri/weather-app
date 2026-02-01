/**
 * FavoritesManager Class
 * Manages favorite locations UI and interactions
 * Handles adding, removing, and displaying favorites
 *
 * @class FavoritesManager
 */
export class FavoritesManager {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.favoritesList = document.getElementById("favorites-list");
    this.favoritesToggle = document.getElementById("favorites-toggle");
    this.isExpanded = true;

    this._initialize();
  }

  /**
   * Initialize favorites functionality
   * @private
   */
  _initialize() {
    // Load and render favorites
    this._loadAndRenderFavorites();

    // Setup event listeners
    this._setupEventListeners();
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Favorites toggle button
    if (this.favoritesToggle) {
      this.favoritesToggle.addEventListener("click", () =>
        this.toggleFavorites(),
      );
    }

    // Favorites list - event delegation
    if (this.favoritesList) {
      this.favoritesList.addEventListener("click", (e) =>
        this._handleListClick(e),
      );
    }
  }

  /**
   * Handle click events on favorites list
   * @private
   * @param {Event} event - Click event
   */
  _handleListClick(event) {
    // Handle favorite item clicks
    const favoriteItem = event.target.closest(".favorite-item");
    if (favoriteItem) {
      const index = parseInt(favoriteItem.getAttribute("data-index"));
      const favorites = this.getFavorites();
      const favorite = favorites[index];

      if (favorite) {
        this._selectFavorite(favorite);
      }
      return;
    }

    // Handle remove button clicks
    const removeBtn = event.target.closest(".favorite-remove");
    if (removeBtn) {
      const favoriteItem = removeBtn.closest(".favorite-item");
      if (favoriteItem) {
        const index = parseInt(favoriteItem.getAttribute("data-index"));
        const favorites = this.getFavorites();
        const favorite = favorites[index];

        if (favorite) {
          this.removeFavorite(favorite);
        }
        event.stopPropagation();
      }
      return;
    }
  }

  /**
   * Select favorite location
   * @private
   * @param {Object} favorite - Favorite location
   */
  _selectFavorite(favorite) {
    // Dispatch custom event
    const event = new CustomEvent("favorite:select", {
      detail: favorite,
      bubbles: true,
      cancelable: true,
    });

    if (this.favoritesList) {
      this.favoritesList.dispatchEvent(event);
    }
  }

  /**
   * Load favorites from storage and render
   * @private
   */
  async _loadAndRenderFavorites() {
    try {
      const favorites = await this.storageManager.loadFavorites();
      this._renderFavorites(favorites);
    } catch (error) {
      console.error("[FavoritesManager] Error loading favorites:", error);
    }
  }

  /**
   * Render favorites list
   * @private
   * @param {Array} favorites - Array of favorites
   */
  _renderFavorites(favorites) {
    if (!this.favoritesList) return;

    // Clear list
    this.favoritesList.innerHTML = "";

    if (!favorites || favorites.length === 0) {
      this.favoritesList.innerHTML = `
                <p class="favorites-empty">
                    No favorites yet. Search for a location and press Ctrl+D to add it!
                </p>
            `;
      return;
    }

    // Render each favorite
    favorites.forEach((favorite, index) => {
      const item = this._createFavoriteItem(favorite, index);
      this.favoritesList.appendChild(item);
    });
  }

  /**
   * Create favorite item element
   * @private
   * @param {Object} favorite - Favorite location
   * @param {number} index - Item index
   * @returns {HTMLElement} Favorite item element
   */
  _createFavoriteItem(favorite, index) {
    const item = document.createElement("button");
    item.className = "favorite-item";
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `View weather for ${favorite.name}`);
    item.setAttribute("data-index", index);

    const locationText = favorite.state
      ? `${favorite.name}, ${favorite.state}, ${favorite.country}`
      : `${favorite.name}, ${favorite.country}`;

    item.innerHTML = `
            <div class="favorite-item-content">
                <svg class="favorite-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span class="favorite-location">${locationText}</span>
            </div>
            <button class="favorite-remove" aria-label="Remove ${favorite.name} from favorites">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
        `;

    return item;
  }

  /**
   * Get all favorites
   * @returns {Array} Array of favorite locations
   */
  async getFavorites() {
    try {
      return (await this.storageManager.loadFavorites()) || [];
    } catch (error) {
      console.error("[FavoritesManager] Error getting favorites:", error);
      return [];
    }
  }

  /**
   * Add favorite location
   * @param {Object} location - Location to add
   * @returns {Promise<boolean>} Success status
   */
  async addFavorite(location) {
    try {
      // Validate location
      if (!location || !location.name || !location.lat || !location.lon) {
        console.error("[FavoritesManager] Invalid location:", location);
        return false;
      }

      // Get existing favorites
      let favorites = (await this.storageManager.loadFavorites()) || [];

      // Check if already exists
      const exists = favorites.some(
        (fav) => fav.lat === location.lat && fav.lon === location.lon,
      );

      if (exists) {
        console.log("[FavoritesManager] Location already in favorites");
        return false;
      }

      // Add new favorite
      const newFavorite = {
        name: location.name,
        lat: parseFloat(location.lat),
        lon: parseFloat(location.lon),
        country: location.country || "",
        state: location.state || "",
        timestamp: Date.now(),
      };

      favorites.push(newFavorite);

      // Save to storage
      await this.storageManager.saveFavorites(favorites);

      // Re-render
      this._renderFavorites(favorites);

      return true;
    } catch (error) {
      console.error("[FavoritesManager] Error adding favorite:", error);
      return false;
    }
  }

  /**
   * Remove favorite location
   * @param {Object} location - Location to remove
   * @returns {Promise<boolean>} Success status
   */
  async removeFavorite(location) {
    try {
      // Get existing favorites
      let favorites = (await this.storageManager.loadFavorites()) || [];

      // Filter out the location to remove
      favorites = favorites.filter(
        (fav) => !(fav.lat === location.lat && fav.lon === location.lon),
      );

      // Save to storage
      await this.storageManager.saveFavorites(favorites);

      // Re-render
      this._renderFavorites(favorites);

      return true;
    } catch (error) {
      console.error("[FavoritesManager] Error removing favorite:", error);
      return false;
    }
  }

  /**
   * Clear all favorites
   * @returns {Promise<boolean>} Success status
   */
  async clearFavorites() {
    try {
      await this.storageManager.saveFavorites([]);
      this._renderFavorites([]);
      return true;
    } catch (error) {
      console.error("[FavoritesManager] Error clearing favorites:", error);
      return false;
    }
  }

  /**
   * Toggle favorites panel visibility
   */
  toggleFavorites() {
    this.isExpanded = !this.isExpanded;

    if (this.favoritesList) {
      this.favoritesList.style.display = this.isExpanded ? "block" : "none";
    }

    if (this.favoritesToggle) {
      const icon = this.favoritesToggle.querySelector("svg");
      if (icon) {
        icon.innerHTML = this.isExpanded
          ? '<path d="M7 14l5-5 5 5z"/>'
          : '<path d="M7 10l5 5 5-5z"/>';
      }
      this.favoritesToggle.setAttribute(
        "aria-expanded",
        this.isExpanded.toString(),
      );
    }
  }

  /**
   * Check if location is favorited
   * @param {Object} location - Location to check
   * @returns {Promise<boolean>} True if favorited
   */
  async isFavorite(location) {
    if (!location || !location.lat || !location.lon) {
      return false;
    }

    const favorites = await this.getFavorites();
    return favorites.some(
      (fav) => fav.lat === location.lat && fav.lon === location.lon,
    );
  }

  /**
   * Get favorite count
   * @returns {Promise<number>} Number of favorites
   */
  async getFavoriteCount() {
    const favorites = await this.getFavorites();
    return favorites.length;
  }

  /**
   * Cleanup
   */
  destroy() {
    // Remove event listeners if needed
  }
}
