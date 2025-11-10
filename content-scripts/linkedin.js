/**
 * ChatMarker - LinkedIn Content Script
 * Handles chat marking, labels, notes, and reminders on LinkedIn Messaging
 *
 * Features:
 * - Mark/unmark chats from chat list
 * - Add labels (Urgent, Important, etc.)
 * - Add notes to chats
 * - Set reminders
 * - Inline indicators (⭐ before time) in chat list
 * - No shadow DOM (simpler than Reddit)
 */

console.log('[ChatMarker] LinkedIn content script initializing...');

// ==================== CONFIGURATION ====================

const PLATFORM = 'linkedin';

const SELECTORS = {
  // Full-screen chat list (messaging page)
  chatList: 'ul.msg-conversations-container__conversations-list',
  chatItem: 'div.msg-conversation-listitem__link',
  chatName: 'h3.msg-conversation-listitem__participant-names span.truncate',
  timeStamp: 'time.msg-conversation-card__time-stamp',

  // Floating chat overlay
  chatListFloating: 'section.msg-overlay-list-bubble__content',
  chatItemFloating: '.msg-conversation-listitem__link.msg-overlay-list-bubble__convo-item--v2',
  chatNameFloating: 'h3.msg-conversation-listitem__participant-names span.truncate',
  timeStampFloating: '.msg-overlay-list-bubble-item__time-stamp',

  // For finding parent containers
  chatContainer: 'div.msg-conversation-listitem__link'
};

// ==================== STATE ====================

let lastRightClickedElement = null;
let chatListObserver = null;
let floatingChatObserver = null;

// ==================== INITIALIZATION ====================

/**
 * Initialize the content script
 */
function init() {
  console.log('[ChatMarker] Initializing LinkedIn integration...');

  // Set up right-click capture
  setupContextMenuCapture();

  // Set up chat list observers (both full-screen and floating)
  setupChatListObserver();
  setupFloatingChatObserver();

  // Listen for context menu actions from background
  chrome.runtime.onMessage.addListener(handleContextMenuAction);

  console.log('[ChatMarker] ✅ LinkedIn content script initialized');
}

// ==================== CONTEXT MENU HANDLING ====================

/**
 * Set up right-click event capture
 */
function setupContextMenuCapture() {
  document.addEventListener('contextmenu', (e) => {
    lastRightClickedElement = e.target;
    console.log('[ChatMarker] Right-click captured on:', e.target);
  }, true);
}

/**
 * Handle context menu actions from background script
 */
function handleContextMenuAction(request, sender, sendResponse) {
  if (request.action !== 'contextMenuAction') return;

  console.log('[ChatMarker] Context menu action:', request.menuItemId);

  const menuItemId = request.menuItemId;

  if (menuItemId === 'chatmarker-mark-chat') {
    markCurrentChat();
  } else if (menuItemId.startsWith('chatmarker-label-')) {
    const labelId = menuItemId.replace('chatmarker-label-', '');
    toggleChatLabel(labelId);
  } else if (menuItemId === 'chatmarker-note') {
    openChatNoteEditor();
  } else if (menuItemId === 'chatmarker-reminder') {
    openChatReminderPicker();
  }
}

// ==================== CHAT IDENTIFICATION ====================

/**
 * Extract chat name from right-clicked element
 */
function getChatNameFromRightClick() {
  if (!lastRightClickedElement) {
    console.log('[ChatMarker] No right-clicked element');
    return null;
  }

  let element = lastRightClickedElement;
  let depth = 0;
  const maxDepth = 20;

  // Traverse up to find chat container (works for both full-screen and floating)
  while (element && depth < maxDepth) {
    // Check if this is a chat item container (both full-screen and floating have this class)
    if (element.classList && element.classList.contains('msg-conversation-listitem__link')) {
      // Found chat container, now find the chat name
      const nameElement = element.querySelector('h3.msg-conversation-listitem__participant-names span.truncate');
      if (nameElement) {
        const chatName = nameElement.textContent.trim();
        if (chatName && chatName.length > 0) {
          console.log('[ChatMarker] ✅ Extracted chat name:', chatName);
          return chatName;
        }
      }
    }

    element = element.parentElement;
    depth++;
  }

  console.log('[ChatMarker] ⚠️ Could not find chat name from right-click');
  return null;
}

/**
 * Get current chat ID
 */
