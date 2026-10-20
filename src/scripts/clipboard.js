/**
 * Forgotten Clipboard - Clipboard Interaction Handler
 * Handles clipboard read and write with privacy protections and clear error states.
 * Note: Never logs clipboard text contents to console.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Clipboard = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Reads plain text from system clipboard using standard browser API.
   * Requires user gesture or active extension popup context.
   * @returns {Promise<{ success: boolean, text?: string, error?: string, code?: string }>}
   */
  async function readText() {
    if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
      return {
        success: false,
        error: 'Clipboard read API is not supported in this browser context.',
        code: 'NOT_SUPPORTED'
      };
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length === 0) {
        return {
          success: false,
          error: 'Clipboard is empty or contains non-text data (e.g. image, file).',
          code: 'EMPTY'
        };
      }
      return {
        success: true,
        text
      };
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        return {
          success: false,
          error: 'Clipboard permission was denied or window lost focus. Please click the button again or use manual paste.',
          code: 'PERMISSION_DENIED'
        };
      }
      return {
        success: false,
        error: `Could not read clipboard: ${err.message || 'Unknown error'}`,
        code: 'FAILED'
      };
    }
  }

  /**
   * Writes text to the system clipboard
   * @param {string} text
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async function writeText(text) {
    if (typeof text !== 'string') {
      return { success: false, error: 'Invalid text provided.' };
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return { success: true };
      } catch (err) {
        // Fall through to textarea fallback
      }
    }

    // ExecCommand fallback if writeText fails or is restricted
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        return { success: true };
      }
      return { success: false, error: 'Could not copy to clipboard.' };
    } catch (err) {
      return { success: false, error: err.message || 'Copy operation failed.' };
    }
  }

  return {
    readText,
    writeText
  };
});
