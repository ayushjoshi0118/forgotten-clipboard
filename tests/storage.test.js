/**
 * Unit tests for Storage Layer
 * Run with: node --test tests/storage.test.js
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { StorageService } = require('../src/scripts/storage.js');

// Mock memory backend
function createMockBackend() {
  const store = {};
  return {
    async get(keys) {
      const res = {};
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const k of keyList) {
        res[k] = store[k] !== undefined ? JSON.parse(JSON.stringify(store[k])) : undefined;
      }
      return res;
    },
    async set(items) {
      for (const [k, v] of Object.entries(items)) {
        store[k] = JSON.parse(JSON.stringify(v));
      }
    },
    async remove(keys) {
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const k of keyList) {
        delete store[k];
      }
    }
  };
}

describe('Storage Layer', () => {
  let storage;

  beforeEach(() => {
    storage = new StorageService(createMockBackend());
  });

  test('Saving a plain-text snippet', async () => {
    const res = await storage.addItem('Hello World, this is my clipboard text.');
    assert.equal(res.success, true);
    assert.equal(res.duplicate, false);
    assert.equal(res.item.text, 'Hello World, this is my clipboard text.');
    assert.equal(res.item.type, 'text');

    const history = await storage.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].id, res.item.id);
  });

  test('Automatically classifies snippet type on save', async () => {
    const linkRes = await storage.addItem('https://antigravity.google.com');
    assert.equal(linkRes.item.type, 'link');

    const emailRes = await storage.addItem('team@antigravity.dev');
    assert.equal(emailRes.item.type, 'email');

    const codeRes = await storage.addItem('git status --short');
    assert.equal(codeRes.item.type, 'code');
  });

  test('Rejects empty or whitespace-only clipboard content', async () => {
    const emptyRes = await storage.addItem('');
    assert.equal(emptyRes.success, false);
    assert.match(emptyRes.error, /empty/i);

    const wsRes = await storage.addItem('    \n\t   ');
    assert.equal(wsRes.success, false);

    const history = await storage.getHistory();
    assert.equal(history.length, 0);
  });

  test('Prevents consecutive duplicates and refreshes timestamp', async () => {
    const first = await storage.addItem('Unique Note 1');
    assert.equal(first.duplicate, false);

    // Save exact same text consecutively
    const duplicate = await storage.addItem('Unique Note 1');
    assert.equal(duplicate.success, true);
    assert.equal(duplicate.duplicate, true);

    const history = await storage.getHistory();
    assert.equal(history.length, 1, 'Should not add a second item for consecutive duplicate');
  });

  test('Allows non-consecutive identical entries', async () => {
    await storage.addItem('First Item');
    await storage.addItem('Intervening Item');
    const third = await storage.addItem('First Item');

    assert.equal(third.duplicate, false);
    const history = await storage.getHistory();
    assert.equal(history.length, 3);
  });

  test('Enforces configurable history limit while preserving favorites', async () => {
    await storage.updateSettings({ historyLimit: 3 });

    // Add 1 favorite
    const favRes = await storage.addItem('Favorite Item', { favorite: true });

    // Add 3 regular items
    await storage.addItem('Item 1');
    await storage.addItem('Item 2');
    await storage.addItem('Item 3');

    const history = await storage.getHistory();
    assert.equal(history.length, 3, 'History length should strictly obey limit of 3');

    // Favorite item should still exist in history!
    const foundFav = history.find(i => i.id === favRes.item.id);
    assert.ok(foundFav, 'Favorite item should be preserved when pruning over limit');
  });

  test('Updates favorite status and tags on an item', async () => {
    const added = await storage.addItem('Item to update');
    assert.equal(added.item.favorite, false);

    // Toggle favorite
    const updatedFav = await storage.updateItem(added.item.id, { favorite: true });
    assert.equal(updatedFav.item.favorite, true);

    // Add tags
    const updatedTags = await storage.updateItem(added.item.id, { tags: ['research', 'dev-tools', 'extra!'] });
    assert.deepEqual(updatedTags.item.tags, ['research', 'dev-tools', 'extra']); // sanitized

    const history = await storage.getHistory();
    assert.equal(history[0].favorite, true);
    assert.deepEqual(history[0].tags, ['research', 'dev-tools', 'extra']);
  });

  test('Deletes a single item by ID', async () => {
    const a = await storage.addItem('Item A');
    const b = await storage.addItem('Item B');

    let history = await storage.getHistory();
    assert.equal(history.length, 2);

    const delRes = await storage.deleteItem(a.item.id);
    assert.equal(delRes.success, true);

    history = await storage.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].id, b.item.id);
  });

  test('Clears all history with optional preservation of favorites', async () => {
    await storage.addItem('Normal 1');
    await storage.addItem('Favorite Note', { favorite: true });
    await storage.addItem('Normal 2');

    // Clear keeping favorites
    const clearKeepFav = await storage.clearHistory(true);
    assert.equal(clearKeepFav.clearedCount, 2);

    let history = await storage.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].favorite, true);

    // Full clear
    await storage.clearHistory(false);
    history = await storage.getHistory();
    assert.equal(history.length, 0);
  });

  test('Exports and imports valid JSON backup', async () => {
    await storage.addItem('Backup Snippet 1', { tags: ['project'] });
    await storage.addItem('https://test.org', { favorite: true });

    const exportedJson = await storage.exportBackup();
    assert.ok(typeof exportedJson === 'string');

    const parsed = JSON.parse(exportedJson);
    assert.equal(parsed.app, 'Forgotten Clipboard');
    assert.equal(parsed.history.length, 2);

    // Create fresh storage and import backup
    const newStorage = new StorageService(createMockBackend());
    const importRes = await newStorage.importBackup(exportedJson, { mode: 'replace' });
    assert.equal(importRes.success, true);
    assert.equal(importRes.importedCount, 2);

    const importedHistory = await newStorage.getHistory();
    assert.equal(importedHistory.length, 2);
    assert.equal(importedHistory[0].text, 'https://test.org');
    assert.equal(importedHistory[0].favorite, true);
  });

  test('Rejects malformed or unsafe import data without corrupting storage', async () => {
    await storage.addItem('Safe Pre-existing Data');

    // Malformed JSON string
    const badJsonRes = await storage.importBackup('NOT VALID JSON {{{');
    assert.equal(badJsonRes.success, false);
    assert.match(badJsonRes.error, /parsing failed/i);

    // Missing history array
    const noHistoryRes = await storage.importBackup({ invalidKey: 123 });
    assert.equal(noHistoryRes.success, false);

    // Array of empty or malformed objects
    const emptyObjectsRes = await storage.importBackup({ history: [{}, { text: '' }] });
    assert.equal(emptyObjectsRes.success, false);

    // Ensure pre-existing data was untouched
    const history = await storage.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].text, 'Safe Pre-existing Data');
  });
});
