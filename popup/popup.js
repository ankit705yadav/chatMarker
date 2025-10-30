/**
 * ChatMarker Popup Script
 * Handles UI logic and user interactions
 */

// State
let allMarkers = [];
let filteredMarkers = [];
let currentEditingNoteId = null;
let currentSettings = {};

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const platformFilter = document.getElementById('platformFilter');
const labelFilter = document.getElementById('labelFilter');
const dateFilter = document.getElementById('dateFilter');
const messageList = document.getElementById('messageList');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const noResultsState = document.getElementById('noResultsState');
const resultCount = document.getElementById('resultCount');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const settingsBtn = document.getElementById('settingsBtn');
const exportBtn = document.getElementById('exportBtn');

// Modals
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const noteModal = document.getElementById('noteModal');
const closeNote = document.getElementById('closeNote');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[ChatMarker Popup] Initializing...');

  // Load settings
  currentSettings = await getSettings();

  // Apply theme
  applyTheme();

  // Load and display markers
  await loadMarkers();

  // Set up event listeners
  setupEventListeners();

  console.log('[ChatMarker Popup] Initialized');
});

/**
 * Load all markers from storage
 */
async function loadMarkers() {
  try {
    showLoading();

    // Get all markers
    allMarkers = await getMarkersArray();
    console.log(`[ChatMarker Popup] Loaded ${allMarkers.length} markers`);

    // Apply current filters
    applyFilters();

  } catch (error) {
    console.error('[ChatMarker Popup] Error loading markers:', error);
    showToast('Error loading markers');
  }
}

/**
 * Apply current filters and search
 */
function applyFilters() {
  let filtered = [...allMarkers];

  // Apply search
  const searchTerm = searchInput.value.trim().toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(marker => {
      return (
        marker.messageText?.toLowerCase().includes(searchTerm) ||
        marker.sender?.toLowerCase().includes(searchTerm) ||
        marker.chatName?.toLowerCase().includes(searchTerm) ||
        marker.notes?.toLowerCase().includes(searchTerm)
      );
    });
  }

  // Apply platform filter
  const platform = platformFilter.value;
  if (platform !== 'all') {
    filtered = filtered.filter(m => m.platform === platform);
  }

  // Apply label filter
  const label = labelFilter.value;
  if (label !== 'all') {
    filtered = filtered.filter(m => m.labels && m.labels.includes(label));
  }

  // Apply date filter
  const dateRange = dateFilter.value;
  if (dateRange !== 'all') {
    const now = Date.now();
    let minTime = 0;

    switch (dateRange) {
      case 'today':
        minTime = now - (24 * 60 * 60 * 1000);
        break;
      case 'week':
        minTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        minTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
    }

    if (minTime > 0) {
      filtered = filtered.filter(m => m.createdAt >= minTime);
    }
  }

  filteredMarkers = filtered;
  displayMarkers();
}

/**
 * Display markers in the list
 */
function displayMarkers() {
  hideAllStates();

  if (allMarkers.length === 0) {
    // No markers at all
    emptyState.style.display = 'flex';
    resultCount.textContent = 'No marked messages';
    return;
  }

  if (filteredMarkers.length === 0) {
    // No results after filtering
    noResultsState.style.display = 'flex';
    resultCount.textContent = `0 of ${allMarkers.length} marked messages`;
    return;
  }

  // Display filtered markers
  messageList.innerHTML = '';

  filteredMarkers.forEach(marker => {
    const card = createMessageCard(marker);
    messageList.appendChild(card);
  });

  // Update result count
  if (filteredMarkers.length === allMarkers.length) {
    resultCount.textContent = `${allMarkers.length} marked message${allMarkers.length === 1 ? '' : 's'}`;
  } else {
    resultCount.textContent = `Showing ${filteredMarkers.length} of ${allMarkers.length}`;
  }
}

/**
 * Create a message card element
 */
