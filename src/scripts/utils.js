/**
 * Forgotten Clipboard - Utility Helpers
 * Formatting, timestamps, truncation, IDs, and helpers.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Utils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Generates a unique, collision-resistant identifier
   * @returns {string}
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    const rnd = Math.random().toString(36).substring(2, 10);
    return `item_${Date.now()}_${rnd}`;
  }

  /**
   * Formats a timestamp into a human-readable relative string
   * e.g., "Just now", "4m ago", "2h ago", "Yesterday", "Oct 14"
   * @param {number} timestamp - epoch milliseconds
   * @returns {string}
   */
  function formatRelativeTime(timestamp) {
    if (!timestamp || typeof timestamp !== 'number') return '';
    const now = Date.now();
    const diff = Math.max(0, now - timestamp);

    const seconds = Math.floor(diff / 1000);
    if (seconds < 45) return 'Just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;

    const date = new Date(timestamp);
    const currentYear = new Date().getFullYear();
    const options = {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() !== currentYear && { year: 'numeric' })
    };
    return date.toLocaleDateString(undefined, options);
  }

  /**
   * Formats a timestamp into full date and time string for tooltips and detailed views
   * @param {number} timestamp
   * @returns {string}
   */
  function formatDateTime(timestamp) {
    if (!timestamp || typeof timestamp !== 'number') return '';
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Truncates text for card preview while preserving readability
   * Returns preview text and indicator if truncated
   * @param {string} text
   * @param {number} maxChars - max character limit (default 260)
   * @param {number} maxLines - max line limit (default 4)
   * @returns {{ text: string, isTruncated: boolean, totalLines: number, totalChars: number }}
   */
  function truncatePreview(text, maxChars = 260, maxLines = 4) {
    if (!text || typeof text !== 'string') {
      return { text: '', isTruncated: false, totalLines: 0, totalChars: 0 };
    }

    const totalChars = text.length;
    const lines = text.split('\n');
    const totalLines = lines.length;

    let isTruncated = false;
    let previewLines = lines;

    if (lines.length > maxLines) {
      previewLines = lines.slice(0, maxLines);
      isTruncated = true;
    }

    let joined = previewLines.join('\n');

    if (joined.length > maxChars) {
      joined = joined.slice(0, maxChars).trimEnd() + '...';
      isTruncated = true;
    } else if (isTruncated) {
      joined = joined.trimEnd() + '...';
    }

    return {
      text: joined,
      isTruncated,
      totalLines,
      totalChars
    };
  }

  /**
   * Standard debounce function for search input
   * @param {Function} func
   * @param {number} wait
   * @returns {Function}
   */
  function debounce(func, wait = 150) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Sanitizes tag name (alphanumeric, dashes, lowercase, max 24 chars)
   * @param {string} rawTag
   * @returns {string}
   */
  function sanitizeTag(rawTag) {
    if (!rawTag || typeof rawTag !== 'string') return '';
    return rawTag
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 24);
  }

  /**
   * Returns human-friendly metadata label for types
   * @param {string} type
   * @returns {{ label: string, icon: string, color: string }}
   */
  function getTypeMetadata(type) {
    switch (type) {
      case 'link':
        return { label: 'Link', icon: 'link', color: 'var(--type-link)' };
      case 'email':
        return { label: 'Email', icon: 'mail', color: 'var(--type-email)' };
      case 'code':
        return { label: 'Code', icon: 'code', color: 'var(--type-code)' };
      case 'text':
      default:
        return { label: 'Text', icon: 'file-text', color: 'var(--type-text)' };
    }
  }

  return {
    generateId,
    formatRelativeTime,
    formatDateTime,
    truncatePreview,
    debounce,
    sanitizeTag,
    getTypeMetadata
  };
});
