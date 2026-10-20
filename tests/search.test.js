/**
 * Unit tests for Search & Filter
 * Run with: node --test tests/search.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const Search = require('../src/scripts/search.js');

describe('Search and Filter Engine', () => {
  const sampleItems = [
    {
      id: '1',
      text: 'https://github.com/google/antigravity',
      type: 'link',
      timestamp: 1000,
      favorite: true,
      tags: ['dev', 'tools']
    },
    {
      id: '2',
      text: 'support@antigravity.dev',
      type: 'email',
      timestamp: 2000,
      favorite: false,
      tags: ['work']
    },
    {
      id: '3',
      text: 'git commit -m "feat: add smart search"',
      type: 'code',
      timestamp: 3000,
      favorite: true,
      tags: ['git', 'dev']
    },
    {
      id: '4',
      text: 'Meeting notes: discuss roadmap for Q4 launch and beta testing.',
      type: 'text',
      timestamp: 4000,
      favorite: false,
      tags: ['meeting', 'work']
    }
  ];

  test('Searches by partial phrase (case-insensitive)', () => {
    const results = Search.search(sampleItems, { query: 'SMART SEARCH' });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, '3');
  });

  test('Searches across URLs and domains', () => {
    const results = Search.search(sampleItems, { query: 'github.com' });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, '1');
  });

  test('Searches across email addresses', () => {
    const results = Search.search(sampleItems, { query: 'support@' });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, '2');
  });

  test('Searches by tags', () => {
    const results = Search.search(sampleItems, { query: 'tools' });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, '1');
  });

  test('Filters by favorites', () => {
    const results = Search.search(sampleItems, { filter: 'favorites' });
    assert.equal(results.length, 2);
    assert.deepEqual(results.map(r => r.id).sort(), ['1', '3']);
  });

  test('Filters by specific category (e.g. code, link, email)', () => {
    const codeResults = Search.search(sampleItems, { filter: 'code' });
    assert.equal(codeResults.length, 1);
    assert.equal(codeResults[0].id, '3');

    const linkResults = Search.search(sampleItems, { filter: 'link' });
    assert.equal(linkResults.length, 1);
    assert.equal(linkResults[0].id, '1');
  });

  test('Filters by explicit tag parameter', () => {
    const results = Search.search(sampleItems, { tag: 'work' });
    assert.equal(results.length, 2);
    assert.deepEqual(results.map(r => r.id).sort(), ['2', '4']);
  });

  test('Combines query, filter, and tag simultaneously', () => {
    const results = Search.search(sampleItems, {
      query: 'commit',
      filter: 'code',
      tag: 'git'
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, '3');
  });

  test('Sorts correctly by timestamp and length', () => {
    const newest = Search.search(sampleItems, { sortBy: 'newest' });
    assert.equal(newest[0].id, '4'); // timestamp 4000

    const oldest = Search.search(sampleItems, { sortBy: 'oldest' });
    assert.equal(oldest[0].id, '1'); // timestamp 1000

    const longest = Search.search(sampleItems, { sortBy: 'length' });
    assert.equal(longest[0].id, '4'); // longest text
  });

  test('Handles empty and invalid item lists gracefully', () => {
    assert.deepEqual(Search.search([], { query: 'test' }), []);
    assert.deepEqual(Search.search(null, { query: 'test' }), []);
    assert.deepEqual(Search.search(undefined, { query: 'test' }), []);
  });
});
