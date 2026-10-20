/**
 * Forgotten Clipboard - Full History & Settings Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  const storageService = new StorageManager.StorageService();
  const searchEngine = new Search.KeywordSearchEngine();

  // State
  let allHistory = [];
  let displayedItems = [];
  let activeTab = 'history'; // 'history' | 'settings' | 'privacy'
  let activeFilter = 'all';
  let activeSort = 'newest';
  let searchQuery = '';
  let activeDetailItem = null;
  let currentSettings = {};

  // DOM Elements - Sidebar & Nav
  const navItems = document.querySelectorAll('.nav-item');
  const themeOptButtons = document.querySelectorAll('.btn-theme-opt');
  const sideCountAll = document.getElementById('sideCountAll');
  const sideCountFav = document.getElementById('sideCountFav');
  const sideCountLink = document.getElementById('sideCountLink');
  const sideCountCode = document.getElementById('sideCountCode');
  const sideCountEmail = document.getElementById('sideCountEmail');
  const sideCountText = document.getElementById('sideCountText');

  // DOM Elements - Views
  const viewHistory = document.getElementById('viewHistory');
  const viewSettings = document.getElementById('viewSettings');
  const viewPrivacy = document.getElementById('viewPrivacy');

  // Top Bar
  const mainSearchInput = document.getElementById('mainSearchInput');
  const clearMainSearchBtn = document.getElementById('clearMainSearchBtn');
  const sortSelect = document.getElementById('sortSelect');
  const mainCaptureBtn = document.getElementById('mainCaptureBtn');

  // Stats Strip
  const statTotal = document.getElementById('statTotal');
  const statStarred = document.getElementById('statStarred');
  const statLinks = document.getElementById('statLinks');
  const statCodes = document.getElementById('statCodes');
  const statEmails = document.getElementById('statEmails');

  // History Grid
  const historyGrid = document.getElementById('historyGrid');
  const fullEmptyState = document.getElementById('fullEmptyState');
  const fullEmptyDesc = document.getElementById('fullEmptyDesc');

  // Settings Elements
  const limitRange = document.getElementById('limitRange');
  const limitNumber = document.getElementById('limitNumber');
  const defaultFilterSelect = document.getElementById('defaultFilterSelect');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const importFileInput = document.getElementById('importFileInput');
  const importModeSelect = document.getElementById('importModeSelect');
  const openClearHistoryModalBtn = document.getElementById('openClearHistoryModalBtn');

  // Detail Modal
  const detailModal = document.getElementById('detailModal');
  const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
  const detailTypeBadge = document.getElementById('detailTypeBadge');
  const detailTimestamp = document.getElementById('detailTimestamp');
  const detailFullText = document.getElementById('detailFullText');
  const detailTagsList = document.getElementById('detailTagsList');
  const detailNewTagInput = document.getElementById('detailNewTagInput');
  const detailAddTagBtn = document.getElementById('detailAddTagBtn');
  const detailStarBtn = document.getElementById('detailStarBtn');
  const detailStarIcon = document.getElementById('detailStarIcon');
  const detailDeleteBtn = document.getElementById('detailDeleteBtn');
  const detailCopyBtn = document.getElementById('detailCopyBtn');
  const detailCopyLabel = document.getElementById('detailCopyLabel');

  // Clear History Modal
  const historyClearModal = document.getElementById('historyClearModal');
  const closeHistoryClearModalBtn = document.getElementById('closeHistoryClearModalBtn');
  const cancelHistoryClearBtn = document.getElementById('cancelHistoryClearBtn');
  const confirmHistoryClearBtn = document.getElementById('confirmHistoryClearBtn');
  const historyKeepFavoritesCheckbox = document.getElementById('historyKeepFavoritesCheckbox');

  // Toast
  const toastContainer = document.getElementById('historyToastContainer');

  // ==========================================
  // Initialization
  // ==========================================

  async function init() {
    currentSettings = await storageService.getSettings();
    applyTheme(currentSettings.theme || 'system');
    updateThemeSelectorUI(currentSettings.theme || 'system');

    // Populate settings UI values
    limitRange.value = currentSettings.historyLimit || 500;
    limitNumber.value = currentSettings.historyLimit || 500;
    defaultFilterSelect.value = currentSettings.defaultFilter || 'all';

    // Check URL params for initial filter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('filter')) {
      activeFilter = urlParams.get('filter');
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

  function updateThemeSelectorUI(theme) {
    themeOptButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeVal === theme);
    });
  }

  // ==========================================
  // Data Loading & Counts
  // ==========================================

  async function loadHistory() {
    allHistory = await storageService.getHistory();
    updateCounts();
    filterAndRender();
  }

  function updateCounts() {
    const total = allHistory.length;
    let fav = 0, links = 0, codes = 0, emails = 0, texts = 0;

    for (const item of allHistory) {
      if (item.favorite) fav++;
      if (item.type === 'link') links++;
      else if (item.type === 'code') codes++;
      else if (item.type === 'email') emails++;
      else texts++;
    }

    sideCountAll.textContent = total;
    sideCountFav.textContent = fav;
    sideCountLink.textContent = links;
    sideCountCode.textContent = codes;
    sideCountEmail.textContent = emails;
    sideCountText.textContent = texts;

    statTotal.textContent = total;
    statStarred.textContent = fav;
    statLinks.textContent = links;
    statCodes.textContent = codes;
    statEmails.textContent = emails;
  }

  function filterAndRender() {
    displayedItems = searchEngine.search(allHistory, {
      query: searchQuery,
      filter: activeFilter,
      sortBy: activeSort
    });

    renderGrid();
  }

  function renderGrid() {
    historyGrid.innerHTML = '';

    if (displayedItems.length === 0) {
      fullEmptyState.classList.remove('hidden');
      if (searchQuery.trim().length > 0) {
        fullEmptyDesc.textContent = `No items found matching "${searchQuery}".`;
      } else if (activeFilter === 'favorites') {
        fullEmptyDesc.textContent = 'No starred favorites yet. Click the star on any snippet to bookmark it.';
      } else if (activeFilter !== 'all') {
        fullEmptyDesc.textContent = `No items in the ${activeFilter} category.`;
      } else {
        fullEmptyDesc.textContent = 'Your clipboard history is empty. Click "Capture Clipboard" above to save your first item.';
      }
      return;
    }

    fullEmptyState.classList.add('hidden');

    displayedItems.forEach(item => {
      const card = createHistoryCard(item);
      historyGrid.appendChild(card);
    });
  }

  /**
   * DOM card construction (XSS-safe textContent)
   */
  function createHistoryCard(item) {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.setAttribute('role', 'listitem');
    card.dataset.id = item.id;

    // Header: Badge + Timestamp
    const topRow = document.createElement('div');
    topRow.className = 'card-top';

    const typeBadge = document.createElement('span');
    typeBadge.className = `badge-type ${item.type}`;
    typeBadge.textContent = item.type;
    topRow.appendChild(typeBadge);

    const timeSpan = document.createElement('span');
    timeSpan.className = 'card-timestamp';
    timeSpan.textContent = Utils.formatRelativeTime(item.timestamp);
    timeSpan.title = Utils.formatDateTime(item.timestamp);
    topRow.appendChild(timeSpan);

    card.appendChild(topRow);

    // Body: Preview Text
    const body = document.createElement('div');
    body.className = `card-preview-text ${item.type === 'code' ? 'font-code' : ''}`;
    const truncated = Utils.truncatePreview(item.text, 280, 5);
    body.textContent = truncated.text;
    card.appendChild(body);

    // Tags
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

    // Actions
    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const left = document.createElement('div');
    left.className = 'action-group-left';

    // Star
    const starBtn = document.createElement('button');
    starBtn.className = `btn-card-action btn-card-star ${item.favorite ? 'active' : ''}`;
    starBtn.title = item.favorite ? 'Remove favorite' : 'Star favorite';
    starBtn.textContent = item.favorite ? '★' : '☆';
    starBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await storageService.updateItem(item.id, { favorite: !item.favorite });
      await loadHistory();
    });
    left.appendChild(starBtn);

    // View Details / Edit Tags
    const inspectBtn = document.createElement('button');
    inspectBtn.className = 'btn-card-action';
    inspectBtn.title = 'Inspect full text & tags';
    inspectBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
      <span>Inspect</span>
    `;
    inspectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDetailModal(item);
    });
    left.appendChild(inspectBtn);

    actions.appendChild(left);

    const right = document.createElement('div');
    right.className = 'action-group-right';

    // Copy
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-card-action btn-copy';
    copyBtn.title = 'Copy to clipboard';
    copyBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>Copy</span>
    `;
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await handleCopy(item.text, copyBtn);
    });
    right.appendChild(copyBtn);

    // Delete
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-card-action';
    deleteBtn.title = 'Delete snippet';
    deleteBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await storageService.deleteItem(item.id);
      showToast('Snippet deleted.', 'info');
      await loadHistory();
    });
    right.appendChild(deleteBtn);

    actions.appendChild(right);
    card.appendChild(actions);

    // Clicking card opens full detail
    card.addEventListener('click', () => {
      openDetailModal(item);
    });

    return card;
  }

  // ==========================================
  // Detail Inspection Modal
  // ==========================================

  function openDetailModal(item) {
    activeDetailItem = item;

    detailTypeBadge.className = `badge-type ${item.type}`;
    detailTypeBadge.textContent = item.type;
    detailTimestamp.textContent = `Saved on ${Utils.formatDateTime(item.timestamp)} (${Utils.formatRelativeTime(item.timestamp)})`;

    detailFullText.textContent = item.text;
    detailStarIcon.textContent = item.favorite ? '★' : '☆';
    detailStarBtn.classList.toggle('active', item.favorite);

    renderDetailTags(item.tags || []);
    detailNewTagInput.value = '';

    detailModal.classList.remove('hidden');
  }

  function closeDetailModal() {
    detailModal.classList.add('hidden');
    activeDetailItem = null;
  }

  function renderDetailTags(tags) {
    detailTagsList.innerHTML = '';
    if (tags.length === 0) {
      const emptySpan = document.createElement('span');
      emptySpan.style.fontSize = '12px';
      emptySpan.style.color = 'var(--text-tertiary)';
      emptySpan.textContent = 'None';
      detailTagsList.appendChild(emptySpan);
      return;
    }

    tags.forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.textContent = `#${tag} `;

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-icon';
      delBtn.style.padding = '0 2px';
      delBtn.style.fontSize = '11px';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', async () => {
        if (!activeDetailItem) return;
        const updatedTags = (activeDetailItem.tags || []).filter(t => t !== tag);
        await storageService.updateItem(activeDetailItem.id, { tags: updatedTags });
        activeDetailItem.tags = updatedTags;
        renderDetailTags(updatedTags);
        await loadHistory();
      });

      pill.appendChild(delBtn);
      detailTagsList.appendChild(pill);
    });
  }

  async function handleAddDetailTag() {
    if (!activeDetailItem) return;
    const cleanTag = Utils.sanitizeTag(detailNewTagInput.value);
    if (!cleanTag) {
      showToast('Enter valid alphanumeric tag.', 'error');
      return;
    }

    const currentTags = Array.isArray(activeDetailItem.tags) ? [...activeDetailItem.tags] : [];
    if (!currentTags.includes(cleanTag)) {
      currentTags.push(cleanTag);
      await storageService.updateItem(activeDetailItem.id, { tags: currentTags });
      activeDetailItem.tags = currentTags;
      renderDetailTags(currentTags);
      detailNewTagInput.value = '';
      await loadHistory();
    }
  }

  // ==========================================
  // Clipboard Operations
  // ==========================================

  async function handleTopCapture() {
    mainCaptureBtn.disabled = true;
    try {
      const readRes = await Clipboard.readText();
      if (!readRes.success) {
        showToast(readRes.error || 'Failed to capture clipboard.', 'error');
        return;
      }

      const saveRes = await storageService.addItem(readRes.text);
      if (!saveRes.success) {
        showToast(saveRes.error || 'Could not save text.', 'error');
        return;
      }

      if (saveRes.duplicate) {
        showToast('Snippet was already in history — timestamp refreshed!', 'info');
      } else {
        showToast(`Saved new ${saveRes.item.type}!`, 'success');
      }

      await loadHistory();
    } finally {
      mainCaptureBtn.disabled = false;
    }
  }

  async function handleCopy(text, buttonElement) {
    const res = await Clipboard.writeText(text);
    if (res.success) {
      if (buttonElement) {
        const origText = buttonElement.innerHTML;
        buttonElement.classList.add('copied');
        buttonElement.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Copied!</span>
        `;
        setTimeout(() => {
          buttonElement.classList.remove('copied');
          buttonElement.innerHTML = origText;
        }, 1500);
      }
      showToast('Copied to clipboard!', 'success');
    } else {
      showToast('Failed to copy to clipboard.', 'error');
    }
  }

  // ==========================================
  // Settings Management
  // ==========================================

  async function handleLimitChange(val) {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) return;
    const clamped = Math.max(10, Math.min(5000, parsed));

    limitRange.value = clamped;
    limitNumber.value = clamped;

    await storageService.updateSettings({ historyLimit: clamped });
    showToast(`History limit updated to ${clamped} items.`, 'info');
  }

  async function handleDefaultFilterChange(val) {
    await storageService.updateSettings({ defaultFilter: val });
    showToast('Default startup view updated.', 'info');
  }

  // ==========================================
  // Export & Import Backups
  // ==========================================

  async function handleExportJson() {
    const jsonStr = await storageService.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `forgotten-clipboard-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Backup JSON exported successfully!', 'success');
  }

  async function handleImportJson(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const mode = importModeSelect.value;
      const result = await storageService.importBackup(e.target.result, { mode });

      if (result.success) {
        showToast(`Successfully imported ${result.importedCount} snippet${result.importedCount === 1 ? '' : 's'}!`, 'success');
        await loadHistory();
      } else {
        showToast(result.error || 'Import failed. Check JSON format.', 'error');
      }

      // Reset file input
      importFileInput.value = '';
    };

    reader.onerror = () => {
      showToast('Failed to read backup file.', 'error');
      importFileInput.value = '';
    };

    reader.readAsText(file);
  }

  // ==========================================
  // Clear History Modal
  // ==========================================

  function openHistoryClearModal() {
    historyClearModal.classList.remove('hidden');
  }

  function closeHistoryClearModal() {
    historyClearModal.classList.add('hidden');
  }

  async function handleConfirmHistoryClear() {
    const keepFavs = historyKeepFavoritesCheckbox.checked;
    const res = await storageService.clearHistory(keepFavs);
    closeHistoryClearModal();
    showToast(`Cleared ${res.clearedCount} item${res.clearedCount === 1 ? '' : 's'}.`, 'info');
    await loadHistory();
  }

  // ==========================================
  // Toast
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
    }, 2400);
  }

  // ==========================================
  // Navigation & View Switching
  // ==========================================

  function switchTab(tabName, filterVal = null) {
    activeTab = tabName;

    navItems.forEach(item => {
      const itemTab = item.dataset.tab;
      const itemFilter = item.dataset.filter;

      if (filterVal) {
        item.classList.toggle('active', itemFilter === filterVal);
      } else {
        item.classList.toggle('active', itemTab === tabName && !itemFilter);
      }
    });

    viewHistory.classList.toggle('active', tabName === 'history');
    viewSettings.classList.toggle('active', tabName === 'settings');
    viewPrivacy.classList.toggle('active', tabName === 'privacy');

    if (filterVal) {
      activeFilter = filterVal;
    } else if (tabName === 'history' && !filterVal) {
      activeFilter = 'all';
    }

    if (tabName === 'history') {
      filterAndRender();
    }
  }

  // ==========================================
  // Event Listeners Binding
  // ==========================================

  function setupEventListeners() {
    // Navigation items
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab || 'history';
        const filter = item.dataset.filter || null;
        switchTab(tab, filter);
      });
    });

    // Theme selector
    themeOptButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const theme = btn.dataset.themeVal;
        applyTheme(theme);
        updateThemeSelectorUI(theme);
        await storageService.updateSettings({ theme });
      });
    });

    // Top Search
    mainSearchInput.addEventListener('input', Utils.debounce(() => {
      searchQuery = mainSearchInput.value;
      clearMainSearchBtn.classList.toggle('hidden', searchQuery.length === 0);
      filterAndRender();
    }, 120));

    clearMainSearchBtn.addEventListener('click', () => {
      mainSearchInput.value = '';
      searchQuery = '';
      clearMainSearchBtn.classList.add('hidden');
      filterAndRender();
      mainSearchInput.focus();
    });

    // Sort
    sortSelect.addEventListener('change', () => {
      activeSort = sortSelect.value;
      filterAndRender();
    });

    // Top capture
    mainCaptureBtn.addEventListener('click', handleTopCapture);

    // Limit settings
    limitRange.addEventListener('input', (e) => handleLimitChange(e.target.value));
    limitNumber.addEventListener('change', (e) => handleLimitChange(e.target.value));
    defaultFilterSelect.addEventListener('change', (e) => handleDefaultFilterChange(e.target.value));

    // Export / Import
    exportJsonBtn.addEventListener('click', handleExportJson);
    importFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImportJson(e.target.files[0]);
      }
    });

    // Clear Modal
    openClearHistoryModalBtn.addEventListener('click', openHistoryClearModal);
    closeHistoryClearModalBtn.addEventListener('click', closeHistoryClearModal);
    cancelHistoryClearBtn.addEventListener('click', closeHistoryClearModal);
    confirmHistoryClearBtn.addEventListener('click', handleConfirmHistoryClear);

    // Detail Modal Actions
    closeDetailModalBtn.addEventListener('click', closeDetailModal);
    detailAddTagBtn.addEventListener('click', handleAddDetailTag);
    detailNewTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddDetailTag();
    });

    detailStarBtn.addEventListener('click', async () => {
      if (!activeDetailItem) return;
      const newFav = !activeDetailItem.favorite;
      await storageService.updateItem(activeDetailItem.id, { favorite: newFav });
      activeDetailItem.favorite = newFav;
      detailStarIcon.textContent = newFav ? '★' : '☆';
      detailStarBtn.classList.toggle('active', newFav);
      await loadHistory();
    });

    detailDeleteBtn.addEventListener('click', async () => {
      if (!activeDetailItem) return;
      await storageService.deleteItem(activeDetailItem.id);
      closeDetailModal();
      showToast('Item deleted.', 'info');
      await loadHistory();
    });

    detailCopyBtn.addEventListener('click', async () => {
      if (!activeDetailItem) return;
      await handleCopy(activeDetailItem.text, detailCopyBtn);
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!detailModal.classList.contains('hidden')) {
          closeDetailModal();
          return;
        }
        if (!historyClearModal.classList.contains('hidden')) {
          closeHistoryClearModal();
          return;
        }
        if (searchQuery.length > 0) {
          mainSearchInput.value = '';
          searchQuery = '';
          clearMainSearchBtn.classList.add('hidden');
          filterAndRender();
        }
      }

      if (e.key === '/' && document.activeElement !== mainSearchInput && document.activeElement !== detailNewTagInput && document.activeElement !== limitNumber) {
        e.preventDefault();
        mainSearchInput.focus();
      }
    });
  }

  await init();
});
