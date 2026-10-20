/**
 * Forgotten Clipboard - Background Service Worker (Manifest V3)
 * Handles context menus, lifecycle events, and badge feedback.
 */

try {
  importScripts('../scripts/classifier.js', '../scripts/utils.js', '../scripts/storage.js');
} catch (err) {
  // Fallback if imported in different context
}

const storageService = new StorageManager.StorageService();

/**
 * Initialize on extension installation or update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  // Initialize default settings if not already present
  const currentSettings = await storageService.getSettings();
  await storageService.updateSettings(currentSettings);

  // Set up context menu for saving selected text
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'fc-save-selection',
      title: 'Save to Forgotten Clipboard',
      contexts: ['selection']
    });
  });

  // Set badge background color
  if (chrome.action && chrome.action.setBadgeBackgroundColor) {
    chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' });
  }
});

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'fc-save-selection' && info.selectionText) {
    const textToSave = info.selectionText.trim();
    if (textToSave.length > 0) {
      const result = await storageService.addItem(textToSave);
      if (result.success) {
        showBadgeFeedback(result.duplicate ? 'EXISTS' : '+1');
      }
    }
  }
});

/**
 * Handle keyboard command shortcut
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-history-page') {
    chrome.runtime.openOptionsPage();
  }
});

/**
 * Show temporary badge feedback on the extension icon
 * @param {string} text
 */
function showBadgeFeedback(text) {
  if (!chrome.action || !chrome.action.setBadgeText) return;

  chrome.action.setBadgeText({ text });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 2200);
}

/**
 * Listen for messages from popup or history page if needed
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveText' && message.text) {
    (async () => {
      const res = await storageService.addItem(message.text, message.options || {});
      sendResponse(res);
    })();
    return true; // Keep message channel open for async response
  }

  if (message.action === 'openFullHistory') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }
});
