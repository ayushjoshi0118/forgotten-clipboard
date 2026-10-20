/**
 * Unit tests for Classifier
 * Run with: node --test tests/classifier.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const Classifier = require('../src/scripts/classifier.js');

describe('Classifier Engine', () => {
  test('Detects valid URLs with protocols', () => {
    const urls = [
      'https://developer.chrome.com/docs/extensions/mv3/',
      'http://example.com/path?arg=1#hash',
      'ftp://files.example.org/download.zip'
    ];
    for (const url of urls) {
      const res = Classifier.classifySnippet(url);
      assert.equal(res.type, 'link', `Expected ${url} to be classified as link`);
    }
  });

  test('Detects web domains without protocol', () => {
    const domains = [
      'github.com/google/antigravity',
      'subdomain.domain.org/index.html',
      'localhost:8080/api/v1'
    ];
    for (const d of domains) {
      const res = Classifier.classifySnippet(d);
      assert.equal(res.type, 'link', `Expected ${d} to be classified as link`);
    }
  });

  test('Detects valid email addresses', () => {
    const emails = [
      'user@example.com',
      'first.last+newsletter@sub.domain.co.uk',
      'contact_me123@domain.org'
    ];
    for (const email of emails) {
      const res = Classifier.classifySnippet(email);
      assert.equal(res.type, 'email', `Expected ${email} to be classified as email`);
    }
  });

  test('Detects shell and CLI commands as code', () => {
    const commands = [
      'npm install react react-dom',
      'git checkout -b feature/clipboard-history',
      'docker run -p 8080:80 -d nginx',
      'curl -X POST https://api.example.com/v1/items',
      'pip install --upgrade pip',
      '$ sudo systemctl restart nginx'
    ];
    for (const cmd of commands) {
      const res = Classifier.classifySnippet(cmd);
      assert.equal(res.type, 'code', `Expected "${cmd}" to be classified as code`);
    }
  });

  test('Detects programming code snippets and JSON as code', () => {
    const codeSnippets = [
      '{"key": "value", "count": 42}',
      `function calculateTotal(items) {\n  return items.reduce((sum, item) => sum + item.price, 0);\n}`,
      `SELECT id, email, created_at FROM users WHERE active = 1 ORDER BY created_at DESC;`,
      `import { useState, useEffect } from 'react';\n\nexport const App = () => <div>Hello</div>;`
    ];
    for (const snippet of codeSnippets) {
      const res = Classifier.classifySnippet(snippet);
      assert.equal(res.type, 'code', `Expected snippet to be classified as code:\n${snippet}`);
    }
  });

  test('Conservatively defaults ordinary text to plain text', () => {
    const texts = [
      'Remember to buy groceries on the way home.',
      'Meeting scheduled for tomorrow at 3 PM in Conference Room B.',
      'A paragraph describing product design ideas and general thoughts.',
      'This is just a sentence with some words and numbers like 1, 2, 3.'
    ];
    for (const txt of texts) {
      const res = Classifier.classifySnippet(txt);
      assert.equal(res.type, 'text', `Expected "${txt}" to be classified as text`);
    }
  });

  test('Handles empty, whitespace, and non-string inputs safely', () => {
    assert.equal(Classifier.classifySnippet('').type, 'text');
    assert.equal(Classifier.classifySnippet('   \n  \t  ').type, 'text');
    assert.equal(Classifier.classifySnippet(null).type, 'text');
    assert.equal(Classifier.classifySnippet(undefined).type, 'text');
    assert.equal(Classifier.classifySnippet(12345).type, 'text');
  });
});
