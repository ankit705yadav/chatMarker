/**
 * ChatMarker Popup Script
 * Handles UI logic and user interactions
 */

// State
let allMarkers = [];
let allReminders = {};
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
const statsBtn = document.getElementById('statsBtn');
const settingsBtn = document.getElementById('settingsBtn');
const exportBtn = document.getElementById('exportBtn');

// Modals
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const statsModal = document.getElementById('statsModal');
const closeStats = document.getElementById('closeStats');
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

    // Get all reminders
    allReminders = await getAllReminders();
    console.log(`[ChatMarker Popup] Loaded ${Object.keys(allReminders).length} reminders`);

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
  messageList.innerHTML = ''; // Clear message list first

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

  filteredMarkers.forEach(marker => {
    const card = createMessageCard(marker);
    messageList.appendChild(card);
  });

  // Update result count - always show "Showing X of Y" format per design spec
  resultCount.textContent = `Showing ${filteredMarkers.length} of ${allMarkers.length} marked message${allMarkers.length === 1 ? '' : 's'}`;
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
  const platformName = capitalizeFirst(marker.platform);

  // Time ago
  const timeAgo = getTimeAgo(marker.createdAt);

  // Chat name and sender
  const chatName = marker.chatName || marker.sender || 'Unknown';
  const senderName = marker.sender || 'Unknown';

  // Generate profile initials (first letter of chat name)
  const profileInitials = chatName.charAt(0).toUpperCase();

  // Labels HTML
  const labelsHTML = marker.labels && marker.labels.length > 0
    ? marker.labels.map(label => `<span class="label-badge ${label}">${capitalizeFirst(label)}</span>`).join('')
    : '';

  // Find active reminder for this message
  const messageReminder = Object.values(allReminders).find(
    r => r.messageId === marker.messageId && r.active && !r.firedAt
  );

  // Icons
  const noteIcon = marker.notes ? '<span class="message-icon" title="Has note">📝</span>' : '';
  const reminderIcon = messageReminder ? '<span class="message-icon" title="Has reminder">⏰</span>' : '';

  // Note preview HTML
  const notePreviewHTML = marker.notes && marker.notes.trim()
    ? `<div class="message-note-preview">
         <div class="note-preview-icon">📝</div>
         <div class="note-preview-text">${escapeHtml(marker.notes)}</div>
       </div>`
    : '';

  // Reminder preview HTML
  const reminderPreviewHTML = messageReminder
    ? `<div class="message-reminder-preview">
         <div class="reminder-preview-icon">⏰</div>
         <div class="reminder-preview-text">
           Reminder: ${formatReminderTime(messageReminder.reminderTime)}
         </div>
       </div>`
    : '';

  card.innerHTML = `
    <div class="message-header">
      <div class="message-meta">
        <div class="profile-avatar">
          <span class="avatar-initials">${profileInitials}</span>
          <span class="platform-badge" title="${platformName}">${platformIcon}</span>
        </div>
        <div class="message-info">
          <div class="chat-name">${escapeHtml(chatName)}</div>
          <div class="message-details">
            <span class="platform-name">${platformName}</span>
            <span class="detail-separator">•</span>
            <span class="sender-name-small">${escapeHtml(senderName)}</span>
            <span class="detail-separator">•</span>
            <span class="time-ago">${timeAgo}</span>
          </div>
        </div>
      </div>
      <div class="message-actions">
        <button class="message-action-btn copy-btn" title="Copy Message Text" data-id="${marker.messageId}">
          📋
        </button>
        <button class="message-action-btn edit-note-btn" title="Add/Edit Note" data-id="${marker.messageId}">
          📝
        </button>
        <button class="message-action-btn delete-btn" title="Delete Mark" data-id="${marker.messageId}">
          🗑️
        </button>
      </div>
    </div>
    <div class="message-text">${escapeHtml(marker.messageText || 'No message text')}</div>
    ${notePreviewHTML}
    ${reminderPreviewHTML}
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

  // Copy button
  card.querySelector('.copy-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    copyMessageText(marker);
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

  // Statistics
  statsBtn.addEventListener('click', showStatistics);
  closeStats.addEventListener('click', closeStatisticsModal);

  // Settings
  settingsBtn.addEventListener('click', openSettings);
  closeSettings.addEventListener('click', closeSettingsModal);

  document.getElementById('saveSettings')?.addEventListener('click', saveSettings);
  document.getElementById('exportDataBtn')?.addEventListener('click', showExportModal);
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

  // Tutorial button
  document.getElementById('tutorialBtn')?.addEventListener('click', showTutorial);

  // Export button in footer
  exportBtn.addEventListener('click', showExportModal);

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
 * Copy message text to clipboard
 */
async function copyMessageText(marker) {
  try {
    // Format text with context
    const date = new Date(marker.createdAt || marker.timestamp).toLocaleString();
    const platform = capitalizeFirst(marker.platform);
    const sender = marker.sender || 'Unknown';
    const messageText = marker.messageText || '';

    // Create formatted text
    const textWithContext = `${sender} (${platform}) - ${date}\n${messageText}`;

    // Copy to clipboard using Clipboard API
    await navigator.clipboard.writeText(textWithContext);

    showToast('✅ Copied to clipboard');
  } catch (error) {
    console.error('[ChatMarker Popup] Error copying text:', error);

    // Fallback: try copying just the message text
    try {
      await navigator.clipboard.writeText(marker.messageText || '');
      showToast('✅ Copied message text');
    } catch (fallbackError) {
      showToast('❌ Failed to copy');
    }
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
 * Show statistics modal
 */
async function showStatistics() {
  try {
    const markers = await getMarkersArray();
    const reminders = await getAllReminders();

    // Calculate statistics
    const totalMarks = markers.length;

    // Marks by label
    const labelCounts = {
      urgent: 0,
      important: 0,
      completed: 0,
      followup: 0,
      question: 0,
      unlabeled: 0
    };

    markers.forEach(marker => {
      if (!marker.labels || marker.labels.length === 0) {
        labelCounts.unlabeled++;
      } else {
        marker.labels.forEach(label => {
          if (labelCounts[label] !== undefined) {
            labelCounts[label]++;
          }
        });
      }
    });

    // Marks with notes
    const marksWithNotes = markers.filter(m => m.notes && m.notes.trim()).length;

    // Active reminders
    const activeReminders = Object.values(reminders).filter(r => r.active && !r.firedAt).length;

    // Marks by date
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const thisWeek = now - (7 * 24 * 60 * 60 * 1000);
    const thisMonth = now - (30 * 24 * 60 * 60 * 1000);

    const marksToday = markers.filter(m => (m.createdAt || m.timestamp) >= today).length;
    const marksThisWeek = markers.filter(m => (m.createdAt || m.timestamp) >= thisWeek).length;
    const marksThisMonth = markers.filter(m => (m.createdAt || m.timestamp) >= thisMonth).length;

    // Top chats
    const chatCounts = {};
    markers.forEach(marker => {
      const chatName = marker.chatName || marker.chatId || 'Unknown';
      chatCounts[chatName] = (chatCounts[chatName] || 0) + 1;
    });

    const topChats = Object.entries(chatCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Build stats HTML
    const statsBody = document.getElementById('statsBody');
    statsBody.innerHTML = `
      <div class="stats-section">
        <h3 style="margin-bottom: 12px; font-size: 16px;">📈 Overview</h3>
        <div class="stat-row">
          <span class="stat-label">Total Marks:</span>
          <span class="stat-value">${totalMarks}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">With Notes:</span>
          <span class="stat-value">${marksWithNotes}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Active Reminders:</span>
          <span class="stat-value">${activeReminders}</span>
        </div>
      </div>

      <div class="stats-section">
        <h3 style="margin-bottom: 12px; font-size: 16px;">🏷️ By Label</h3>
        <div class="stat-row">
          <span class="stat-label">🔴 Urgent:</span>
          <span class="stat-value">${labelCounts.urgent}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">🟡 Important:</span>
          <span class="stat-value">${labelCounts.important}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">🟢 Completed:</span>
          <span class="stat-value">${labelCounts.completed}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">🔵 Follow-up:</span>
          <span class="stat-value">${labelCounts.followup}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">🟣 Question:</span>
          <span class="stat-value">${labelCounts.question}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">⚪ Unlabeled:</span>
          <span class="stat-value">${labelCounts.unlabeled}</span>
        </div>
      </div>

      <div class="stats-section">
        <h3 style="margin-bottom: 12px; font-size: 16px;">📅 Timeline</h3>
        <div class="stat-row">
          <span class="stat-label">Today:</span>
          <span class="stat-value">${marksToday}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">This Week:</span>
          <span class="stat-value">${marksThisWeek}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">This Month:</span>
          <span class="stat-value">${marksThisMonth}</span>
        </div>
      </div>

      ${topChats.length > 0 ? `
      <div class="stats-section">
        <h3 style="margin-bottom: 12px; font-size: 16px;">💬 Top Chats</h3>
        ${topChats.map(([chat, count]) => `
          <div class="stat-row">
            <span class="stat-label">${escapeHtml(chat.substring(0, 25))}${chat.length > 25 ? '...' : ''}:</span>
            <span class="stat-value">${count}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}
    `;

    statsModal.style.display = 'flex';
  } catch (error) {
    console.error('[ChatMarker Popup] Error showing statistics:', error);
    showToast('Error loading statistics');
  }
}

/**
 * Close statistics modal
 */
function closeStatisticsModal() {
  statsModal.style.display = 'none';
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
 * Show export format modal
 */
function showExportModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h2>Export Data</h2>
        <button class="modal-close" id="closeExportModal">✕</button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom: 16px; color: var(--color-text-secondary);">
          Choose export format:
        </p>
        <button class="btn-primary" id="exportJsonBtn" style="width: 100%; margin-bottom: 8px;">
          📄 Export as JSON
        </button>
        <button class="btn-primary" id="exportCsvBtn" style="width: 100%; margin-bottom: 8px;">
          📊 Export as CSV
        </button>
        <button class="btn-primary" id="exportMarkdownBtn" style="width: 100%;">
          📝 Export as Markdown
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  modal.querySelector('#closeExportModal').addEventListener('click', () => modal.remove());
  modal.querySelector('#exportJsonBtn').addEventListener('click', () => {
    exportToJSON();
    modal.remove();
  });
  modal.querySelector('#exportCsvBtn').addEventListener('click', () => {
    exportToCSV();
    modal.remove();
  });
  modal.querySelector('#exportMarkdownBtn').addEventListener('click', () => {
    exportToMarkdown();
    modal.remove();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

/**
 * Export data as JSON
 */
async function exportToJSON() {
  try {
    const data = await getAllData();

    // Create download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatmarker-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('✅ Exported as JSON');
  } catch (error) {
    console.error('[ChatMarker Popup] Error exporting JSON:', error);
    showToast('Error exporting data');
  }
}

/**
 * Export data as CSV
 */
async function exportToCSV() {
  try {
    const markers = await getMarkersArray();

    // CSV headers
    const headers = ['Date', 'Platform', 'Sender', 'Chat', 'Message', 'Labels', 'Notes', 'Reminder'];

    // CSV rows
    const rows = markers.map(marker => {
      const date = new Date(marker.createdAt || marker.timestamp).toLocaleString();
      const platform = capitalizeFirst(marker.platform || 'unknown');
      const sender = marker.sender || '';
      const chat = marker.chatName || marker.chatId || '';
      const message = (marker.messageText || '').replace(/"/g, '""'); // Escape quotes
      const labels = (marker.labels || []).join(', ');
      const notes = (marker.notes || '').replace(/"/g, '""'); // Escape quotes

      // Get reminder info
      let reminderText = '';
      const reminder = Object.values(allReminders).find(r => r.messageId === marker.messageId && r.active);
      if (reminder) {
        reminderText = new Date(reminder.reminderTime).toLocaleString();
      }

      return [date, platform, sender, chat, `"${message}"`, labels, `"${notes}"`, reminderText];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatmarker-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`✅ Exported ${markers.length} marks as CSV`);
  } catch (error) {
    console.error('[ChatMarker Popup] Error exporting CSV:', error);
    showToast('Error exporting CSV');
  }
}

/**
 * Export data as Markdown
 */
async function exportToMarkdown() {
  try {
    const markers = await getMarkersArray();

    // Group by label
    const grouped = {};
    const unlabeled = [];

    markers.forEach(marker => {
      if (marker.labels && marker.labels.length > 0) {
        marker.labels.forEach(label => {
          if (!grouped[label]) grouped[label] = [];
          grouped[label].push(marker);
        });
      } else {
        unlabeled.push(marker);
      }
    });

    // Build markdown
    let markdown = `# ChatMarker Export\n\n`;
    markdown += `**Exported:** ${new Date().toLocaleString()}  \n`;
    markdown += `**Total Marks:** ${markers.length}\n\n`;
    markdown += `---\n\n`;

    // Export by label
    const labelOrder = ['urgent', 'important', 'followup', 'question', 'completed'];
    const labelEmoji = {
      urgent: '🔴',
      important: '🟡',
      followup: '🔵',
      question: '🟣',
      completed: '🟢'
    };

    labelOrder.forEach(label => {
      if (grouped[label] && grouped[label].length > 0) {
        markdown += `## ${labelEmoji[label]} ${capitalizeFirst(label)} (${grouped[label].length})\n\n`;

        grouped[label].forEach(marker => {
          markdown += `### ${marker.sender || 'Unknown'}\n`;
          markdown += `**Date:** ${new Date(marker.createdAt || marker.timestamp).toLocaleString()}  \n`;
          markdown += `**Platform:** ${capitalizeFirst(marker.platform)}  \n`;
          markdown += `**Chat:** ${marker.chatName || marker.chatId || 'N/A'}  \n\n`;
          markdown += `> ${marker.messageText || 'No text'}\n\n`;

          if (marker.notes) {
            markdown += `**Note:** ${marker.notes}\n\n`;
          }

          const reminder = Object.values(allReminders).find(r => r.messageId === marker.messageId && r.active);
          if (reminder) {
            markdown += `⏰ **Reminder:** ${new Date(reminder.reminderTime).toLocaleString()}\n\n`;
          }

          markdown += `---\n\n`;
        });
      }
    });

    // Unlabeled
    if (unlabeled.length > 0) {
      markdown += `## 📌 Unlabeled (${unlabeled.length})\n\n`;

      unlabeled.forEach(marker => {
        markdown += `### ${marker.sender || 'Unknown'}\n`;
        markdown += `**Date:** ${new Date(marker.createdAt || marker.timestamp).toLocaleString()}  \n`;
        markdown += `**Platform:** ${capitalizeFirst(marker.platform)}  \n\n`;
        markdown += `> ${marker.messageText || 'No text'}\n\n`;

        if (marker.notes) {
          markdown += `**Note:** ${marker.notes}\n\n`;
        }

        markdown += `---\n\n`;
      });
    }

    // Create download
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatmarker-export-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`✅ Exported ${markers.length} marks as Markdown`);
  } catch (error) {
    console.error('[ChatMarker Popup] Error exporting Markdown:', error);
    showToast('Error exporting Markdown');
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

    await importAllData(data);

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

/**
 * Format reminder time
 */
function formatReminderTime(timestamp) {
  const now = Date.now();
  const reminderDate = new Date(timestamp);
  const diff = timestamp - now;

  // If reminder is in the past
  if (diff < 0) {
    return 'Overdue';
  }

  // If less than 1 hour away
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `in ${minutes} min${minutes !== 1 ? 's' : ''}`;
  }

  // If less than 24 hours away
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  // If less than 7 days away
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `in ${days} day${days !== 1 ? 's' : ''}`;
  }

  // Otherwise show the date and time
  const dateStr = reminderDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
  const timeStr = reminderDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });
  return `${dateStr} at ${timeStr}`;
}

/**
 * Show tutorial/shortcuts help
 */
function showTutorial() {
  const helpText = `⌨️ KEYBOARD SHORTCUTS

On WhatsApp Web, hover over any message and press:

M - Mark/Unmark message
N - Add/Edit note (marked messages)
R - Set reminder (marked messages)
1 - Toggle Urgent label
2 - Toggle Important label
3 - Toggle Completed label
4 - Toggle Follow-up label
5 - Toggle Question label
Del - Delete mark
? - Show shortcuts help

✨ OTHER FEATURES

• Right-click star icon for labels menu
• Click extension icon to view all marks
• Use filters to organize marks
• Dark mode toggle (sun/moon icon)
• Export your data anytime`;

  alert(helpText);
}