function createMessageCard(marker) {
  const card = document.createElement('div');
  card.className = 'message-card';
  card.dataset.messageId = marker.messageId;

  // Platform icon
  const platformIcon = getPlatformIcon(marker.platform);

  // Time ago
  const timeAgo = getTimeAgo(marker.createdAt);

  // Labels HTML
  const labelsHTML = marker.labels && marker.labels.length > 0
    ? marker.labels.map(label => `<span class="label-badge ${label}">${capitalizeFirst(label)}</span>`).join('')
    : '';

  // Icons
  const noteIcon = marker.notes ? '<span class="message-icon" title="Has note">📝</span>' : '';
  const reminderIcon = ''; // Will be implemented with reminder feature

  card.innerHTML = `
    <div class="message-header">
      <div class="message-meta">
        <span class="platform-icon" title="${capitalizeFirst(marker.platform)}">${platformIcon}</span>
        <span class="sender-name">${escapeHtml(marker.sender || 'Unknown')}</span>
        <span class="message-time">${timeAgo}</span>
      </div>
      <div class="message-actions">
        <button class="message-action-btn edit-note-btn" title="Add/Edit Note" data-id="${marker.messageId}">
          📝
        </button>
        <button class="message-action-btn delete-btn" title="Delete Mark" data-id="${marker.messageId}">
          🗑️
        </button>
      </div>
    </div>
    <div class="message-text">${escapeHtml(marker.messageText || 'No message text')}</div>
    <div class="message-footer">
      ${labelsHTML}
      <div class="message-icons">
        ${noteIcon}
        ${reminderIcon}
      </div>
    </div>
  `;

  // Click card to navigate to message
  card.addEventListener('click', (e) => {
    // Don't navigate if clicking on action buttons
    if (e.target.closest('.message-action-btn')) {
      return;
    }
    navigateToMessage(marker.messageId);
  });

  // Edit note button
  card.querySelector('.edit-note-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openNoteEditor(marker);
  });

  // Delete button
  card.querySelector('.delete-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm('Delete this mark?')) {
      await deleteMarkerById(marker.messageId);
    }
  });

  return card;
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', (e) => {
    applyFilters();

    // Show/hide clear button
    if (e.target.value) {
      clearSearch.style.display = 'flex';
    } else {
      clearSearch.style.display = 'none';
    }
  });

  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    clearSearch.style.display = 'none';
    applyFilters();
  });

  // Filters
  platformFilter.addEventListener('change', applyFilters);
  labelFilter.addEventListener('change', applyFilters);
  dateFilter.addEventListener('change', applyFilters);

  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);

  // Settings
  settingsBtn.addEventListener('click', openSettings);
  closeSettings.addEventListener('click', closeSettingsModal);

  document.getElementById('saveSettings')?.addEventListener('click', saveSettings);
  document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
  document.getElementById('importDataBtn')?.addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  document.getElementById('importFileInput')?.addEventListener('change', importData);
  document.getElementById('clearAllBtn')?.addEventListener('click', clearAllData);

  // Note modal
  closeNote.addEventListener('click', closeNoteModal);
  document.getElementById('cancelNote')?.addEventListener('click', closeNoteModal);
  document.getElementById('saveNote')?.addEventListener('click', saveNote);
  document.getElementById('noteTextarea')?.addEventListener('input', updateCharCounter);

  // Export button in footer
  exportBtn.addEventListener('click', exportData);

  // Close modals on backdrop click
  settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
  });

  noteModal?.addEventListener('click', (e) => {
    if (e.target === noteModal) {
      closeNoteModal();
    }
  });
}

/**
 * Navigate to message in platform
 */
async function navigateToMessage(messageId) {
  try {
    await chrome.runtime.sendMessage({
      action: 'navigateToMessage',
      messageId: messageId
    });

    // Close popup after navigation
    window.close();
  } catch (error) {
    console.error('[ChatMarker Popup] Error navigating:', error);
    showToast('Error opening message');
  }
}

/**
 * Delete a marker
 */
async function deleteMarkerById(messageId) {
  try {
    await deleteMarker(messageId);
    showToast('Mark deleted');

    // Reload markers
    await loadMarkers();
  } catch (error) {
    console.error('[ChatMarker Popup] Error deleting marker:', error);
    showToast('Error deleting mark');
  }
}

/**
 * Open note editor
 */
function openNoteEditor(marker) {
  currentEditingNoteId = marker.messageId;

  // Set message preview
  document.getElementById('noteMessagePreview').textContent = marker.messageText || 'No message text';

  // Set current note
  const noteTextarea = document.getElementById('noteTextarea');
  noteTextarea.value = marker.notes || '';
  updateCharCounter();

  // Show modal
  noteModal.style.display = 'flex';
  noteTextarea.focus();
}

/**
 * Close note modal
 */
function closeNoteModal() {
  noteModal.style.display = 'none';
  currentEditingNoteId = null;
}

/**
 * Save note
 */
async function saveNote() {
  try {
    const noteText = document.getElementById('noteTextarea').value.trim();

    if (!currentEditingNoteId) return;

    // Update marker
    await updateMarker(currentEditingNoteId, {
      notes: noteText
    });

    showToast('Note saved');
    closeNoteModal();

    // Reload markers
    await loadMarkers();
  } catch (error) {
    console.error('[ChatMarker Popup] Error saving note:', error);
    showToast('Error saving note');
  }
}

