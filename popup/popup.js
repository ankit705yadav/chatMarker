/**
 * ChatMarker Popup Script
 * Handles UI logic and user interactions
 */

// State - Chat-only version
let allChatMarkers = [];
let allReminders = {};
let filteredChatMarkers = [];
let currentEditingNoteId = null;
let currentSettings = {};
let currentPlatform = 'all'; // 'all', 'whatsapp', 'reddit', etc.

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const messageList = document.getElementById('messageList');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const noResultsState = document.getElementById('noResultsState');
const resultCount = document.getElementById('resultCount');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const statsBtn = document.getElementById('statsBtn');
const settingsBtn = document.getElementById('settingsBtn');

// Dashboard elements
const totalMarksCount = document.getElementById('totalMarksCount');
const activeRemindersCount = document.getElementById('activeRemindersCount');
const labelCheckboxes = document.querySelectorAll('.label-checkbox');
const dateRadios = document.querySelectorAll('input[name="dateFilter"]');
const platformTabs = document.querySelectorAll('.platform-tab');
const exportBtnSidebar = document.getElementById('exportBtnSidebar');
const clearAllBtnSidebar = document.getElementById('clearAllBtnSidebar');

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

  // Check for pending actions (from context menu)
  await checkPendingActions();

  console.log('[ChatMarker Popup] Initialized');
});

/**
 * Check for pending actions from context menu
 */
async function checkPendingActions() {
  try {
    const { pendingAction, pendingChatMarker } = await chrome.storage.local.get([
      'pendingAction',
      'pendingChatMarker'
    ]);

    if (pendingAction && pendingChatMarker) {
      console.log('[ChatMarker Popup] Found pending action:', pendingAction);

      // Clear the pending action
      await chrome.storage.local.remove(['pendingAction', 'pendingChatMarker']);

      // Execute the pending action
      if (pendingAction === 'openNote') {
        openNoteEditorForChat(pendingChatMarker);
      } else if (pendingAction === 'openReminder') {
        openReminderPickerForChat(pendingChatMarker);
      }
    }
  } catch (error) {
    console.error('[ChatMarker Popup] Error checking pending actions:', error);
  }
}

/**
 * Load all chat markers from storage
 */
async function loadMarkers() {
  try {
    showLoading();

    // Get all chat markers
    allChatMarkers = await getChatMarkersArray();
    console.log(`[ChatMarker Popup] Loaded ${allChatMarkers.length} chat markers`);

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
 * Apply current filters and search - Chat-only version
 */
function applyFilters() {
  let filtered = [...allChatMarkers];

  // Apply search
  const searchTerm = searchInput.value.trim().toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(chat => {
      return (
        chat.chatName?.toLowerCase().includes(searchTerm) ||
        chat.notes?.toLowerCase().includes(searchTerm)
      );
    });
  }

  // Apply platform filter (from active tab)
  const activeTab = document.querySelector('.platform-tab.active');
  const platform = activeTab ? activeTab.dataset.platform : 'all';
  if (platform !== 'all') {
    filtered = filtered.filter(c => c.platform === platform);
  }

  // Apply label filter (multi-select checkboxes)
  const selectedLabels = Array.from(labelCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  if (selectedLabels.length > 0 && selectedLabels.length < 5) {
    filtered = filtered.filter(c => {
      if (!c.labels || c.labels.length === 0) return false;
      return c.labels.some(label => selectedLabels.includes(label));
    });
  }

  // Apply date filter (radio buttons)
  const selectedDateRadio = document.querySelector('input[name="dateFilter"]:checked');
  const dateRange = selectedDateRadio ? selectedDateRadio.value : 'all';

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
      filtered = filtered.filter(c => c.createdAt >= minTime);
    }
  }

  filteredChatMarkers = filtered;

  // Display chats
  displayChatMarkers();
  updateTabCounts();
  updateStatsBox();
}

/**
 * Update stats box in sidebar
 */
function updateStatsBox() {
  if (totalMarksCount) {
    totalMarksCount.textContent = allChatMarkers.length;
  }

  if (activeRemindersCount) {
    const activeCount = Object.values(allReminders).filter(r => r.active && !r.firedAt).length;
    activeRemindersCount.textContent = activeCount;
  }
}

/**
 * Update tab counts
 */
