/**
 * Forgotten Clipboard - Storage Layer
 * Manages persistent storage with chrome.storage.local, limits, deduplication,
 * backup export/import validation, and test mock support.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const Classifier = require('./classifier.js');
    const Utils = require('./utils.js');
    module.exports = factory(Classifier, Utils);
  } else {
    root.StorageManager = factory(root.Classifier, root.Utils);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Classifier, Utils) {
  'use strict';

  const STORAGE_KEYS = {
    HISTORY: 'clipboard_history',
    SETTINGS: 'clipboard_settings'
  };

  const DEFAULT_SETTINGS = {
    historyLimit: 500,
    theme: 'system', // 'system' | 'light' | 'dark'
    defaultFilter: 'all',
    autoTrimWhitespace: true
  };

  /**
   * Internal storage adapter to allow mock backend during unit tests or chrome.storage.local in browser
   */
  class StorageAdapter {
    constructor(customBackend = null) {
      this.backend = customBackend;
    }

    async get(keys) {
      if (this.backend) {
        return this.backend.get(keys);
      }
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return await chrome.storage.local.get(keys);
      }
      // In-memory fallback
      if (!this._memory) this._memory = {};
      const res = {};
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const k of keyList) {
        res[k] = this._memory[k];
      }
      return res;
    }

    async set(items) {
      if (this.backend) {
        return this.backend.set(items);
      }
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return await chrome.storage.local.set(items);
      }
      if (!this._memory) this._memory = {};
      Object.assign(this._memory, items);
    }

    async remove(keys) {
      if (this.backend) {
        return this.backend.remove(keys);
      }
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return await chrome.storage.local.remove(keys);
      }
      if (!this._memory) this._memory = {};
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const k of keyList) {
        delete this._memory[k];
      }
    }
  }

  class StorageService {
    constructor(customBackend = null) {
      this.adapter = new StorageAdapter(customBackend);
    }

    /**
     * Retrieves application settings
     * @returns {Promise<Object>}
     */
    async getSettings() {
      try {
        const data = await this.adapter.get(STORAGE_KEYS.SETTINGS);
        return { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEYS.SETTINGS] || {}) };
      } catch (err) {
        return { ...DEFAULT_SETTINGS };
      }
    }

    /**
     * Updates application settings
     * @param {Object} partialSettings
     * @returns {Promise<Object>} Updated settings
     */
    async updateSettings(partialSettings) {
      const current = await this.getSettings();
      const updated = { ...current, ...partialSettings };

      // Validate limit
      if (typeof updated.historyLimit === 'number') {
        updated.historyLimit = Math.max(1, Math.min(5000, Math.round(updated.historyLimit)));
      }

      await this.adapter.set({ [STORAGE_KEYS.SETTINGS]: updated });
      return updated;
    }

    /**
     * Retrieves all history items
     * @returns {Promise<Array<Object>>}
     */
    async getHistory() {
      try {
        const data = await this.adapter.get(STORAGE_KEYS.HISTORY);
        const list = data[STORAGE_KEYS.HISTORY];
        if (Array.isArray(list)) {
          return list;
        }
        return [];
      } catch (err) {
        return [];
      }
    }

    /**
     * Adds a new item to clipboard history
     * - Checks for empty text
     * - Prevents consecutive duplicate
     * - Classifies content
     * - Enforces history limit
     * @param {string} text
     * @param {Object} [options]
     * @returns {Promise<{ success: boolean, item?: Object, duplicate?: boolean, error?: string }>}
     */
    async addItem(text, options = {}) {
      if (typeof text !== 'string') {
        return { success: false, error: 'Text must be a valid string.' };
      }

      const settings = await this.getSettings();
      const processedText = settings.autoTrimWhitespace ? text.trim() : text;

      if (!processedText || processedText.length === 0) {
        return { success: false, error: 'Cannot save empty clipboard content.' };
      }

      const history = await this.getHistory();

      // Check consecutive duplicate (compare with the most recent item)
      if (history.length > 0) {
        const mostRecent = history[0];
        if (mostRecent && mostRecent.text.trim() === processedText.trim()) {
          // Update timestamp of existing item to bring it to top without creating duplicate
          mostRecent.timestamp = Date.now();
          await this.adapter.set({ [STORAGE_KEYS.HISTORY]: history });
          return { success: true, item: mostRecent, duplicate: true };
        }
      }

      // Content classification
      const classification = Classifier.classifySnippet(processedText);

      // Construct item
      const newItem = {
        id: options.id || Utils.generateId(),
        text: processedText,
        type: classification.type,
        timestamp: options.timestamp || Date.now(),
        favorite: Boolean(options.favorite),
        tags: Array.isArray(options.tags) ? options.tags.map(Utils.sanitizeTag).filter(Boolean) : []
      };

      // Add to front of history
      history.unshift(newItem);

      // Enforce history limit: preserve favorites if pruning is needed
      const limit = settings.historyLimit || DEFAULT_SETTINGS.historyLimit;
      if (history.length > limit) {
        // First try to prune non-favorites starting from the oldest
        let pruned = [];
        let nonFavsRemoved = 0;
        const excess = history.length - limit;

        for (let i = history.length - 1; i >= 0 && nonFavsRemoved < excess; i--) {
          if (!history[i].favorite) {
            history.splice(i, 1);
            nonFavsRemoved++;
          }
        }

        // If still over limit (because almost all are favorites), slice to limit
        if (history.length > limit) {
          history.length = limit;
        }
      }

      await this.adapter.set({ [STORAGE_KEYS.HISTORY]: history });
      return { success: true, item: newItem, duplicate: false };
    }

    /**
     * Updates an existing item's properties (favorite, tags)
     * @param {string} id
     * @param {Object} updates
     * @returns {Promise<{ success: boolean, item?: Object, error?: string }>}
     */
    async updateItem(id, updates = {}) {
      if (!id) return { success: false, error: 'Item ID is required.' };

      const history = await this.getHistory();
      const index = history.findIndex(item => item.id === id);

      if (index === -1) {
        return { success: false, error: 'Item not found.' };
      }

      const item = history[index];

      if (typeof updates.favorite === 'boolean') {
        item.favorite = updates.favorite;
      }

      if (Array.isArray(updates.tags)) {
        item.tags = Array.from(new Set(updates.tags.map(Utils.sanitizeTag).filter(Boolean)));
      }

      if (typeof updates.text === 'string' && updates.text.trim().length > 0) {
        item.text = updates.text.trim();
        const classification = Classifier.classifySnippet(item.text);
        item.type = classification.type;
      }

      await this.adapter.set({ [STORAGE_KEYS.HISTORY]: history });
      return { success: true, item };
    }

    /**
     * Deletes a single item by ID
     * @param {string} id
     * @returns {Promise<{ success: boolean }>}
     */
    async deleteItem(id) {
      if (!id) return { success: false };
      const history = await this.getHistory();
      const filtered = history.filter(item => item.id !== id);

      if (filtered.length !== history.length) {
        await this.adapter.set({ [STORAGE_KEYS.HISTORY]: filtered });
        return { success: true };
      }
      return { success: false };
    }

    /**
     * Clears all history entries
     * @param {boolean} [preserveFavorites=false]
     * @returns {Promise<{ success: boolean, clearedCount: number }>}
     */
    async clearHistory(preserveFavorites = false) {
      const history = await this.getHistory();
      const initialCount = history.length;

      let remaining = [];
      if (preserveFavorites) {
        remaining = history.filter(item => item.favorite);
      }

      await this.adapter.set({ [STORAGE_KEYS.HISTORY]: remaining });
      return {
        success: true,
        clearedCount: initialCount - remaining.length
      };
    }

    /**
     * Exports full dataset as structured JSON backup
     * @returns {Promise<string>}
     */
    async exportBackup() {
      const history = await this.getHistory();
      const settings = await this.getSettings();

      const backup = {
        app: 'Forgotten Clipboard',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        settings,
        history
      };

      return JSON.stringify(backup, null, 2);
    }

    /**
     * Validates and imports JSON backup data safely
     * Handles schema validation, malformed data, and prevents data loss.
     * @param {string|Object} jsonInput
     * @param {Object} [options]
     * @param {'merge'|'replace'} [options.mode='merge']
     * @returns {Promise<{ success: boolean, importedCount: number, error?: string }>}
     */
    async importBackup(jsonInput, options = { mode: 'merge' }) {
      let parsed;
      try {
        parsed = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
      } catch (err) {
        return { success: false, importedCount: 0, error: 'Invalid JSON format: parsing failed.' };
      }

      if (!parsed || typeof parsed !== 'object') {
        return { success: false, importedCount: 0, error: 'Imported data must be an object.' };
      }

      // Check for history array
      let rawItems = [];
      if (Array.isArray(parsed.history)) {
        rawItems = parsed.history;
      } else if (Array.isArray(parsed)) {
        // Direct array of items fallback
        rawItems = parsed;
      } else {
        return { success: false, importedCount: 0, error: 'Backup does not contain a valid history list.' };
      }

      // Validate and sanitize each item
      const validItems = [];
      for (const item of rawItems) {
        if (!item || typeof item !== 'object') continue;
        if (typeof item.text !== 'string' || item.text.trim().length === 0) continue;

        const sanitizedText = item.text.trim();
        const detected = Classifier.classifySnippet(sanitizedText);
        const validItem = {
          id: typeof item.id === 'string' && item.id.length > 0 ? item.id : Utils.generateId(),
          text: sanitizedText,
          type: ['link', 'email', 'code', 'text'].includes(item.type) ? item.type : detected.type,
          timestamp: typeof item.timestamp === 'number' && item.timestamp > 0 ? item.timestamp : Date.now(),
          favorite: Boolean(item.favorite),
          tags: Array.isArray(item.tags) ? item.tags.map(Utils.sanitizeTag).filter(Boolean) : []
        };
        validItems.push(validItem);
      }

      if (validItems.length === 0) {
        return { success: false, importedCount: 0, error: 'No valid clipboard snippets found in backup.' };
      }

      const settings = await this.getSettings();
      let combinedHistory = [];

      if (options.mode === 'replace') {
        combinedHistory = validItems;
      } else {
        // Merge: avoid exact text duplicates with existing history
        const currentHistory = await this.getHistory();
        const existingTexts = new Set(currentHistory.map(i => i.text.trim()));

        combinedHistory = [...currentHistory];
        let addedCount = 0;

        for (const item of validItems) {
          if (!existingTexts.has(item.text.trim())) {
            combinedHistory.push(item);
            existingTexts.add(item.text.trim());
            addedCount++;
          }
        }

        // Sort merged history by timestamp descending
        combinedHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }

      // Limit check
      const limit = settings.historyLimit || DEFAULT_SETTINGS.historyLimit;
      if (combinedHistory.length > limit) {
        combinedHistory.length = limit;
      }

      await this.adapter.set({ [STORAGE_KEYS.HISTORY]: combinedHistory });

      // Optional settings import if present and valid
      if (parsed.settings && typeof parsed.settings === 'object') {
        const cleanSettings = {};
        if (typeof parsed.settings.historyLimit === 'number') {
          cleanSettings.historyLimit = parsed.settings.historyLimit;
        }
        if (['system', 'light', 'dark'].includes(parsed.settings.theme)) {
          cleanSettings.theme = parsed.settings.theme;
        }
        if (['all', 'link', 'email', 'code', 'text', 'favorites'].includes(parsed.settings.defaultFilter)) {
          cleanSettings.defaultFilter = parsed.settings.defaultFilter;
        }
        await this.updateSettings(cleanSettings);
      }

      return {
        success: true,
        importedCount: validItems.length
      };
    }
  }

  return {
    StorageService,
    STORAGE_KEYS,
    DEFAULT_SETTINGS
  };
});