/**
 * Update character counter
 */
function updateCharCounter() {
  const noteTextarea = document.getElementById('noteTextarea');
  const charCounter = document.getElementById('charCounter');
  const length = noteTextarea.value.length;
  charCounter.textContent = `${length} / 500`;

  if (length >= 500) {
    charCounter.style.color = 'var(--color-error)';
  } else {
    charCounter.style.color = 'var(--color-text-tertiary)';
  }
}

/**
 * Open settings modal
 */
async function openSettings() {
  // Load current settings
  const settings = await getSettings();

  // Apply to form
  document.getElementById('themeSelect').value = settings.theme || 'auto';
  document.getElementById('notificationSound').checked = settings.notificationSound !== false;
  document.getElementById('compactMode').checked = settings.compactMode === true;

  // Show modal
  settingsModal.style.display = 'flex';
}

/**
 * Close settings modal
 */
function closeSettingsModal() {
  settingsModal.style.display = 'none';
}

/**
 * Save settings
 */
async function saveSettings() {
  try {
    const newSettings = {
      theme: document.getElementById('themeSelect').value,
      notificationSound: document.getElementById('notificationSound').checked,
      compactMode: document.getElementById('compactMode').checked
    };

    await updateSettings(newSettings);
    currentSettings = newSettings;

    showToast('Settings saved');
    closeSettingsModal();

    // Apply theme
    applyTheme();
  } catch (error) {
    console.error('[ChatMarker Popup] Error saving settings:', error);
    showToast('Error saving settings');
  }
}

/**
 * Export data
 */
async function exportData() {
  try {
    const data = await exportData();

    // Create download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatmarker-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Data exported');
  } catch (error) {
    console.error('[ChatMarker Popup] Error exporting data:', error);
    showToast('Error exporting data');
  }
}

/**
 * Import data
 */
async function importData(event) {
  try {
    const file = event.target.files[0];
    if (!file) return;

    const text = await file.text();
    const data = JSON.parse(text);

    await importData(data);

    showToast('Data imported');

    // Reload markers
    await loadMarkers();
  } catch (error) {
    console.error('[ChatMarker Popup] Error importing data:', error);
    showToast('Error importing data');
  }
}

/**
 * Clear all data
 */
async function clearAllData() {
  if (!confirm('Are you sure you want to delete ALL marked messages? This cannot be undone.')) {
    return;
  }

  if (!confirm('Really delete everything? This is your last chance!')) {
    return;
  }

  try {
    await clearAllMarkers();
    showToast('All marks cleared');

    // Reload
    await loadMarkers();
  } catch (error) {
    console.error('[ChatMarker Popup] Error clearing data:', error);
    showToast('Error clearing data');
  }
}

/**
 * Toggle theme
 */
function toggleTheme() {
  const isDark = document.body.classList.contains('dark-mode');

  if (isDark) {
    document.body.classList.remove('dark-mode');
    themeIcon.textContent = '🌙';
    localStorage.setItem('chatmarker-theme', 'light');
  } else {
    document.body.classList.add('dark-mode');
    themeIcon.textContent = '☀️';
    localStorage.setItem('chatmarker-theme', 'dark');
  }
}

/**
 * Apply theme based on settings
 */
function applyTheme() {
  const theme = currentSettings.theme || 'auto';
  let isDark = false;

  if (theme === 'dark') {
    isDark = true;
  } else if (theme === 'light') {
    isDark = false;
  } else {
    // Auto - use system preference
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  if (isDark) {
    document.body.classList.add('dark-mode');
    themeIcon.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    themeIcon.textContent = '🌙';
  }
}

/**
 * Show loading state
 */
function showLoading() {
  hideAllStates();
  loadingState.style.display = 'flex';
}

/**
 * Hide all states
 */
function hideAllStates() {
  loadingState.style.display = 'none';
  emptyState.style.display = 'none';
  noResultsState.style.display = 'none';
}

/**
 * Show toast notification
 */
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  toastMessage.textContent = message;
  toast.style.display = 'block';
  toast.classList.remove('fade-out');

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      toast.style.display = 'none';
    }, 200);
  }, duration);
}

/**
 * Get platform icon
 */
function getPlatformIcon(platform) {
  const icons = {
    whatsapp: '🟢',
    messenger: '🔵',
    instagram: '📷',
    linkedin: '💼'
  };
  return icons[platform] || '💬';
}

/**
 * Get time ago string
 */
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