function updateTabCounts() {
  const allCount = allChatMarkers.length;
  const facebookCount = allChatMarkers.filter(c => c.platform === 'facebook').length;
  const whatsappCount = allChatMarkers.filter(c => c.platform === 'whatsapp').length;
  const redditCount = allChatMarkers.filter(c => c.platform === 'reddit').length;
  const instagramCount = allChatMarkers.filter(c => c.platform === 'instagram').length;

  const tabCountAll = document.getElementById('tabCountAll');
  const tabCountFacebook = document.getElementById('tabCountFacebook');
  const tabCountWhatsapp = document.getElementById('tabCountWhatsapp');
  const tabCountReddit = document.getElementById('tabCountReddit');
  const tabCountInstagram = document.getElementById('tabCountInstagram');

  if (tabCountAll) tabCountAll.textContent = allCount;
  if (tabCountFacebook) tabCountFacebook.textContent = facebookCount;
  if (tabCountWhatsapp) tabCountWhatsapp.textContent = whatsappCount;
  if (tabCountReddit) tabCountReddit.textContent = redditCount;
  if (tabCountInstagram) tabCountInstagram.textContent = instagramCount;
}

/**
 * Display chat markers in the list
 */
function displayChatMarkers() {
  hideAllStates();
  messageList.innerHTML = ''; // Clear list first

  if (allChatMarkers.length === 0) {
    // No chat markers at all
    emptyState.style.display = 'flex';
    // Update empty state text for chats
    const emptyTitle = document.querySelector('#emptyState .empty-title');
    const emptyText = document.querySelector('#emptyState .empty-text');
    if (emptyTitle) emptyTitle.textContent = 'No marked chats yet';
    if (emptyText) emptyText.innerHTML = 'Right-click anywhere on a chat in WhatsApp or Reddit<br>and select "Mark This Chat"';
    resultCount.textContent = 'No marked chats';
    return;
  }

  if (filteredChatMarkers.length === 0) {
    // No results after filtering
    noResultsState.style.display = 'flex';
    resultCount.textContent = `0 of ${allChatMarkers.length} marked chats`;
    return;
  }

  // Display filtered chat markers
  filteredChatMarkers.forEach(chatMarker => {
    const card = createChatCard(chatMarker);
    messageList.appendChild(card);
  });

  // Update result count
  resultCount.textContent = `Showing ${filteredChatMarkers.length} of ${allChatMarkers.length} marked chat${allChatMarkers.length === 1 ? '' : 's'}`;
}

/**
 * Create a chat card element
 */
function createChatCard(chatMarker) {
  const card = document.createElement('div');
  card.className = 'message-card chat-card';
  card.dataset.chatMarkerId = chatMarker.chatMarkerId;

  // Platform icon
  const platformIcon = getPlatformIcon(chatMarker.platform);
  const platformName = capitalizeFirst(chatMarker.platform);

  // Time ago
  const timeAgo = getTimeAgo(chatMarker.createdAt);

  // Generate profile initials
  const generateInitials = (name) => {
    if (!name || name === 'Unknown' || name === 'Unknown Chat') {
      return '?';
    }
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const profileInitials = generateInitials(chatMarker.chatName);

  // Labels HTML
  const labelsHTML = chatMarker.labels && chatMarker.labels.length > 0
    ? chatMarker.labels.map(label => `<span class="label-badge ${label}">${capitalizeFirst(label)}</span>`).join('')
    : '';

  // Find active reminder for this chat
  const chatReminder = Object.values(allReminders).find(
    r => r.messageId === chatMarker.chatMarkerId && r.active && !r.firedAt
  );

  // Note preview HTML
  const notePreviewHTML = chatMarker.notes && chatMarker.notes.trim()
    ? `<div class="message-note-preview">
         <div class="note-preview-icon">📝</div>
         <div class="note-preview-text">${escapeHtml(chatMarker.notes)}</div>
       </div>`
    : '';

  // Reminder preview HTML
  const reminderPreviewHTML = chatReminder
    ? `<div class="message-reminder-preview">
         <div class="reminder-preview-icon">⏰</div>
         <div class="reminder-preview-text">
           Reminder: ${formatReminderTime(chatReminder.reminderTime)}
         </div>
       </div>`
    : '';

  card.innerHTML = `
    <div class="message-header">
      <div class="message-meta">
        <div class="profile-avatar">
          <div class="avatar-circle">${profileInitials}</div>
        </div>
        <div class="message-info">
          <div class="chat-name-row">
            <span class="chat-name">${escapeHtml(chatMarker.chatName)}</span>
            <span class="platform-badge">${platformIcon} ${platformName}</span>
          </div>
          <div class="message-timestamp">Marked ${timeAgo}</div>
        </div>
      </div>
      <div class="message-actions">
        <button class="icon-btn" title="Add/Edit Labels" data-action="labels">
          <span>🏷️</span>
        </button>
        <button class="icon-btn" title="Add/Edit Note" data-action="note">
          <span>📝</span>
        </button>
        <button class="icon-btn" title="Set/Edit Reminder" data-action="reminder">
          <span>⏰</span>
        </button>
        <button class="icon-btn delete-btn" title="Unmark Chat" data-action="delete">
          <span>🗑️</span>
        </button>
      </div>
    </div>
    ${labelsHTML ? `<div class="message-labels">${labelsHTML}</div>` : ''}
    ${notePreviewHTML}
    ${reminderPreviewHTML}
  `;

  // Add click handler for card actions
  const actionButtons = card.querySelectorAll('[data-action]');
  actionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      handleChatCardAction(action, chatMarker);
    });
  });

  return card;
}