function getCurrentChatId() {
  const chatName = getChatName();
  if (chatName && chatName !== 'Unknown Chat') {
    // Try to extract thread ID from URL
    const urlMatch = window.location.pathname.match(/\/messaging\/thread\/([\w-]+)\//);
    if (urlMatch && urlMatch[1]) {
      const threadId = `linkedin_thread_${urlMatch[1]}`;
      console.log('[ChatMarker] Generated thread-based chat ID:', threadId);
      return threadId;
    }

    // Fallback to name-based ID
    const chatId = `linkedin_${chatName.replace(/\s+/g, '_')}`;
    console.log('[ChatMarker] Generated name-based chat ID:', chatId);
    return chatId;
  }
  return 'unknown';
}

/**
 * Get current chat name
 */
function getChatName() {
  const chatName = getChatNameFromRightClick();
  return chatName || 'Unknown Chat';
}

// ==================== CHAT MARKING ====================

/**
 * Mark or unmark the current chat
 */
async function markCurrentChat() {
  const chatName = getChatName();
  const chatId = getCurrentChatId();

  console.log('[ChatMarker] Marking chat:', { chatName, chatId });

  if (!chatName || chatName === 'Unknown Chat') {
    showToast('⚠️ Could not identify chat. Please try right-clicking directly on a chat item.', 'error');
    return;
  }

  try {
    // Check if already marked
    const response = await chrome.runtime.sendMessage({
      action: 'getChatMarker',
      chatId: chatId,
      platform: PLATFORM
    });

    if (response.success && response.data) {
      // Already marked - unmark it
      await chrome.runtime.sendMessage({
        action: 'deleteChatMarker',
        chatMarkerId: response.data.chatMarkerId
      });

      showToast(`✅ Unmarked: ${chatName}`);
      console.log('[ChatMarker] Chat unmarked successfully');

      // Update indicators
      setTimeout(() => updateChatListIndicators(), 200);
    } else {
      // Not marked - mark it
      const chatMarker = {
        chatMarkerId: `${PLATFORM}_${chatId}_${Date.now()}`,
        platform: PLATFORM,
        chatId: chatId,
        chatName: chatName,
        labels: [],
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await chrome.runtime.sendMessage({
        action: 'saveChatMarker',
        data: chatMarker
      });

      showToast(`⭐ Marked: ${chatName}`);
      console.log('[ChatMarker] Chat marked successfully');

      // Update indicators
      setTimeout(() => updateChatListIndicators(), 200);
    }
  } catch (error) {
    console.error('[ChatMarker] Error marking chat:', error);
    showToast('❌ Error marking chat', 'error');
  }
}

/**
 * Toggle a label on the current chat
 */
async function toggleChatLabel(labelId) {
  const chatName = getChatName();
  const chatId = getCurrentChatId();

  console.log('[ChatMarker] Toggling label:', { labelId, chatName, chatId });

  if (!chatName || chatName === 'Unknown Chat') {
    showToast('⚠️ Could not identify chat', 'error');
    return;
  }

  try {
    // Get current chat marker
    const response = await chrome.runtime.sendMessage({
      action: 'getChatMarker',
      chatId: chatId,
      platform: PLATFORM
    });

    let chatMarker;

    if (response.success && response.data) {
      // Chat already marked
      chatMarker = response.data;
    } else {
      // Chat not marked yet - create new marker
      chatMarker = {
        chatMarkerId: `${PLATFORM}_${chatId}_${Date.now()}`,
        platform: PLATFORM,
        chatId: chatId,
        chatName: chatName,
        labels: [],
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    // Toggle label
    if (!chatMarker.labels) chatMarker.labels = [];
    const labelIndex = chatMarker.labels.indexOf(labelId);

    if (labelIndex > -1) {
      chatMarker.labels.splice(labelIndex, 1);
      showToast(`🏷️ Removed label: ${labelId}`);
    } else {
      chatMarker.labels.push(labelId);
      showToast(`🏷️ Added label: ${labelId}`);
    }

    chatMarker.updatedAt = Date.now();

    // Save
    await chrome.runtime.sendMessage({
      action: 'saveChatMarker',
      data: chatMarker
    });

    console.log('[ChatMarker] Label toggled successfully');

    // Update indicators
    setTimeout(() => updateChatListIndicators(), 200);
  } catch (error) {
    console.error('[ChatMarker] Error toggling label:', error);
    showToast('❌ Error updating label', 'error');
  }
}

/**
 * Open note editor for current chat
 */
async function openChatNoteEditor() {
  const chatName = getChatName();
  const chatId = getCurrentChatId();

  console.log('[ChatMarker] Opening note editor for:', chatName);

  if (!chatName || chatName === 'Unknown Chat') {
    showToast('⚠️ Could not identify chat', 'error');
    return;
  }

  try {
    // Get current chat marker
    const response = await chrome.runtime.sendMessage({
      action: 'getChatMarker',
      chatId: chatId,
      platform: PLATFORM
    });

    let chatMarker;
    let existingNote = '';

    if (response.success && response.data) {
      chatMarker = response.data;
      existingNote = chatMarker.notes || '';
    } else {
      // Create new marker
      chatMarker = {
        chatMarkerId: `${PLATFORM}_${chatId}_${Date.now()}`,
        platform: PLATFORM,
        chatId: chatId,
        chatName: chatName,
        labels: [],
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    // Show note modal
    showInlineNoteModal(chatName, existingNote, async (noteText) => {
      chatMarker.notes = noteText;
      chatMarker.updatedAt = Date.now();

      await chrome.runtime.sendMessage({
        action: 'saveChatMarker',
        data: chatMarker
      });

      showToast('📝 Note saved successfully');
      setTimeout(() => updateChatListIndicators(), 200);
    });

  } catch (error) {
    console.error('[ChatMarker] Error opening note editor:', error);
    showToast('❌ Error opening note editor', 'error');
  }
}

/**
 * Open reminder picker for current chat
 */
async function openChatReminderPicker() {
  const chatName = getChatName();
  const chatId = getCurrentChatId();

  console.log('[ChatMarker] Opening reminder picker for:', chatName);

  if (!chatName || chatName === 'Unknown Chat') {
    showToast('⚠️ Could not identify chat', 'error');
    return;
  }

  try {
    // Get current chat marker
    const response = await chrome.runtime.sendMessage({
      action: 'getChatMarker',
      chatId: chatId,
      platform: PLATFORM
    });

    let chatMarker;

    if (response.success && response.data) {
      chatMarker = response.data;
    } else {
      // Create new marker
      chatMarker = {
        chatMarkerId: `${PLATFORM}_${chatId}_${Date.now()}`,
        platform: PLATFORM,
        chatId: chatId,
        chatName: chatName,
        labels: [],
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    // Show reminder modal
    showInlineReminderModal(chatName, chatMarker, async (reminderTime) => {
      // Ensure chat is marked
      chatMarker.updatedAt = Date.now();
      await chrome.runtime.sendMessage({
        action: 'saveChatMarker',
        data: chatMarker
      });

      // Create reminder
      const reminder = {
        reminderId: `reminder_${PLATFORM}_${Date.now()}`,
        messageId: chatMarker.chatMarkerId,
        platform: PLATFORM,
        chatId: chatId,
        chatName: chatName,
        reminderTime: reminderTime,
        active: true,
        createdAt: Date.now()
      };

      await chrome.runtime.sendMessage({
        action: 'createReminder',
        data: reminder
      });

      showToast('⏰ Reminder set successfully');
      setTimeout(() => updateChatListIndicators(), 200);
    });

  } catch (error) {
    console.error('[ChatMarker] Error opening reminder picker:', error);
    showToast('❌ Error setting reminder', 'error');
  }
}

// ==================== CHAT LIST INDICATORS ====================

/**
 * Set up MutationObserver to watch for full-screen chat list changes
 */
function setupChatListObserver() {
  const chatList = document.querySelector(SELECTORS.chatList);

  if (!chatList) {
    console.log('[ChatMarker] Full-screen chat list not found yet, will retry...');
    setTimeout(setupChatListObserver, 2000);
    return;
  }

  console.log('[ChatMarker] Found full-screen chat list, setting up observer');

  // Initial update
  setTimeout(() => updateChatListIndicators(), 200);

  // Set up observer for future changes
  chatListObserver = new MutationObserver((mutations) => {
    console.log('[ChatMarker] Full-screen chat list changed, updating indicators');
    setTimeout(() => updateChatListIndicators(), 200);
  });

  chatListObserver.observe(chatList, {
    childList: true,
    subtree: true
  });

  console.log('[ChatMarker] ✅ Full-screen chat list observer active');
}

/**
 * Set up MutationObserver to watch for floating chat overlay changes
 */
function setupFloatingChatObserver() {
  // Check if floating chat exists
  const floatingChat = document.querySelector(SELECTORS.chatListFloating);

  if (!floatingChat) {
    console.log('[ChatMarker] Floating chat not found yet, will retry...');
    setTimeout(setupFloatingChatObserver, 2000);
    return;
  }

  console.log('[ChatMarker] Found floating chat, setting up observer');

  // Initial update
  setTimeout(() => updateChatListIndicators(), 200);

  // Set up observer for future changes
  floatingChatObserver = new MutationObserver((mutations) => {
    console.log('[ChatMarker] Floating chat changed, updating indicators');
    setTimeout(() => updateChatListIndicators(), 200);
  });

  floatingChatObserver.observe(floatingChat, {
    childList: true,
    subtree: true
  });

  console.log('[ChatMarker] ✅ Floating chat observer active');
}

/**
 * Update indicators for all chats in the list
 */
async function updateChatListIndicators() {
  console.log('[ChatMarker] Updating chat list indicators...');

  try {
    // Get all chat markers
    const response = await chrome.runtime.sendMessage({
      action: 'getAllChatMarkers'
    });

    if (!response.success) {
      console.error('[ChatMarker] Failed to get chat markers');
      return;
    }

    const allChatMarkers = response.data || {};
    const linkedinMarkers = Object.values(allChatMarkers).filter(m => m.platform === PLATFORM);

    console.log('[ChatMarker] Found', linkedinMarkers.length, 'LinkedIn markers');

    // Find all chat items
    const chatItems = findChatListItems();
    console.log('[ChatMarker] Found', chatItems.length, 'chat items in list');

    // Update each chat item
    chatItems.forEach(({ element, name, type }) => {
      // Remove existing indicators first
      const existingIndicators = element.querySelectorAll('.chatmarker-linkedin-indicator');
      existingIndicators.forEach(ind => ind.remove());

      // Find matching marker
      const marker = linkedinMarkers.find(m => {
        // Match by chat name
        return m.chatName === name;
      });

      if (marker) {
        addChatListIndicator(element, marker, type);
      }
    });

    console.log('[ChatMarker] ✅ Indicators updated');

  } catch (error) {
    console.error('[ChatMarker] Error updating indicators:', error);
  }
}

/**
 * Find all chat list items (both full-screen and floating)
 */
function findChatListItems() {
  const chatItems = [];

  // Find full-screen chat items
  const fullScreenChatElements = document.querySelectorAll(SELECTORS.chatItem);
  fullScreenChatElements.forEach(chatElement => {
    const nameElement = chatElement.querySelector(SELECTORS.chatName);
    if (nameElement) {
      const chatName = nameElement.textContent.trim();
      if (chatName && chatName.length > 0) {
        chatItems.push({
          element: chatElement,
          name: chatName,
          type: 'fullscreen'
        });
      }
    }
  });

  // Find floating chat items
  const floatingChatElements = document.querySelectorAll(SELECTORS.chatItemFloating);
  floatingChatElements.forEach(chatElement => {
    const nameElement = chatElement.querySelector(SELECTORS.chatNameFloating);
    if (nameElement) {
      const chatName = nameElement.textContent.trim();
      if (chatName && chatName.length > 0) {
        chatItems.push({
          element: chatElement,
          name: chatName,
          type: 'floating'
        });
      }
    }
  });

  return chatItems;
}

/**
 * Add inline indicator to chat list item (before time)
 */
function addChatListIndicator(chatElement, chatMarker, type = 'fullscreen') {
  // Find time element based on chat type
  const timeSelector = type === 'floating' ? SELECTORS.timeStampFloating : SELECTORS.timeStamp;
  const timeElement = chatElement.querySelector(timeSelector);

  if (!timeElement) {
    console.log('[ChatMarker] ⚠️ Could not find time element for indicator (type:', type, ')');
    return;
  }

  // Label emoji mapping
  const labelEmojis = {
    urgent: '🔴',
    important: '🟡',
    completed: '🟢',
    followup: '🔵',
    question: '🟣'
  };

  // Determine what to display
  let displayContent = '⭐'; // Default star
  let titleText = 'Marked chat';

  if (chatMarker.labels && chatMarker.labels.length > 0) {
    // Show label emojis instead of star
    displayContent = chatMarker.labels.map(label => labelEmojis[label] || '🏷️').join('');
    titleText = `Labels: ${chatMarker.labels.join(', ')}`;
  }

  // Add notes to tooltip if present
  if (chatMarker.notes && chatMarker.notes.trim()) {
    titleText += `\n\nNote: ${chatMarker.notes}`;
  }

  // Create indicator
  const indicator = document.createElement('span');
  indicator.className = 'chatmarker-linkedin-indicator';
  indicator.textContent = displayContent;
  indicator.title = titleText;
  indicator.style.cssText = `
    margin-right: 4px;
    font-size: 14px;
    line-height: 1;
    display: inline-block;
    cursor: pointer;
  `;

  // Insert before time element
  timeElement.parentElement.insertBefore(indicator, timeElement);
}

// ==================== MODALS ====================

/**
 * Show inline note modal
 */
function showInlineNoteModal(chatName, existingNote, onSave) {
  const colors = getThemeColors();

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'chatmarker-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    animation: fadeIn 0.2s ease;
  `;

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'chatmarker-note-modal';
  modal.style.cssText = `
    background: ${colors.modalBg};
    border-radius: 8px;
    padding: 24px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    color: ${colors.textPrimary};
  `;

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 20px; color: ${colors.textPrimary};">Add Note</h2>
      <button class="chatmarker-close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: ${colors.textSecondary}; padding: 0; width: 32px; height: 32px;">✕</button>
    </div>

    <div style="background: ${colors.infoBg}; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
      <strong style="color: ${colors.textPrimary};">Chat:</strong>
      <p style="margin: 4px 0 0 0; color: ${colors.infoText};">${chatName}</p>
    </div>

    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: ${colors.textPrimary};">Your Note:</label>
    <textarea class="chatmarker-note-textarea" placeholder="Add your note here..." maxlength="500" style="
      width: 100%;
      min-height: 120px;
      padding: 12px;
      border: 1px solid ${colors.inputBorder};
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      background: ${colors.inputBg};
      color: ${colors.textPrimary};
      box-sizing: border-box;
    ">${existingNote}</textarea>

    <div style="text-align: right; margin-top: 8px; color: ${colors.textSecondary}; font-size: 12px;">
      <span class="chatmarker-char-counter">${existingNote.length}</span> / 500
    </div>

    <div style="display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;">
      <button class="chatmarker-cancel-btn" style="
        padding: 10px 20px;
        border: 1px solid ${colors.buttonSecondaryBorder};
        background: ${colors.buttonSecondaryBg};
        color: ${colors.buttonSecondaryText};
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      ">Cancel</button>
      <button class="chatmarker-save-btn" style="
        padding: 10px 20px;
        border: none;
        background: ${colors.primary};
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      ">Save Note</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Get elements
  const textarea = modal.querySelector('.chatmarker-note-textarea');
  const charCounter = modal.querySelector('.chatmarker-char-counter');
  const closeBtn = modal.querySelector('.chatmarker-close-btn');
  const cancelBtn = modal.querySelector('.chatmarker-cancel-btn');
  const saveBtn = modal.querySelector('.chatmarker-save-btn');

  // Update character counter
  textarea.addEventListener('input', () => {
    charCounter.textContent = textarea.value.length;
  });

  // Close handlers
  const closeModal = () => overlay.remove();
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Save handler
  saveBtn.addEventListener('click', () => {
    const noteText = textarea.value.trim();
    onSave(noteText);
    closeModal();
  });

  // Focus textarea
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

/**
 * Show inline reminder modal
 */
function showInlineReminderModal(chatName, chatMarker, onSave) {
  const colors = getThemeColors();

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'chatmarker-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    animation: fadeIn 0.2s ease;
  `;

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'chatmarker-reminder-modal';
  modal.style.cssText = `
    background: ${colors.modalBg};
    border-radius: 8px;
    padding: 24px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    color: ${colors.textPrimary};
  `;

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 20px; color: ${colors.textPrimary};">Set Reminder</h2>
      <button class="chatmarker-close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: ${colors.textSecondary}; padding: 0; width: 32px; height: 32px;">✕</button>
    </div>

    <div style="background: ${colors.infoBg}; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
      <strong style="color: ${colors.textPrimary};">Chat:</strong>
      <p style="margin: 4px 0 0 0; color: ${colors.infoText};">${chatName}</p>
    </div>

    <label style="display: block; margin-bottom: 12px; font-weight: 500; color: ${colors.textPrimary};">Quick Options:</label>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px;">
      <button class="chatmarker-quick-reminder" data-minutes="60" style="padding: 10px; border: 1px solid ${colors.border}; background: ${colors.inputBg}; color: ${colors.textPrimary}; border-radius: 6px; cursor: pointer; font-size: 14px;">⏰ 1 Hour</button>
      <button class="chatmarker-quick-reminder" data-minutes="180" style="padding: 10px; border: 1px solid ${colors.border}; background: ${colors.inputBg}; color: ${colors.textPrimary}; border-radius: 6px; cursor: pointer; font-size: 14px;">⏰ 3 Hours</button>
      <button class="chatmarker-quick-reminder" data-minutes="1440" style="padding: 10px; border: 1px solid ${colors.border}; background: ${colors.inputBg}; color: ${colors.textPrimary}; border-radius: 6px; cursor: pointer; font-size: 14px;">⏰ Tomorrow</button>
      <button class="chatmarker-quick-reminder" data-minutes="10080" style="padding: 10px; border: 1px solid ${colors.border}; background: ${colors.inputBg}; color: ${colors.textPrimary}; border-radius: 6px; cursor: pointer; font-size: 14px;">⏰ Next Week</button>
    </div>

    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: ${colors.textPrimary};">Or choose custom date & time:</label>
    <input type="datetime-local" class="chatmarker-custom-datetime" style="
      width: 100%;
      padding: 10px;
      border: 1px solid ${colors.inputBorder};
      border-radius: 6px;
      font-size: 14px;
      background: ${colors.inputBg};
      color: ${colors.textPrimary};
      box-sizing: border-box;
    ">

    <div style="display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;">
      <button class="chatmarker-cancel-btn" style="
        padding: 10px 20px;
        border: 1px solid ${colors.buttonSecondaryBorder};
        background: ${colors.buttonSecondaryBg};
        color: ${colors.buttonSecondaryText};
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      ">Cancel</button>
      <button class="chatmarker-save-reminder-btn" style="
        padding: 10px 20px;
        border: none;
        background: ${colors.primary};
        color: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      ">Set Reminder</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Get elements
  const closeBtn = modal.querySelector('.chatmarker-close-btn');
  const cancelBtn = modal.querySelector('.chatmarker-cancel-btn');
  const saveBtn = modal.querySelector('.chatmarker-save-reminder-btn');
  const customDatetime = modal.querySelector('.chatmarker-custom-datetime');
  const quickBtns = modal.querySelectorAll('.chatmarker-quick-reminder');

  let selectedTime = null;

  // Quick reminder buttons
  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = parseInt(btn.dataset.minutes);
      selectedTime = Date.now() + (minutes * 60 * 1000);

      // Highlight selected
      quickBtns.forEach(b => b.style.background = colors.inputBg);
      btn.style.background = colors.primary;
      btn.style.color = 'white';

      // Clear custom input
      customDatetime.value = '';
    });
  });

  // Custom datetime input
  customDatetime.addEventListener('change', () => {
    if (customDatetime.value) {
      selectedTime = new Date(customDatetime.value).getTime();

      // Clear quick button highlights
      quickBtns.forEach(b => {
        b.style.background = colors.inputBg;
        b.style.color = colors.textPrimary;
      });
    }
  });

  // Close handlers
  const closeModal = () => overlay.remove();
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Save handler
  saveBtn.addEventListener('click', () => {
    if (!selectedTime) {
      showToast('⚠️ Please select a reminder time', 'error');
      return;
    }

    if (selectedTime < Date.now()) {
      showToast('⚠️ Reminder time must be in the future', 'error');
      return;
    }

    onSave(selectedTime);
    closeModal();
  });
}

/**
 * Get theme colors (dark mode for LinkedIn)
 */
function getThemeColors() {
  return {
    modalBg: '#1E293B',        // --color-surface
    textPrimary: '#F1F5F9',    // --color-text-primary
    textSecondary: '#94A3B8',  // --color-text-secondary
    border: '#334155',         // --color-border
    infoBg: '#334155',
    infoText: '#94A3B8',
    inputBg: '#0F172A',        // --color-background
    inputBorder: '#334155',
    buttonSecondaryBg: '#334155',
    buttonSecondaryText: '#F1F5F9',
    buttonSecondaryBorder: '#334155',
    primary: '#6366F1',        // --color-primary
    primaryDark: '#4338CA',    // --color-primary-dark
  };
}

// ==================== UI HELPERS ====================

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
  const colors = getThemeColors();

  // Remove existing toast
  const existingToast = document.querySelector('.chatmarker-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'chatmarker-toast';
  toast.textContent = message;

  const bgColor = type === 'error' ? '#EF4444' : '#10B981';

  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${bgColor};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 999999;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease;
    max-width: 400px;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== START ====================

// Wait for page to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('[ChatMarker] LinkedIn content script loaded');
