/**
 * Manifest V3 and Asset Integrity Verification
 * Run with: node --test tests/manifest.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

describe('Manifest & Asset Integrity', () => {
  test('manifest.json exists and is valid Manifest V3', () => {
    const manifestPath = path.join(rootDir, 'manifest.json');
    assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');

    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    assert.equal(manifest.manifest_version, 3, 'Must be Manifest V3');
    assert.equal(manifest.name, 'Forgotten Clipboard');
    assert.ok(manifest.version);
    assert.ok(manifest.action);
    assert.ok(manifest.background && manifest.background.service_worker);

    // Verify all icon paths exist
    for (const [size, iconPath] of Object.entries(manifest.icons)) {
      const fullPath = path.join(rootDir, iconPath);
      assert.ok(fs.existsSync(fullPath), `Icon file ${iconPath} (${size}) must exist on disk`);
    }

    // Verify action popup exists
    const popupPath = path.join(rootDir, manifest.action.default_popup);
    assert.ok(fs.existsSync(popupPath), `Popup file ${manifest.action.default_popup} must exist`);

    // Verify background script exists
    const swPath = path.join(rootDir, manifest.background.service_worker);
    assert.ok(fs.existsSync(swPath), `Service worker ${manifest.background.service_worker} must exist`);

    // Verify options page exists
    const optionsPath = path.join(rootDir, manifest.options_ui.page);
    assert.ok(fs.existsSync(optionsPath), `Options page ${manifest.options_ui.page} must exist`);
  });

  test('popup.html references valid scripts and styles', () => {
    const popupHtml = fs.readFileSync(path.join(rootDir, 'src', 'popup', 'popup.html'), 'utf8');

    // Check stylesheets
    const cssMatches = [...popupHtml.matchAll(/<link\s+[^>]*rel="stylesheet"\s+[^>]*href="([^"]+)"/g)];
    for (const match of cssMatches) {
      const relPath = match[1];
      const resolved = path.join(rootDir, 'src', 'popup', relPath);
      assert.ok(fs.existsSync(resolved), `CSS stylesheet ${relPath} in popup.html must exist at ${resolved}`);
    }

    // Check scripts
    const scriptMatches = [...popupHtml.matchAll(/<script\s+[^>]*src="([^"]+)"/g)];
    for (const match of scriptMatches) {
      const relPath = match[1];
      const resolved = path.join(rootDir, 'src', 'popup', relPath);
      assert.ok(fs.existsSync(resolved), `Script ${relPath} in popup.html must exist at ${resolved}`);
    }
  });

  test('history.html references valid scripts and styles', () => {
    const historyHtml = fs.readFileSync(path.join(rootDir, 'src', 'history', 'history.html'), 'utf8');

    // Check stylesheets
    const cssMatches = [...historyHtml.matchAll(/<link\s+[^>]*rel="stylesheet"\s+[^>]*href="([^"]+)"/g)];
    for (const match of cssMatches) {
      const relPath = match[1];
      const resolved = path.join(rootDir, 'src', 'history', relPath);
      assert.ok(fs.existsSync(resolved), `CSS stylesheet ${relPath} in history.html must exist at ${resolved}`);
    }

    // Check scripts
    const scriptMatches = [...historyHtml.matchAll(/<script\s+[^>]*src="([^"]+)"/g)];
    for (const match of scriptMatches) {
      const relPath = match[1];
      const resolved = path.join(rootDir, 'src', 'history', relPath);
      assert.ok(fs.existsSync(resolved), `Script ${relPath} in history.html must exist at ${resolved}`);
    }
  });
});