/**
 * Handle chat card actions
 */
function handleChatCardAction(action, chatMarker) {
  switch (action) {
    case 'labels':
      openLabelsModalForChat(chatMarker);
      break;
    case 'note':
      openNoteEditorForChat(chatMarker);
      break;
    case 'reminder':
      openReminderPickerForChat(chatMarker);
      break;
    case 'delete':
      removeChatMarker(chatMarker);
      break;
  }
}

/**
 * Open labels modal for a chat
 */
function openLabelsModalForChat(chatMarker) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal';
  overlay.style.display = 'flex';

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.maxWidth = '400px';

  // Available labels
  const availableLabels = [
    { id: 'urgent', name: 'Urgent', emoji: '🔴', color: '#EF4444' },
    { id: 'important', name: 'Important', emoji: '🟡', color: '#F59E0B' },
    { id: 'completed', name: 'Completed', emoji: '🟢', color: '#10B981' },
    { id: 'followup', name: 'Follow-up', emoji: '🔵', color: '#3B82F6' },
    { id: 'question', name: 'Question', emoji: '🟣', color: '#8B5CF6' }
  ];

  // Current labels
  const currentLabels = chatMarker.labels || [];

  modalContent.innerHTML = `
    <div class="modal-header">
      <h2>Manage Labels</h2>
      <button class="modal-close" id="closeLabelsModal">✕</button>
    </div>
    <div class="modal-body">
      <div style="padding: 12px; background: var(--color-surface); border-radius: 6px; margin-bottom: 16px;">
        <strong>Chat:</strong>
        <div style="color: var(--color-text-secondary); margin-top: 4px;">${escapeHtml(chatMarker.chatName)}</div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${availableLabels.map(label => `
          <label style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 2px solid ${currentLabels.includes(label.id) ? label.color : 'var(--color-border)'}; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
            <input type="checkbox" value="${label.id}" ${currentLabels.includes(label.id) ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
            <span style="font-size: 20px;">${label.emoji}</span>
            <span style="font-weight: 500; flex: 1;">${label.name}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" id="cancelLabels">Cancel</button>
      <button class="btn-primary" id="saveLabels">Save Labels</button>
    </div>
  `;

  overlay.appendChild(modalContent);
  document.body.appendChild(overlay);

  // Close handlers
  const closeModal = () => overlay.remove();
  document.getElementById('closeLabelsModal').addEventListener('click', closeModal);
  document.getElementById('cancelLabels').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Save handler
  document.getElementById('saveLabels').addEventListener('click', async () => {
    const checkboxes = modalContent.querySelectorAll('input[type="checkbox"]');
    const selectedLabels = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    try {
      await updateChatMarker(chatMarker.chatMarkerId, {
        labels: selectedLabels
      });

      showToast('Labels updated');
      closeModal();
      await loadMarkers();
    } catch (error) {
      console.error('[ChatMarker Popup] Error updating labels:', error);
      showToast('Error updating labels');
    }
  });

  // Update border colors on checkbox change
  const checkboxes = modalContent.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox, index) => {
    checkbox.addEventListener('change', () => {
      const label = checkbox.closest('label');
      const labelColor = availableLabels[index].color;
      label.style.borderColor = checkbox.checked ? labelColor : 'var(--color-border)';
    });
  });
}

/**
 * Delete a chat marker
 */
async function removeChatMarker(chatMarker) {
  if (!confirm(`Unmark chat "${chatMarker.chatName}"?`)) {
    return;
  }

  try {
    await deleteChatMarker(chatMarker.chatMarkerId);
    showToast(`Chat "${chatMarker.chatName}" unmarked`);
    await loadMarkers();
  } catch (error) {
    console.error('[ChatMarker Popup] Error deleting chat marker:', error);
    showToast('Error unmarking chat');
  }
}

/**
 * Open note editor for a chat
 */
function openNoteEditorForChat(chatMarker) {
  // Store the chat marker ID
  currentEditingNoteId = chatMarker.chatMarkerId;

  // Set chat preview
  const noteMessagePreview = document.getElementById('noteMessagePreview');
  noteMessagePreview.textContent = `Chat: ${chatMarker.chatName}`;

  // Update modal title
  const modalTitle = noteModal.querySelector('.modal-header h2');
  if (modalTitle) modalTitle.textContent = 'Add Note to Chat';

  // Set current note
  const noteTextarea = document.getElementById('noteTextarea');
  noteTextarea.value = chatMarker.notes || '';
  updateCharCounter();

  // Show modal
  noteModal.style.display = 'flex';
  noteTextarea.focus();
}

/**
 * Open reminder picker for a chat
 */
function openReminderPickerForChat(chatMarker) {
  const reminderModal = document.getElementById('reminderModal');
  const reminderMessagePreview = document.getElementById('reminderMessagePreview');
  const customReminderDate = document.getElementById('customReminderDate');
  const currentReminderInfo = document.getElementById('currentReminderInfo');
  const currentReminderText = document.getElementById('currentReminderText');

  // Store current chat marker ID
  currentEditingNoteId = chatMarker.chatMarkerId;

  // Update modal title
  const modalTitle = reminderModal.querySelector('.modal-header h2');
  if (modalTitle) modalTitle.textContent = 'Set Reminder for Chat';

  // Show chat preview
  reminderMessagePreview.textContent = `Chat: ${chatMarker.chatName}`;

  // Check if reminder already exists
  const existingReminder = Object.values(allReminders).find(
    r => r.messageId === chatMarker.chatMarkerId && r.active && !r.firedAt
  );

  if (existingReminder) {
    currentReminderInfo.style.display = 'block';
    currentReminderText.textContent = formatReminderTime(existingReminder.reminderTime);
  } else {
    currentReminderInfo.style.display = 'none';
  }

  // Set min datetime to now
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  customReminderDate.min = `${year}-${month}-${day}T${hours}:${minutes}`;

  // Show modal
  reminderModal.style.display = 'flex';
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

  // Generate profile initials (first letter of chat name, or first letter of each word for 2-word names)
  const generateInitials = (name) => {
    if (!name || name === 'Unknown' || name === 'Unknown Chat') {
      return '?';
    }
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      // Two or more words: use first letter of first two words
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    // Single word: use first letter
    return name.charAt(0).toUpperCase();
  };

  const profileInitials = generateInitials(chatName);

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
        <button class="message-action-btn edit-reminder-btn" title="Set/Edit Reminder" data-id="${marker.messageId}">
          ⏰
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

  // Edit reminder button
  card.querySelector('.edit-reminder-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openReminderPicker(marker);
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
 * Set up event listeners - Chat-only version
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

  // Label checkboxes
  labelCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
  });

  // Date radio buttons
  dateRadios.forEach(radio => {
    radio.addEventListener('change', applyFilters);
  });

  // Platform tabs
  platformTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      platformTabs.forEach(t => t.classList.remove('active'));
      // Add active class to clicked tab
      tab.classList.add('active');
      // Apply filters
      applyFilters();
    });
  });

  // Sidebar action buttons
  if (exportBtnSidebar) {
    exportBtnSidebar.addEventListener('click', showExportModal);
  }

  if (clearAllBtnSidebar) {
    clearAllBtnSidebar.addEventListener('click', clearAllData);
  }

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

  // Reminder modal
  const closeReminder = document.getElementById('closeReminder');
  const cancelReminder = document.getElementById('cancelReminder');
  const saveReminder = document.getElementById('saveReminder');
  const reminderModal = document.getElementById('reminderModal');
  const deleteReminderBtn = document.getElementById('deleteReminderBtn');
  const reminderQuickBtns = document.querySelectorAll('.reminder-quick-btn');

  closeReminder?.addEventListener('click', closeReminderModal);
  cancelReminder?.addEventListener('click', closeReminderModal);
  saveReminder?.addEventListener('click', () => saveReminderFromModal());
  deleteReminderBtn?.addEventListener('click', deleteExistingReminder);

  // Quick reminder buttons
  reminderQuickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = parseInt(btn.dataset.minutes);
      saveReminderFromModal(minutes);
    });
  });

  // Tutorial button
  document.getElementById('tutorialBtn')?.addEventListener('click', showTutorial);

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

  reminderModal?.addEventListener('click', (e) => {
    if (e.target === reminderModal) {
      closeReminderModal();
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
  currentEditingNoteType = 'message';

  // Reset modal title
  const modalTitle = noteModal.querySelector('.modal-header h2');
  if (modalTitle) modalTitle.textContent = 'Add Note';

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
 * Save note - Chat-only version
 */
async function saveNote() {
  try {
    const noteText = document.getElementById('noteTextarea').value.trim();

    if (!currentEditingNoteId) return;

    // Update chat marker
    await updateChatMarker(currentEditingNoteId, {
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
 * Open reminder picker modal
 */
function openReminderPicker(marker) {
  const reminderModal = document.getElementById('reminderModal');
  const reminderMessagePreview = document.getElementById('reminderMessagePreview');
  const customReminderDate = document.getElementById('customReminderDate');
  const currentReminderInfo = document.getElementById('currentReminderInfo');
  const currentReminderText = document.getElementById('currentReminderText');

  // Store current marker ID and type
  currentEditingNoteId = marker.messageId;
  currentEditingNoteType = 'message';

  // Reset modal title
  const modalTitle = reminderModal.querySelector('.modal-header h2');
  if (modalTitle) modalTitle.textContent = 'Set Reminder';

  // Show message preview
  reminderMessagePreview.textContent = marker.messageText || 'No message text';

  // Check if reminder already exists
  const existingReminder = Object.values(allReminders).find(
    r => r.messageId === marker.messageId && r.active && !r.firedAt
  );

  if (existingReminder) {
    currentReminderInfo.style.display = 'block';
    currentReminderText.textContent = formatReminderTime(existingReminder.reminderTime);
  } else {
    currentReminderInfo.style.display = 'none';
  }

  // Set min datetime to now
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
  customReminderDate.min = minDateTime;
  customReminderDate.value = '';

  reminderModal.style.display = 'flex';
}

/**
 * Close reminder picker modal
 */
function closeReminderModal() {
  const reminderModal = document.getElementById('reminderModal');
  reminderModal.style.display = 'none';
  currentEditingNoteId = null;
}

/**
 * Save reminder
 */
async function saveReminderFromModal(minutes = null) {
  if (!currentEditingNoteId) return;

  try {
    let reminderTime;

    if (minutes) {
      // Quick option selected
      reminderTime = Date.now() + (minutes * 60 * 1000);
    } else {
      // Custom datetime selected
      const customReminderDate = document.getElementById('customReminderDate');
      if (!customReminderDate.value) {
        showToast('Please select a date and time');
        return;
      }
      reminderTime = new Date(customReminderDate.value).getTime();
    }

    // Check if reminder already exists for this message
    const existingReminder = Object.values(allReminders).find(
      r => r.messageId === currentEditingNoteId && r.active && !r.firedAt
    );

    let reminderData;

    if (existingReminder) {
      // Update existing reminder (keep same ID)
      reminderData = {
        ...existingReminder,
        reminderTime: reminderTime,
        updatedAt: Date.now()
      };
    } else {
      // Create new reminder
      reminderData = {
        messageId: currentEditingNoteId,
        reminderTime: reminderTime,
        active: true,
        createdAt: Date.now()
      };
    }

    // Save reminder (will replace existing one with same ID)
    await saveReminder(reminderData);

    showToast('✅ Reminder set successfully');
    closeReminderModal();

    // Reload markers to update UI
    await loadMarkers();

  } catch (error) {
    console.error('[ChatMarker Popup] Error saving reminder:', error);
    showToast('❌ Error setting reminder');
  }
}

/**
 * Delete existing reminder
 */
async function deleteExistingReminder() {
  if (!currentEditingNoteId) return;

  try {
    // Find reminder for this message
    const existingReminder = Object.values(allReminders).find(
      r => r.messageId === currentEditingNoteId && r.active && !r.firedAt
    );

    if (existingReminder) {
      await deleteReminder(existingReminder.reminderId);
      showToast('✅ Reminder deleted');
      closeReminderModal();
      await loadMarkers();
    }

  } catch (error) {
    console.error('[ChatMarker Popup] Error deleting reminder:', error);
    showToast('❌ Error deleting reminder');
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
 * Clear all data - Chat-only version
 */
async function clearAllData() {
  if (!confirm('Are you sure you want to delete ALL marked chats and reminders? This cannot be undone.')) {
    return;
  }

  if (!confirm('Really delete everything? This is your last chance!')) {
    return;
  }

  try {
    // Clear chat markers and reminders
    await clearAllChatMarkers();
    await clearAllReminders();
    showToast('All data cleared');

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
    linkedin: '💼',
    reddit: '🔴'
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
