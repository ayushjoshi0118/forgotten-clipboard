/**
 * Forgotten Clipboard - Popup Controller
 * Manages UI interactions, capture flows, real-time search, filters,
 * tags, themes, and keyboard navigation.
 */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  // Instantiate services
  const storageService = new StorageManager.StorageService();
  const searchEngine = new Search.KeywordSearchEngine();

  // State
  let allHistory = [];
  let displayedItems = [];
  let activeFilter = 'all';
  let searchQuery = '';
  let selectedIndex = -1;
  let currentEditingItemId = null;
  let currentTheme = 'system';

  // DOM Elements
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const openHistoryBtn = document.getElementById('openHistoryBtn');
  const captureClipboardBtn = document.getElementById('captureClipboardBtn');
  const togglePastePanelBtn = document.getElementById('togglePastePanelBtn');
  const manualPasteDrawer = document.getElementById('manualPasteDrawer');
  const manualPasteInput = document.getElementById('manualPasteInput');
  const saveManualPasteBtn = document.getElementById('saveManualPasteBtn');
  const cancelPasteBtn = document.getElementById('cancelPasteBtn');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const filterChips = document.querySelectorAll('.filter-chip');
  const snippetsContainer = document.getElementById('snippetsContainer');
  const snippetsList = document.getElementById('snippetsList');
  const emptyState = document.getElementById('emptyState');
  const emptyDesc = document.getElementById('emptyDesc');
  const statusInfo = document.getElementById('statusInfo');
  const quickClearBtn = document.getElementById('quickClearBtn');
  const toastContainer = document.getElementById('toastContainer');

  // Counts
  const countAll = document.getElementById('countAll');
  const countFav = document.getElementById('countFav');
  const countLink = document.getElementById('countLink');
  const countCode = document.getElementById('countCode');
  const countEmail = document.getElementById('countEmail');
  const countText = document.getElementById('countText');

  // Modals
  const tagModal = document.getElementById('tagModal');
  const closeTagModalBtn = document.getElementById('closeTagModalBtn');
  const currentTagsContainer = document.getElementById('currentTagsContainer');
  const newTagInput = document.getElementById('newTagInput');
  const addTagBtn = document.getElementById('addTagBtn');

  const clearModal = document.getElementById('clearModal');
  const closeClearModalBtn = document.getElementById('closeClearModalBtn');
  const cancelClearBtn = document.getElementById('cancelClearBtn');
  const confirmClearBtn = document.getElementById('confirmClearBtn');
  const keepFavoritesCheckbox = document.getElementById('keepFavoritesCheckbox');

  // ==========================================
  // Initialization & Theme
  // ==========================================

  async function init() {
    const settings = await storageService.getSettings();
    currentTheme = settings.theme || 'system';
    applyTheme(currentTheme);

    if (settings.defaultFilter) {
      activeFilter = settings.defaultFilter;
      updateFilterChipUI();
    }

    await loadHistory();
    setupEventListeners();
  }

  function applyTheme(theme) {
    let resolved = theme;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = prefersDark ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolved);
  }

  // ==========================================
  // Data Loading & Rendering
  // ==========================================

  async function loadHistory() {
    allHistory = await storageService.getHistory();
    updateFilterCounts();
    filterAndRender();
  }

  function updateFilterCounts() {
    const total = allHistory.length;
    let fav = 0, links = 0, codes = 0, emails = 0, texts = 0;

    for (const item of allHistory) {
      if (item.favorite) fav++;
      if (item.type === 'link') links++;
      else if (item.type === 'code') codes++;
      else if (item.type === 'email') emails++;
      else texts++;
    }

    countAll.textContent = total;
    countFav.textContent = fav;
    countLink.textContent = links;
    countCode.textContent = codes;
    countEmail.textContent = emails;
    countText.textContent = texts;

    statusInfo.textContent = `${total} saved item${total === 1 ? '' : 's'}`;
  }

  function filterAndRender() {
    displayedItems = searchEngine.search(allHistory, {
      query: searchQuery,
      filter: activeFilter,
      sortBy: 'newest'
    });

    renderList();
  }

  function renderList() {
    snippetsList.innerHTML = '';
    selectedIndex = -1;

    if (displayedItems.length === 0) {
      emptyState.classList.remove('hidden');
      if (searchQuery.trim().length > 0) {
        emptyDesc.textContent = `No clipboard items match "${searchQuery}". Try a different keyword or filter.`;
      } else if (activeFilter === 'favorites') {
        emptyDesc.textContent = 'No starred favorites yet. Click the star icon on any snippet to save it as a favorite.';
      } else if (activeFilter !== 'all') {
        emptyDesc.textContent = `No snippets in the ${activeFilter} category.`;
      } else {
        emptyDesc.textContent = 'Click "Capture Clipboard" above, or right-click selected text and choose "Save to Forgotten Clipboard".';
      }
      return;
    }

    emptyState.classList.add('hidden');

    displayedItems.forEach((item, index) => {
      const card = createSnippetCard(item, index);
      snippetsList.appendChild(card);
    });
  }

  /**
   * Builds DOM node for snippet card (XSS-safe)
   */
  function createSnippetCard(item, index) {
    const card = document.createElement('div');
    card.className = 'snippet-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    card.dataset.id = item.id;
    card.dataset.index = index;

    // Card Header (Type badge + timestamp)
    const cardTop = document.createElement('div');
    cardTop.className = 'card-top';

    const typeBadge = document.createElement('span');
    typeBadge.className = `badge-type ${item.type}`;
    typeBadge.textContent = item.type;
    cardTop.appendChild(typeBadge);

    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'card-timestamp';
    timestampSpan.textContent = Utils.formatRelativeTime(item.timestamp);
    timestampSpan.title = Utils.formatDateTime(item.timestamp);
    cardTop.appendChild(timestampSpan);

    card.appendChild(cardTop);

    // Card Body (Preview)
    const cardBody = document.createElement('div');
    cardBody.className = `card-body ${item.type === 'code' ? 'font-code' : ''}`;
    const truncated = Utils.truncatePreview(item.text, 220, 3);
    cardBody.textContent = truncated.text;
    card.appendChild(cardBody);

    // Card Tags (if any)
    if (Array.isArray(item.tags) && item.tags.length > 0) {
      const tagsRow = document.createElement('div');
      tagsRow.className = 'card-tags';
      item.tags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag-pill';
        tagEl.textContent = `#${tag}`;
        tagsRow.appendChild(tagEl);
      });
      card.appendChild(tagsRow);
    }

    // Card Actions
    const cardActions = document.createElement('div');
    cardActions.className = 'card-actions';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'action-group-left';

    // Favorite toggle button
    const starBtn = document.createElement('button');
    starBtn.className = `btn-card-action btn-card-star ${item.favorite ? 'active' : ''}`;
    starBtn.title = item.favorite ? 'Remove favorite' : 'Star favorite';
    starBtn.setAttribute('aria-label', starBtn.title);
    starBtn.textContent = item.favorite ? '★' : '☆';
    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(item.id, !item.favorite);
    });
    leftGroup.appendChild(starBtn);

    // Tags button
    const tagBtn = document.createElement('button');
    tagBtn.className = 'btn-card-action';
    tagBtn.title = 'Manage tags';
    tagBtn.setAttribute('aria-label', 'Manage tags');
    tagBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
        <line x1="7" y1="7" x2="7.01" y2="7"></line>
      </svg>
      <span>Tag</span>
    `;
    tagBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTagModal(item);
    });
    leftGroup.appendChild(tagBtn);

    cardActions.appendChild(leftGroup);

    const rightGroup = document.createElement('div');
    rightGroup.className = 'action-group-right';

    // Copy Again Button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-card-action btn-copy';
    copyBtn.title = 'Copy to clipboard';
    copyBtn.setAttribute('aria-label', 'Copy to clipboard');
    copyBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>Copy</span>
    `;
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await handleCopyItem(item.text, copyBtn);
    });
    rightGroup.appendChild(copyBtn);

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-card-action';
    deleteBtn.title = 'Delete item';
    deleteBtn.setAttribute('aria-label', 'Delete item');
    deleteBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await handleDeleteItem(item.id);
    });
    rightGroup.appendChild(deleteBtn);

    cardActions.appendChild(rightGroup);
    card.appendChild(cardActions);

    // Clicking card copies text
    card.addEventListener('click', async () => {
      await handleCopyItem(item.text, copyBtn);
    });

    return card;
  }

  // ==========================================
  // Clipboard Operations & Actions
  // ==========================================

  async function handleCaptureClipboard() {
    captureClipboardBtn.disabled = true;
    captureClipboardBtn.style.opacity = '0.7';

    try {
      const readRes = await Clipboard.readText();
      if (!readRes.success) {
        showToast(readRes.error || 'Failed to read clipboard.', 'error');
        return;
      }

      const saveRes = await storageService.addItem(readRes.text);
      if (!saveRes.success) {
        showToast(saveRes.error || 'Could not save text.', 'error');
        return;
      }

      if (saveRes.duplicate) {
        showToast('Already in history — refreshed to top!', 'info');
      } else {
        showToast(`Saved new ${saveRes.item.type}!`, 'success');
      }

      await loadHistory();
    } finally {
      captureClipboardBtn.disabled = false;
      captureClipboardBtn.style.opacity = '1';
    }
  }

  async function handleCopyItem(text, buttonElement) {
    const res = await Clipboard.writeText(text);
    if (res.success) {
      if (buttonElement) {
        const originalHTML = buttonElement.innerHTML;
        buttonElement.classList.add('copied');
        buttonElement.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Copied!</span>
        `;
        setTimeout(() => {
          buttonElement.classList.remove('copied');
          buttonElement.innerHTML = originalHTML;
        }, 1500);
      }
      showToast('Copied to clipboard!', 'success');
    } else {
      showToast('Failed to copy to clipboard.', 'error');
    }
  }

  async function toggleFavorite(id, favorite) {
    await storageService.updateItem(id, { favorite });
    await loadHistory();
  }

  async function handleDeleteItem(id) {
    await storageService.deleteItem(id);
    showToast('Item deleted.', 'info');
    await loadHistory();
  }

  // ==========================================
  // Manual Paste
  // ==========================================

  function togglePasteDrawer(open) {
    const isCurrentlyHidden = manualPasteDrawer.classList.contains('hidden');
    const shouldOpen = open !== undefined ? open : isCurrentlyHidden;

    if (shouldOpen) {
      manualPasteDrawer.classList.remove('hidden');
      manualPasteInput.focus();
    } else {
      manualPasteDrawer.classList.add('hidden');
      manualPasteInput.value = '';
    }
  }

  async function handleSaveManualPaste() {
    const text = manualPasteInput.value.trim();
    if (!text) {
      showToast('Please enter text to save.', 'error');
      return;
    }

    const res = await storageService.addItem(text);
    if (res.success) {
      togglePasteDrawer(false);
      showToast(res.duplicate ? 'Already in history (moved to top)' : `Saved ${res.item.type}!`, 'success');
      await loadHistory();
    } else {
      showToast(res.error || 'Failed to save.', 'error');
    }
  }

  // ==========================================
  // Search & Filter Events
  // ==========================================

  const handleSearchInput = Utils.debounce(() => {
    searchQuery = searchInput.value;
    clearSearchBtn.classList.toggle('hidden', searchQuery.length === 0);
    filterAndRender();
  }, 120);

  function clearSearch() {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    filterAndRender();
    searchInput.focus();
  }

  function handleFilterClick(btn) {
    filterChips.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    filterAndRender();
  }

  function updateFilterChipUI() {
    filterChips.forEach(b => {
      b.classList.toggle('active', b.dataset.filter === activeFilter);
    });
  }

  // ==========================================
  // Tag Modal
  // ==========================================

  function openTagModal(item) {
    currentEditingItemId = item.id;
    newTagInput.value = '';
    renderTagChips(item.tags || []);
    tagModal.classList.remove('hidden');
    newTagInput.focus();
  }

  function closeTagModal() {
    tagModal.classList.add('hidden');
    currentEditingItemId = null;
  }

  function renderTagChips(tags) {
    currentTagsContainer.innerHTML = '';
    if (tags.length === 0) {
      const noneSpan = document.createElement('span');
      noneSpan.style.fontSize = '12px';
      noneSpan.style.color = 'var(--text-tertiary)';
      noneSpan.textContent = 'No tags assigned yet.';
      currentTagsContainer.appendChild(noneSpan);
      return;
    }

    tags.forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.textContent = `#${tag} `;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-icon';
      removeBtn.style.padding = '0 2px';
      removeBtn.style.fontSize = '11px';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove tag';
      removeBtn.addEventListener('click', async () => {
        const item = allHistory.find(i => i.id === currentEditingItemId);
        if (item) {
          const updatedTags = (item.tags || []).filter(t => t !== tag);
          await storageService.updateItem(item.id, { tags: updatedTags });
          item.tags = updatedTags;
          renderTagChips(updatedTags);
          await loadHistory();
        }
      });

      pill.appendChild(removeBtn);
      currentTagsContainer.appendChild(pill);
    });
  }

  async function handleAddTag() {
    const rawTag = newTagInput.value;
    const cleanTag = Utils.sanitizeTag(rawTag);
    if (!cleanTag) {
      showToast('Enter valid alphanumeric tag.', 'error');
      return;
    }

    const item = allHistory.find(i => i.id === currentEditingItemId);
    if (item) {
      const currentTags = Array.isArray(item.tags) ? [...item.tags] : [];
      if (!currentTags.includes(cleanTag)) {
        currentTags.push(cleanTag);
        await storageService.updateItem(item.id, { tags: currentTags });
        item.tags = currentTags;
        renderTagChips(currentTags);
        newTagInput.value = '';
        await loadHistory();
      }
    }
  }

  // ==========================================
  // Clear History Modal
  // ==========================================

  function openClearModal() {
    clearModal.classList.remove('hidden');
  }

  function closeClearModal() {
    clearModal.classList.add('hidden');
  }

  async function handleConfirmClear() {
    const keepFavs = keepFavoritesCheckbox.checked;
    const res = await storageService.clearHistory(keepFavs);
    closeClearModal();
    showToast(`Cleared ${res.clearedCount} item${res.clearedCount === 1 ? '' : 's'}.`, 'info');
    await loadHistory();
  }

  // ==========================================
  // Keyboard Navigation
  // ==========================================

  function handleKeydown(e) {
    // Esc closes modals or clears search
    if (e.key === 'Escape') {
      if (!tagModal.classList.contains('hidden')) {
        closeTagModal();
        return;
      }
      if (!clearModal.classList.contains('hidden')) {
        closeClearModal();
        return;
      }
      if (!manualPasteDrawer.classList.contains('hidden')) {
        togglePasteDrawer(false);
        return;
      }
      if (searchQuery.length > 0) {
        clearSearch();
        return;
      }
    }

    // Forward slash '/' focuses search when not already in an input
    if (e.key === '/' && document.activeElement !== searchInput && document.activeElement !== manualPasteInput && document.activeElement !== newTagInput) {
      e.preventDefault();
      searchInput.focus();
      return;
    }

    // Arrow keys for navigating snippet cards
    const cards = snippetsList.querySelectorAll('.snippet-card');
    if (cards.length === 0) return;

    if (e.key === 'ArrowDown') {
      if (document.activeElement === searchInput || selectedIndex === -1) {
        selectedIndex = 0;
      } else {
        selectedIndex = Math.min(cards.length - 1, selectedIndex + 1);
      }
      highlightCard(cards, selectedIndex);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      if (selectedIndex > 0) {
        selectedIndex--;
        highlightCard(cards, selectedIndex);
        e.preventDefault();
      } else if (selectedIndex === 0) {
        selectedIndex = -1;
        cards.forEach(c => c.classList.remove('selected'));
        searchInput.focus();
        e.preventDefault();
      }
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < displayedItems.length && document.activeElement !== searchInput) {
        const item = displayedItems[selectedIndex];
        if (item) {
          const card = cards[selectedIndex];
          const copyBtn = card ? card.querySelector('.btn-copy') : null;
          handleCopyItem(item.text, copyBtn);
        }
      }
    }
  }

  function highlightCard(cards, index) {
    cards.forEach((c, idx) => {
      if (idx === index) {
        c.classList.add('selected');
        c.focus();
        c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        c.classList.remove('selected');
      }
    });
  }

  // ==========================================
  // Toast Notification
  // ==========================================

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 200);
    }, 2200);
  }

  // ==========================================
  // Event Listeners Binding
  // ==========================================

  function setupEventListeners() {
    // Theme toggle
    themeToggleBtn.addEventListener('click', async () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';
      currentTheme = newTheme;
      applyTheme(newTheme);
      await storageService.updateSettings({ theme: newTheme });
    });

    // Open options / full history page
    openHistoryBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Quick capture
    captureClipboardBtn.addEventListener('click', handleCaptureClipboard);

    // Manual paste toggle & save
    togglePastePanelBtn.addEventListener('click', () => togglePasteDrawer());
    cancelPasteBtn.addEventListener('click', () => togglePasteDrawer(false));
    saveManualPasteBtn.addEventListener('click', handleSaveManualPaste);

    // Search input
    searchInput.addEventListener('input', handleSearchInput);
    clearSearchBtn.addEventListener('click', clearSearch);

    // Filter chips
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => handleFilterClick(chip));
    });

    // Quick clear modal
    quickClearBtn.addEventListener('click', openClearModal);
    closeClearModalBtn.addEventListener('click', closeClearModal);
    cancelClearBtn.addEventListener('click', closeClearModal);
    confirmClearBtn.addEventListener('click', handleConfirmClear);

    // Tag modal
    closeTagModalBtn.addEventListener('click', closeTagModal);
    addTagBtn.addEventListener('click', handleAddTag);
    newTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleAddTag();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', handleKeydown);
  }

  // Run initialization
  await init();
});
