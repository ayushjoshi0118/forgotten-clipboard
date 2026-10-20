/**
 * Forgotten Clipboard - Search & Filter Engine
 * Fast case-insensitive keyword search with category and tag filtering.
 * Modular architecture ready for future semantic/embedding search extensions.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Search = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Base Keyword Search Provider
   */
  class KeywordSearchEngine {
    constructor() {
      this.name = 'keyword';
    }

    /**
     * Filters and scores items based on query and filter parameters
     * @param {Array<Object>} items - Array of clipboard items
     * @param {Object} options - Search options
     * @param {string} [options.query=''] - Search term
     * @param {string} [options.filter='all'] - 'all' | 'link' | 'email' | 'code' | 'text' | 'favorites'
     * @param {string} [options.tag=''] - Specific tag filter
     * @param {string} [options.sortBy='newest'] - 'newest' | 'oldest' | 'length'
     * @returns {Array<Object>} Filtered and sorted items
     */
    search(items, options = {}) {
      if (!Array.isArray(items)) return [];

      const query = (options.query || '').trim().toLowerCase();
      const filter = (options.filter || 'all').toLowerCase();
      const tagFilter = (options.tag || '').trim().toLowerCase();
      const sortBy = options.sortBy || 'newest';

      // 1. Filter by category, favorites, or tag
      let results = items.filter(item => {
        if (!item || typeof item.text !== 'string') return false;

        // Category / Favorite filter
        if (filter === 'favorites') {
          if (!item.favorite) return false;
        } else if (filter !== 'all') {
          if (item.type !== filter) return false;
        }

        // Tag filter
        if (tagFilter) {
          if (!Array.isArray(item.tags)) return false;
          const hasTag = item.tags.some(t => t.toLowerCase() === tagFilter);
          if (!hasTag) return false;
        }

        return true;
      });

      // 2. Query search
      if (query.length > 0) {
        // Query terms split by space (all terms must match, like Google search)
        const terms = query.split(/\s+/).filter(t => t.length > 0);

        results = results.filter(item => {
          const itemText = item.text.toLowerCase();
          const itemType = (item.type || '').toLowerCase();
          const itemTags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';

          // All terms must be found in text, type, or tags
          return terms.every(term => {
            return (
              itemText.includes(term) ||
              itemType.includes(term) ||
              itemTags.includes(term)
            );
          });
        });

        // Score results: exact matches and matches at start of text score higher
        results = results.map(item => {
          let score = 0;
          const itemText = item.text.toLowerCase();

          // Full exact phrase bonus
          if (itemText.includes(query)) {
            score += 10;
            if (itemText.startsWith(query)) score += 15;
          }

          // Exact tag match bonus
          if (Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase() === query)) {
            score += 20;
          }

          // Type match
          if (item.type === query) score += 5;

          // Favorite bonus
          if (item.favorite) score += 2;

          return { item, score };
        });

        // Sort by score first, then timestamp
        results.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return (b.item.timestamp || 0) - (a.item.timestamp || 0);
        });

        results = results.map(r => r.item);
      } else {
        // Sort non-queried items
        results = this.sortItems(results, sortBy);
      }

      return results;
    }

    /**
     * Sorts items according to criteria
     * @param {Array<Object>} items
     * @param {string} sortBy
     * @returns {Array<Object>}
     */
    sortItems(items, sortBy) {
      const copy = [...items];
      switch (sortBy) {
        case 'oldest':
          return copy.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        case 'length':
          return copy.sort((a, b) => (b.text || '').length - (a.text || '').length);
        case 'newest':
        default:
          return copy.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }
    }
  }

  /**
   * Facade Search Manager
   * Allows registering alternative search providers (e.g. semantic/vector search in future)
   */
  class SearchManager {
    constructor() {
      this.engine = new KeywordSearchEngine();
    }

    /**
     * Switch search provider
     * @param {Object} engineInstance
     */
    setEngine(engineInstance) {
      if (engineInstance && typeof engineInstance.search === 'function') {
        this.engine = engineInstance;
      }
    }

    /**
     * Search items
     */
    search(items, options) {
      return this.engine.search(items, options);
    }
  }

  const defaultManager = new SearchManager();

  return {
    KeywordSearchEngine,
    SearchManager,
    search: (items, options) => defaultManager.search(items, options)
  };
});
