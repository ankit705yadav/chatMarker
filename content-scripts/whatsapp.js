/**
 * ChatMarker - WhatsApp Web Content Script
 * Enables marking messages in WhatsApp Web
 */

// WhatsApp Web DOM selectors (as of 2025 - these may need updates)
const SELECTORS = {
  // Main chat container
  chatContainer: '#main',

  // Message list container
  messageList: '[data-testid="conversation-panel-body"]',

  // Individual messages
  messageContainer: 'div[data-id]', // Messages have data-id attribute
  messageIn: '.message-in',
  messageOut: '.message-out',

  // Message content
  messageText: '.selectable-text span',
  messageTextContainer: '.selectable-text',

  // Message metadata
  timestamp: 'span[data-testid="msg-time"]',
  messageMeta: 'div[data-testid="msg-meta"]',

  // Sender info (for group chats)
  senderName: 'span[data-testid="message-author"]',

  // Chat info
  chatHeader: 'header[data-testid="conversation-header"]',
  chatTitle: 'span[data-testid="conversation-title"]'
};

// State management
let markedMessages = new Map(); // messageId -> markerData
let observer = null;
let isInitialized = false;

/**
 * Check if extension context is valid
 */
function isExtensionContextValid() {
  try {
    return !!chrome.runtime?.id;
  } catch (e) {
    return false;
  }
}

/**
 * Safe wrapper for chrome.runtime.sendMessage
 * Handles extension context invalidation gracefully
 */
function safeSendMessage(message, callback) {
  if (!isExtensionContextValid()) {
    console.warn('[ChatMarker] Extension context invalidated - page reload recommended');
    if (callback) {
      callback({ success: false, error: 'Extension context invalidated' });
    }
    return;
  }

  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[ChatMarker] Message send error:', chrome.runtime.lastError.message);
        if (callback) {
          callback({ success: false, error: chrome.runtime.lastError.message });
        }
        return;
      }
      if (callback) {
        callback(response);
      }
    });
  } catch (error) {
    console.error('[ChatMarker] Failed to send message:', error);
    if (callback) {
      callback({ success: false, error: error.message });
    }
  }
}

/**
 * Initialize the content script
 */
async function init() {
  if (isInitialized) return;

  console.log('[ChatMarker] Initializing WhatsApp Web integration...');

  try {
    // Wait for WhatsApp to fully load - increased timeout for slow connections
    console.log('[ChatMarker] Waiting for #main element...');

    // First wait for app to load
    await waitForElement('#app', 10000);
    console.log('[ChatMarker] WhatsApp app loaded');

    // Then wait for main chat area (may not exist if no chat is open)
    try {
      await waitForElement(SELECTORS.chatContainer, 5000);
      console.log('[ChatMarker] #main found - chat is open');
    } catch (e) {
      console.log('[ChatMarker] No chat open yet - will activate when chat opens');
      // Don't fail - just wait for user to open a chat
    }

    // Wait a bit more for messages to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Load marked messages from storage
    await loadMarkedMessages();

    // Process existing messages if chat is open
    const mainExists = document.querySelector(SELECTORS.chatContainer);
    if (mainExists) {
      await processAllMessages();
      // Set up observer for new messages
      setupMutationObserver();
    } else {
      // Wait for user to open a chat, then set up
      waitForChatToOpen();
    }

    // Listen for messages from background
    chrome.runtime.onMessage.addListener(handleBackgroundMessage);

    isInitialized = true;
    console.log('[ChatMarker] WhatsApp Web integration ready');
  } catch (error) {
    console.error('[ChatMarker] Initialization failed:', error);
    console.log('[ChatMarker] Will retry initialization in 5 seconds...');

    // Retry after delay
    setTimeout(() => {
      isInitialized = false;
      init();
    }, 5000);
  }
}

/**
 * Wait for an element to appear in DOM
 */
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for ${selector}`));
    }, timeout);
  });
}

/**
 * Wait for user to open a chat
 */
function waitForChatToOpen() {
  console.log('[ChatMarker] Waiting for user to open a chat...');

  const observer = new MutationObserver(() => {
    const main = document.querySelector(SELECTORS.chatContainer);
    if (main) {
      console.log('[ChatMarker] Chat opened! Processing messages...');
      observer.disconnect();

      // Process messages and set up observer
      setTimeout(() => {
        processAllMessages();
        setupMutationObserver();
      }, 1000);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Load marked messages from storage via background
 */
async function loadMarkedMessages() {
  return new Promise((resolve) => {
    safeSendMessage(
      { action: 'getAllMarkers' },
      (response) => {
        if (response && response.success && response.data) {
          const markers = response.data;

          // Filter for WhatsApp messages only
          Object.values(markers).forEach(marker => {
            if (marker.platform === 'whatsapp') {
              markedMessages.set(marker.messageId, marker);
            }
          });

          console.log(`[ChatMarker] Loaded ${markedMessages.size} marked WhatsApp messages`);
        }
        resolve();
      }
    );
  });
}

/**
 * Extract chat ID from current conversation
 */
function getCurrentChatId() {
  // WhatsApp Web chat IDs are typically in the URL or in message data-id attributes
  const messageElement = document.querySelector(SELECTORS.messageContainer);
  if (messageElement) {
    const dataId = messageElement.getAttribute('data-id');
    if (dataId) {
      // Extract chat ID from data-id (format: true_<chatId>_<messageId> or false_<chatId>_<messageId>)
      const parts = dataId.split('_');
      if (parts.length >= 2) {
        return parts[1];
      }
    }
  }

  // Fallback: try to extract from URL
  const url = window.location.href;
  const match = url.match(/whatsapp\.com\/([^\/]+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Extract chat name from header
 */
function getChatName() {
  const titleElement = document.querySelector(SELECTORS.chatTitle);
  return titleElement ? titleElement.textContent.trim() : 'Unknown Chat';
}

/**
 * Extract message data from DOM element
 */
function extractMessageData(messageElement) {
  try {
    // Get message ID from data-id attribute
    const dataId = messageElement.getAttribute('data-id');
    if (!dataId) return null;

    // Get message text
    const textElements = messageElement.querySelectorAll(SELECTORS.messageText);
    let messageText = '';
    textElements.forEach(el => {
      messageText += el.textContent + ' ';
    });
    messageText = messageText.trim();

    if (!messageText) return null;

    // Get timestamp
    const timestampElement = messageElement.querySelector(SELECTORS.timestamp);
    const timestampText = timestampElement ? timestampElement.textContent.trim() : '';
    const timestamp = Date.now(); // Use current time as approximation

    // Get sender (for group chats) or determine direction
    let sender = 'You';
    const senderElement = messageElement.querySelector(SELECTORS.senderName);
    if (senderElement) {
      sender = senderElement.textContent.trim();
    } else if (messageElement.classList.contains('message-in') ||
               messageElement.closest('.message-in')) {
      sender = getChatName();
    }

    // Get chat info
    const chatId = getCurrentChatId();
    const chatName = getChatName();

    return {
      dataId,
      messageText,
      timestamp,
      timestampText,
      sender,
      chatId,
      chatName,
      platform: 'whatsapp'
    };
  } catch (error) {
    console.error('[ChatMarker] Error extracting message data:', error);
    return null;
  }
}

/**
 * Generate unique message ID
 * Use WhatsApp's data-id as the primary stable identifier
 */
function generateMessageId(messageData) {
  const { platform, dataId } = messageData;

  // Use WhatsApp's data-id which is stable across page loads
  // Format: whatsapp:dataId (e.g., whatsapp:true_123@c.us_ABC123)
  return `${platform}:${dataId}`;
}

/**
 * Simple hash function
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if message is already marked
 */
function isMessageMarked(messageId) {
  return markedMessages.has(messageId);
}

/**
 * Inject mark icon into message element
 */
function injectMarkIcon(messageElement, messageId, isMarked = false) {
  // Check if icon already exists
  if (messageElement.querySelector('.chatmarker-icon')) {
    return;
  }

  // Create icon container
  const iconContainer = document.createElement('div');
  iconContainer.className = 'chatmarker-icon';
  iconContainer.setAttribute('data-message-id', messageId);

  if (isMarked) {
    iconContainer.classList.add('marked');
  }

  // Create star icon (using Unicode star)
  const icon = document.createElement('span');
  icon.className = 'chatmarker-star';
  icon.textContent = isMarked ? '★' : '☆';
  icon.title = isMarked ? 'Unmark message' : 'Mark message';

  iconContainer.appendChild(icon);

  // Add click handler - long press or right click for labels
  let pressTimer;

  iconContainer.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left click
      pressTimer = setTimeout(() => {
        // Long press - show label selector
        e.stopPropagation();
        showLabelSelector(messageElement, messageId, iconContainer);
      }, 500);
    }
  });

  iconContainer.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      clearTimeout(pressTimer);
    }
  });

  iconContainer.addEventListener('mouseleave', () => {
    clearTimeout(pressTimer);
  });

  iconContainer.addEventListener('click', (e) => {
    e.stopPropagation();
    handleMarkToggle(messageElement, messageId);
  });

  // Right-click for label menu
  iconContainer.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showLabelSelector(messageElement, messageId, iconContainer);
  });

  // Find the best place to inject the icon
  // Strategy 1: Try to append to message metadata area
  const metaElement = messageElement.querySelector(SELECTORS.messageMeta);
  if (metaElement) {
    metaElement.appendChild(iconContainer);
    console.log('[ChatMarker] Icon injected into msg-meta');
    return;
  }

  // Strategy 2: Try to find copyable-text area (more reliable)
  const copyableText = messageElement.querySelector('.copyable-text');
  if (copyableText && copyableText.parentElement) {
    copyableText.parentElement.style.position = 'relative';
    copyableText.parentElement.appendChild(iconContainer);
    console.log('[ChatMarker] Icon injected next to copyable-text');
    return;
  }

  // Strategy 3: Fallback to selectable-text
  const textContainer = messageElement.querySelector(SELECTORS.messageTextContainer);
  if (textContainer && textContainer.parentElement) {
    textContainer.parentElement.style.position = 'relative';
    textContainer.parentElement.appendChild(iconContainer);
    console.log('[ChatMarker] Icon injected next to selectable-text');
    return;
  }

  // Strategy 4: Last resort - append directly to message element
  messageElement.style.position = 'relative';
  messageElement.appendChild(iconContainer);
  console.log('[ChatMarker] Icon injected directly into message container');
}

/**
 * Handle mark/unmark toggle
 */
async function handleMarkToggle(messageElement, messageId) {
  const isCurrentlyMarked = isMessageMarked(messageId);

  if (isCurrentlyMarked) {
    // Unmark message
    await unmarkMessage(messageElement, messageId);
  } else {
    // Mark message
    await markMessage(messageElement, messageId);
  }
}

/**
 * Mark a message
 */
async function markMessage(messageElement, messageId) {
  const messageData = extractMessageData(messageElement);
  if (!messageData) {
    console.error('[ChatMarker] Failed to extract message data');
    return;
  }

  // Create marker object
  const marker = {
    messageId: messageId,
    platform: 'whatsapp',
    chatId: messageData.chatId,
    chatName: messageData.chatName,
    sender: messageData.sender,
    messageText: messageData.messageText,
    whatsappDataId: messageData.dataId, // Store WhatsApp's original data-id for reliable lookup
    labels: [],
    notes: '',
    priority: 'medium',
    starred: true,
    timestamp: messageData.timestamp,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // Save to storage via background
  safeSendMessage(
    {
      action: 'saveMarker',
      data: marker
    },
    (response) => {
      if (response && response.success) {
        // Update local state
        markedMessages.set(messageId, marker);

        // Update UI
        updateMarkIcon(messageElement, messageId, true);

        console.log('[ChatMarker] Message marked:', messageId);
      } else {
        console.error('[ChatMarker] Failed to save marker:', response?.error);
      }
    }
  );
}

/**
 * Unmark a message
 */
async function unmarkMessage(messageElement, messageId) {
  safeSendMessage(
    {
      action: 'deleteMarker',
      data: { messageId }
    },
    (response) => {
      if (response && response.success) {
        // Update local state
        markedMessages.delete(messageId);

        // Update UI
        updateMarkIcon(messageElement, messageId, false);

        console.log('[ChatMarker] Message unmarked:', messageId);
      } else {
        console.error('[ChatMarker] Failed to delete marker:', response?.error);
      }
    }
  );
}

/**
 * Update mark icon visual state
 */
function updateMarkIcon(messageElement, messageId, isMarked) {
  const iconContainer = messageElement.querySelector('.chatmarker-icon');
  if (!iconContainer) return;

  const icon = iconContainer.querySelector('.chatmarker-star');
  if (!icon) return;

  if (isMarked) {
    iconContainer.classList.add('marked');
    icon.textContent = '★';
    icon.title = 'Unmark message';
  } else {
    iconContainer.classList.remove('marked');
    icon.textContent = '☆';
    icon.title = 'Mark message';
  }
}

/**
 * Show label selector popup
 */
function showLabelSelector(messageElement, messageId, iconContainer) {
  // Close any existing label selector
  const existing = document.querySelector('.chatmarker-label-selector');
  if (existing) existing.remove();

  // Create label selector
  const selector = document.createElement('div');
  selector.className = 'chatmarker-label-selector';

  // Define label options
  const labels = [
    { name: 'urgent', color: '#EF4444', icon: '🔴', text: 'Urgent' },
    { name: 'important', color: '#F59E0B', icon: '🟡', text: 'Important' },
    { name: 'completed', color: '#10B981', icon: '🟢', text: 'Completed' },
    { name: 'followup', color: '#3B82F6', icon: '🔵', text: 'Follow-up' },
    { name: 'question', color: '#8B5CF6', icon: '🟣', text: 'Question' }
  ];

  // Get current labels for this message
  const marker = markedMessages.get(messageId);
  const currentLabels = marker ? marker.labels || [] : [];

  // Create label options
  labels.forEach(label => {
    const option = document.createElement('div');
    option.className = 'chatmarker-label-option';
    if (currentLabels.includes(label.name)) {
      option.classList.add('selected');
    }

    option.innerHTML = `
      <span class="label-icon">${label.icon}</span>
      <span class="label-text">${label.text}</span>
    `;

    option.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLabel(messageElement, messageId, label.name);
      option.classList.toggle('selected');
    });

    selector.appendChild(option);
  });

  // Add "Add Note" option
  const noteOption = document.createElement('div');
  noteOption.className = 'chatmarker-label-option chatmarker-note-option';
  noteOption.innerHTML = `
    <span class="label-icon">📝</span>
    <span class="label-text">Add Note</span>
  `;
  noteOption.addEventListener('click', (e) => {
    e.stopPropagation();
    selector.remove();
    showNoteModal(messageElement, messageId);
  });
  selector.appendChild(noteOption);

  // Add "Set Reminder" option
  const reminderOption = document.createElement('div');
  reminderOption.className = 'chatmarker-label-option';
  reminderOption.innerHTML = `
    <span class="label-icon">⏰</span>
    <span class="label-text">Set Reminder</span>
  `;
  reminderOption.addEventListener('click', (e) => {
    e.stopPropagation();
    selector.remove();
    showReminderModal(messageElement, messageId);
  });
  selector.appendChild(reminderOption);

  // Position the selector near the icon
  const rect = iconContainer.getBoundingClientRect();
  selector.style.position = 'fixed';
  selector.style.top = `${rect.bottom + 5}px`;
  selector.style.left = `${rect.left}px`;
  selector.style.zIndex = '10000';

  document.body.appendChild(selector);

  // Close on outside click
  setTimeout(() => {
    const closeHandler = (e) => {
      if (!selector.contains(e.target)) {
        selector.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  }, 100);
}

/**
 * Toggle a label on a message
 */
async function toggleLabel(messageElement, messageId, labelName) {
  const marker = markedMessages.get(messageId);
  if (!marker) {
    console.error('[ChatMarker] Cannot add label - message not marked');
    return;
  }

  // Toggle label in array
  const labels = marker.labels || [];
  const index = labels.indexOf(labelName);

  if (index > -1) {
    // Remove label
    labels.splice(index, 1);
  } else {
    // Add label
    labels.push(labelName);
  }

  // Update marker
  marker.labels = labels;
  marker.updatedAt = Date.now();

  // Save to storage
  safeSendMessage(
    {
      action: 'saveMarker',
      data: marker
    },
    (response) => {
      if (response && response.success) {
        // Update local state
        markedMessages.set(messageId, marker);

        // Update label badges on message
        updateLabelBadges(messageElement, messageId);

        console.log('[ChatMarker] Labels updated:', messageId, labels);
      } else {
        console.error('[ChatMarker] Failed to save labels:', response?.error);
      }
    }
  );
}

/**
 * Update label badges display on a message
 */
function updateLabelBadges(messageElement, messageId) {
  const marker = markedMessages.get(messageId);
  const labels = marker ? marker.labels || [] : [];

  // Remove existing label container
  const existingLabels = messageElement.querySelector('.chatmarker-labels');
  if (existingLabels) existingLabels.remove();

  // If no labels, nothing to show
  if (labels.length === 0) return;

  // Create label container
  const labelContainer = document.createElement('div');
  labelContainer.className = 'chatmarker-labels';

  // Add label badges
  labels.forEach(labelName => {
    const badge = document.createElement('span');
    badge.className = `chatmarker-label ${labelName}`;
    badge.textContent = labelName.charAt(0).toUpperCase() + labelName.slice(1);
    labelContainer.appendChild(badge);
  });

  // Find where to inject labels (below the message text)
  const textContainer = messageElement.querySelector('.copyable-text') ||
                       messageElement.querySelector('.selectable-text');

  if (textContainer && textContainer.parentElement) {
    textContainer.parentElement.appendChild(labelContainer);
  } else {
    messageElement.appendChild(labelContainer);
  }
}

/**
 * Show note modal for adding/editing notes
 */
function showNoteModal(messageElement, messageId) {
  const marker = markedMessages.get(messageId);
  if (!marker) {
    console.error('[ChatMarker] Cannot add note - message not marked');
    return;
  }

  // Close any existing modal
  const existing = document.querySelector('.chatmarker-note-modal');
  if (existing) existing.remove();

  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'chatmarker-note-modal';

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'chatmarker-note-modal-content';

  modalContent.innerHTML = `
    <div class="chatmarker-note-header">
      <h3>Add Note</h3>
      <button class="chatmarker-note-close">✕</button>
    </div>
    <div class="chatmarker-note-body">
      <div class="chatmarker-note-message-preview">
        ${marker.messageText.substring(0, 100)}${marker.messageText.length > 100 ? '...' : ''}
      </div>
      <textarea
        class="chatmarker-note-textarea"
        placeholder="Add your private note here..."
        maxlength="500"
      >${marker.notes || ''}</textarea>
      <div class="chatmarker-note-footer">
        <span class="chatmarker-note-counter">0/500</span>
        <div class="chatmarker-note-buttons">
          <button class="chatmarker-note-cancel">Cancel</button>
          <button class="chatmarker-note-save">Save</button>
        </div>
      </div>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Get elements
  const textarea = modal.querySelector('.chatmarker-note-textarea');
  const counter = modal.querySelector('.chatmarker-note-counter');
  const saveBtn = modal.querySelector('.chatmarker-note-save');
  const cancelBtn = modal.querySelector('.chatmarker-note-cancel');
  const closeBtn = modal.querySelector('.chatmarker-note-close');

  // Update character counter
  const updateCounter = () => {
    counter.textContent = `${textarea.value.length}/500`;
  };
  updateCounter();
  textarea.addEventListener('input', updateCounter);

  // Save note
  const saveNote = () => {
    marker.notes = textarea.value.trim();
    marker.updatedAt = Date.now();

    safeSendMessage(
      {
        action: 'saveMarker',
        data: marker
      },
      (response) => {
        if (response && response.success) {
          markedMessages.set(messageId, marker);
          updateNoteIndicator(messageElement, messageId);
          modal.remove();
          console.log('[ChatMarker] Note saved:', messageId);
        } else {
          console.error('[ChatMarker] Failed to save note:', response?.error);
        }
      }
    );
  };

  // Event listeners
  saveBtn.addEventListener('click', saveNote);
  cancelBtn.addEventListener('click', () => modal.remove());
  closeBtn.addEventListener('click', () => modal.remove());

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Focus textarea
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

/**
 * Update note indicator on message
 */
function updateNoteIndicator(messageElement, messageId) {
  const marker = markedMessages.get(messageId);
  const hasNote = marker && marker.notes && marker.notes.trim().length > 0;

  // Remove existing indicator
  const existing = messageElement.querySelector('.chatmarker-note-indicator');
  if (existing) existing.remove();

  if (!hasNote) return;

  // Create note indicator
  const indicator = document.createElement('span');
  indicator.className = 'chatmarker-note-indicator';
  indicator.textContent = '📝';
  indicator.title = marker.notes;

  // Add click to edit
  indicator.addEventListener('click', (e) => {
    e.stopPropagation();
    showNoteModal(messageElement, messageId);
  });

  // Find where to inject (next to star icon)
  const iconContainer = messageElement.querySelector('.chatmarker-icon');
  if (iconContainer) {
    iconContainer.appendChild(indicator);
  }
}

/**
 * Show reminder modal for setting reminders
 */
function showReminderModal(messageElement, messageId) {
  const marker = markedMessages.get(messageId);
  if (!marker) {
    console.error('[ChatMarker] Cannot set reminder - message not marked');
    return;
  }

  // Close any existing modal
  const existing = document.querySelector('.chatmarker-reminder-modal');
  if (existing) existing.remove();

  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'chatmarker-reminder-modal';

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'chatmarker-reminder-modal-content';

  modalContent.innerHTML = `
    <div class="chatmarker-reminder-header">
      <h3>Set Reminder</h3>
      <button class="chatmarker-reminder-close">✕</button>
    </div>
    <div class="chatmarker-reminder-body">
      <div class="chatmarker-reminder-message-preview">
        ${marker.messageText.substring(0, 100)}${marker.messageText.length > 100 ? '...' : ''}
      </div>
      <div class="chatmarker-reminder-quick-options">
        <button class="chatmarker-reminder-quick-btn" data-minutes="60">1 Hour</button>
        <button class="chatmarker-reminder-quick-btn" data-minutes="180">3 Hours</button>
        <button class="chatmarker-reminder-quick-btn" data-minutes="1440">Tomorrow</button>
      </div>
      <div class="chatmarker-reminder-custom">
        <label>Custom Date & Time:</label>
        <input type="datetime-local" class="chatmarker-reminder-datetime" />
      </div>
      <div class="chatmarker-reminder-footer">
        <button class="chatmarker-reminder-cancel">Cancel</button>
        <button class="chatmarker-reminder-save">Set Reminder</button>
      </div>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Get elements
  const datetimeInput = modal.querySelector('.chatmarker-reminder-datetime');
  const quickBtns = modal.querySelectorAll('.chatmarker-reminder-quick-btn');
  const saveBtn = modal.querySelector('.chatmarker-reminder-save');
  const cancelBtn = modal.querySelector('.chatmarker-reminder-cancel');
  const closeBtn = modal.querySelector('.chatmarker-reminder-close');

  // Set minimum datetime to now
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  datetimeInput.min = now.toISOString().slice(0, 16);

  // Quick button handlers
  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = parseInt(btn.getAttribute('data-minutes'));
      const reminderTime = new Date(Date.now() + minutes * 60 * 1000);
      reminderTime.setMinutes(reminderTime.getMinutes() - reminderTime.getTimezoneOffset());
      datetimeInput.value = reminderTime.toISOString().slice(0, 16);

      // Highlight selected button
      quickBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Save reminder
  const saveReminder = () => {
    const selectedTime = datetimeInput.value;
    if (!selectedTime) {
      alert('Please select a time for the reminder');
      return;
    }

    const reminderTime = new Date(selectedTime).getTime();
    if (reminderTime <= Date.now()) {
      alert('Reminder time must be in the future');
      return;
    }

    // Send to background to create alarm
    safeSendMessage(
      {
        action: 'createReminder',
        data: {
          messageId: messageId,
          reminderTime: reminderTime,
          notificationText: marker.messageText,
          active: true,
          createdAt: Date.now(),
          platform: marker.platform,
          chatId: marker.chatId,
          sender: marker.sender
        }
      },
      (response) => {
        if (response && response.success) {
          modal.remove();
          console.log('[ChatMarker] Reminder created:', response.reminder);
          alert('✅ Reminder set successfully!');
        } else {
          console.error('[ChatMarker] Failed to create reminder:', response?.error);
          alert('Failed to set reminder: ' + (response?.error || 'Unknown error'));
        }
      }
    );
  };

  // Event listeners
  saveBtn.addEventListener('click', saveReminder);
  cancelBtn.addEventListener('click', () => modal.remove());
  closeBtn.addEventListener('click', () => modal.remove());

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/**
 * Process a single message element
 */
function processMessage(messageElement) {
  if (!messageElement) return;

  // Skip if already processed
  if (messageElement.hasAttribute('data-chatmarker-processed')) {
    return;
  }

  const messageData = extractMessageData(messageElement);
  if (!messageData) return;

  const messageId = generateMessageId(messageData);
  const isMarked = isMessageMarked(messageId);

  // Inject mark icon
  injectMarkIcon(messageElement, messageId, isMarked);

  // Show label badges if message has labels
  if (isMarked) {
    updateLabelBadges(messageElement, messageId);
    updateNoteIndicator(messageElement, messageId);
  }

  // Mark as processed
  messageElement.setAttribute('data-chatmarker-processed', 'true');
}

/**
 * Process all visible messages
 */
async function processAllMessages() {
  const messageElements = document.querySelectorAll(SELECTORS.messageContainer);
  console.log(`[ChatMarker] Processing ${messageElements.length} messages`);

  messageElements.forEach(messageElement => {
    processMessage(messageElement);
  });

  // Update old markers with whatsappDataId if missing
  updateOldMarkersWithDataId();
}

/**
 * Update existing markers with whatsappDataId for better scrolling
 */
function updateOldMarkersWithDataId() {
  markedMessages.forEach((marker, messageId) => {
    // Skip if already has whatsappDataId
    if (marker.whatsappDataId) return;

    // Try to find the message in current DOM by our icon
    const iconElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (iconElement) {
      const messageElement = iconElement.closest('div[data-id]');
      if (messageElement) {
        const whatsappDataId = messageElement.getAttribute('data-id');
        if (whatsappDataId) {
          // Update marker with whatsappDataId
          marker.whatsappDataId = whatsappDataId;

          // Save to storage
          safeSendMessage(
            {
              action: 'saveMarker',
              data: marker
            },
            (response) => {
              if (response && response.success) {
                console.log('[ChatMarker] Updated marker with whatsappDataId:', messageId);
              }
            }
          );
        }
      }
    }
  });
}

/**
 * Set up MutationObserver to watch for new messages
 */
function setupMutationObserver() {
  // Try to find the message list, fallback to #main
  let messageList = document.querySelector(SELECTORS.messageList);
  if (!messageList) {
    console.log('[ChatMarker] Specific message list not found, using #main as fallback');
    messageList = document.querySelector(SELECTORS.chatContainer);
  }

  if (!messageList) {
    console.error('[ChatMarker] Cannot set up observer - no container found');
    return;
  }

  console.log('[ChatMarker] Setting up MutationObserver on:', messageList);

  observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if it's a message container
          if (node.matches && node.matches(SELECTORS.messageContainer)) {
            processMessage(node);
          } else {
            // Check children for message containers
            const messages = node.querySelectorAll && node.querySelectorAll(SELECTORS.messageContainer);
            if (messages) {
              messages.forEach(processMessage);
            }
          }
        }
      });
    });
  });

  observer.observe(messageList, {
    childList: true,
    subtree: true
  });

  console.log('[ChatMarker] MutationObserver set up successfully');
}

/**
 * Handle messages from background script
 */
function handleBackgroundMessage(request, sender, sendResponse) {
  switch (request.action) {
    case 'scrollToMessage':
      scrollToMessage(request.messageId).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        console.error('[ChatMarker] Failed to scroll to message:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep channel open for async response

    case 'refreshMarkers':
      // Reload markers and update UI
      loadMarkedMessages().then(() => {
        processAllMessages();
        sendResponse({ success: true });
      });
      return true; // Keep channel open for async response

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
}

/**
 * Scroll to a specific marked message and highlight it
 */
async function scrollToMessage(messageId) {
  console.log('[ChatMarker] Attempting to scroll to message:', messageId);

  // Get the marker data to retrieve WhatsApp's original data-id
  const marker = markedMessages.get(messageId);

  if (!marker) {
    console.error('[ChatMarker] Marker not found in local state');
    // Try to get from storage via background
    safeSendMessage(
      { action: 'getMarker', data: { messageId } },
      (response) => {
        if (response && response.success && response.data) {
          const fetchedMarker = response.data;
          if (fetchedMarker.whatsappDataId) {
            findAndScrollToMessage(fetchedMarker.whatsappDataId, messageId);
          }
        }
      }
    );
    return;
  }

  // Use WhatsApp's original data-id for reliable lookup
  const whatsappDataId = marker.whatsappDataId;

  if (whatsappDataId) {
    findAndScrollToMessage(whatsappDataId, messageId);
  } else {
    // Fallback: try to find by our icon
    findAndScrollToMessageByIcon(messageId);
  }
}

/**
 * Find and scroll to message using WhatsApp's data-id
 */
function findAndScrollToMessage(whatsappDataId, messageId) {
  // Try to find the message by WhatsApp's data-id
  const messageElement = document.querySelector(`div[data-id="${whatsappDataId}"]`);

  if (messageElement) {
    // Message found in DOM - use better scroll approach
    scrollToMessageElement(messageElement);
    console.log('[ChatMarker] Scrolled to message successfully using data-id');
  } else {
    console.warn('[ChatMarker] Message not currently in DOM (virtual scrolling)');
    console.log('[ChatMarker] Message may be outside current scroll range');

    // Try fallback method
    findAndScrollToMessageByIcon(messageId);
  }
}

/**
 * Scroll to message element with proper offset handling
 */
async function scrollToMessageElement(messageElement) {
  // Find the scroll container
  const scrollContainer = document.querySelector(SELECTORS.messageList) ||
                         document.querySelector(SELECTORS.chatContainer);

  if (!scrollContainer) {
    console.error('[ChatMarker] Scroll container not found');
    return;
  }

  // Wait for all images to load first
  await waitForImagesToLoad(messageElement);

  // Scroll message to the bottom of viewport so there's context above
  messageElement.scrollIntoView({
    behavior: 'smooth',
    block: 'end' // Align to bottom of viewport
  });

  // Wait for scroll animation
  await new Promise(resolve => setTimeout(resolve, 400));

  // Now scroll up a bit more to position it better (not at the very bottom)
  scrollContainer.scrollTop += 200; // Scroll DOWN 200px to move message up in viewport

  console.log('[ChatMarker] Scrolled and adjusted position');

  // Highlight after scroll position is finalized
  setTimeout(() => {
    highlightMessage(messageElement);
  }, 100);
}

/**
 * Wait for all images above a message to load
 */
function waitForImagesToLoad(messageElement) {
  return new Promise((resolve) => {
    // Find all images in the chat that might affect layout
    const images = document.querySelectorAll('img[src]');
    const imagesToLoad = [];

    images.forEach(img => {
      // Only wait for images that are not yet loaded
      if (!img.complete) {
        imagesToLoad.push(
          new Promise(imgResolve => {
            img.addEventListener('load', imgResolve);
            img.addEventListener('error', imgResolve); // Also resolve on error
            // Timeout after 2 seconds for each image
            setTimeout(imgResolve, 2000);
          })
        );
      }
    });

    if (imagesToLoad.length === 0) {
      // All images already loaded
      resolve();
    } else {
      // Wait for all images (or timeout)
      Promise.all(imagesToLoad).then(resolve);
      // Maximum wait time of 3 seconds total
      setTimeout(resolve, 3000);
    }
  });
}

/**
 * Adjust scroll position to show message with context above
 */
function adjustScrollPosition(messageElement, scrollContainer, desiredOffset) {
  // Use requestAnimationFrame to ensure layout is settled
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Calculate the message's position relative to the scroll container
      const messageRect = messageElement.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();

      // Calculate current offset from top of container
      const currentOffset = messageRect.top - containerRect.top;

      console.log('[ChatMarker] Current offset:', currentOffset, 'Desired:', desiredOffset);

      if (currentOffset < desiredOffset) {
        // Need to scroll up to show more context above
        const scrollAdjustment = desiredOffset - currentOffset;
        scrollContainer.scrollTop -= scrollAdjustment;
        console.log('[ChatMarker] Adjusted scroll by:', scrollAdjustment);
      }
    });
  });
}

/**
 * Fallback: Find message by our icon attribute
 */
function findAndScrollToMessageByIcon(messageId) {
  // Find the message element by our custom attribute
  const iconElement = document.querySelector(`[data-message-id="${messageId}"]`);

  if (iconElement) {
    // The icon is inside the message, find the parent message element
    const messageElement = iconElement.closest('div[data-id]');

    if (messageElement) {
      // Use the same scroll approach as data-id method
      scrollToMessageElement(messageElement);
      console.log('[ChatMarker] Scrolled to message successfully using icon');
      return;
    }
  }

  console.error('[ChatMarker] Message not found - it may be far up/down in the chat history');
}

/**
 * Temporarily highlight a message with animation
 */
function highlightMessage(messageElement) {
  // Add highlight class
  messageElement.style.transition = 'background-color 0.3s ease';
  const originalBackground = messageElement.style.backgroundColor;

  // Flash the message
  messageElement.style.backgroundColor = 'rgba(255, 215, 0, 0.3)'; // Gold highlight

  // Remove highlight after 2 seconds
  setTimeout(() => {
    messageElement.style.backgroundColor = originalBackground;

    // Remove inline style after transition
    setTimeout(() => {
      messageElement.style.transition = '';
      messageElement.style.backgroundColor = '';
    }, 300);
  }, 2000);
}

/**
 * Handle page navigation (when switching between chats)
 */
function handleNavigation() {
  // Clear processed flags to allow reprocessing
  const processedElements = document.querySelectorAll('[data-chatmarker-processed]');
  processedElements.forEach(el => {
    el.removeAttribute('data-chatmarker-processed');
    // Remove existing icons
    const icon = el.querySelector('.chatmarker-icon');
    if (icon) icon.remove();
  });

  // Reprocess messages after a short delay
  setTimeout(() => {
    processAllMessages();
  }, 500);
}

/**
 * Watch for chat navigation
 */
function setupNavigationWatcher() {
  let lastUrl = window.location.href;

  // Use URL change detection
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      handleNavigation();
    }
  }, 1000);
}

/**
 * Keyboard Shortcuts
 */
let currentHoveredMessage = null;
let currentHoveredMessageId = null;

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  // Track hovered message
  document.addEventListener('mouseover', (e) => {
    const messageElement = e.target.closest('[data-id^="whatsapp:"]');
    if (messageElement) {
      currentHoveredMessage = messageElement;
      currentHoveredMessageId = messageElement.getAttribute('data-id');
    }
  }, true);

  document.addEventListener('mouseout', (e) => {
    const messageElement = e.target.closest('[data-id^="whatsapp:"]');
    if (messageElement === currentHoveredMessage) {
      // Small delay to prevent flickering
      setTimeout(() => {
        if (!document.querySelector('[data-id^="whatsapp:"]:hover')) {
          currentHoveredMessage = null;
          currentHoveredMessageId = null;
        }
      }, 100);
    }
  }, true);

  // Keyboard event listener
  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in input fields
    const target = e.target;
    if (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.closest('[contenteditable="true"]')) {
      return;
    }

    // Don't trigger if any modal is open
    if (document.querySelector('.chatmarker-note-modal, .chatmarker-reminder-modal, .chatmarker-label-selector')) {
      return;
    }

    // Ignore if no message is hovered
    if (!currentHoveredMessage || !currentHoveredMessageId) {
      return;
    }

    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;

    // M - Mark/Unmark message
    if (key === 'm' && !ctrl) {
      e.preventDefault();
      toggleMarkMessage(currentHoveredMessage, currentHoveredMessageId);
      showShortcutFeedback(currentHoveredMessage, 'Mark toggled');
    }

    // N - Add/Edit note (only if message is marked)
    else if (key === 'n' && !ctrl) {
      if (markedMessages.has(currentHoveredMessageId)) {
        e.preventDefault();
        showNoteModal(currentHoveredMessage, currentHoveredMessageId);
      }
    }

    // R - Set reminder (only if message is marked)
    else if (key === 'r' && !ctrl) {
      if (markedMessages.has(currentHoveredMessageId)) {
        e.preventDefault();
        showReminderModal(currentHoveredMessage, currentHoveredMessageId);
      }
    }

    // 1-5 - Quick label assignment (only if message is marked)
    else if (['1', '2', '3', '4', '5'].includes(key) && !ctrl) {
      if (markedMessages.has(currentHoveredMessageId)) {
        e.preventDefault();
        const labelNames = ['urgent', 'important', 'completed', 'followup', 'question'];
        const labelName = labelNames[parseInt(key) - 1];
        toggleLabel(currentHoveredMessage, currentHoveredMessageId, labelName);
        showShortcutFeedback(currentHoveredMessage, `${capitalizeLabel(labelName)} toggled`);
      }
    }

    // Delete/Backspace - Delete mark (only if message is marked)
    else if ((key === 'delete' || key === 'backspace') && !ctrl) {
      if (markedMessages.has(currentHoveredMessageId)) {
        e.preventDefault();
        deleteMessageMark(currentHoveredMessage, currentHoveredMessageId);
        showShortcutFeedback(currentHoveredMessage, 'Mark deleted');
      }
    }

    // ? - Show keyboard shortcuts help
    else if (key === '?' && !ctrl) {
      e.preventDefault();
      showKeyboardShortcutsHelp();
    }
  });

  console.log('[ChatMarker] Keyboard shortcuts enabled');
}

/**
 * Toggle mark on message (for keyboard shortcut)
 */
function toggleMarkMessage(messageElement, messageId) {
  const iconContainer = messageElement.querySelector('.chatmarker-icon-container');
  if (!iconContainer) return;

  const starIcon = iconContainer.querySelector('.chatmarker-star');
  if (!starIcon) return;

  const isMarked = markedMessages.has(messageId);

  if (isMarked) {
    // Unmark
    deleteMessageMark(messageElement, messageId);
  } else {
    // Mark
    starIcon.click();
  }
}

/**
 * Delete message mark
 */
function deleteMessageMark(messageElement, messageId) {
  // Send message to background to delete marker
  safeSendMessage(
    {
      action: 'deleteMarker',
      messageId: messageId
    },
    (response) => {
      if (response && response.success) {
        // Remove from local cache
        markedMessages.delete(messageId);

        // Update UI
        const iconContainer = messageElement.querySelector('.chatmarker-icon-container');
        if (iconContainer) {
          const starIcon = iconContainer.querySelector('.chatmarker-star');
          if (starIcon) {
            starIcon.classList.remove('marked');
            starIcon.textContent = '☆';
          }
        }

        // Remove labels
        const labelContainer = messageElement.querySelector('.chatmarker-labels');
        if (labelContainer) {
          labelContainer.remove();
        }

        // Remove note indicator
        const noteIndicator = messageElement.querySelector('.chatmarker-note-indicator');
        if (noteIndicator) {
          noteIndicator.remove();
        }

        console.log('[ChatMarker] Message unmarked:', messageId);
      }
    }
  );
}

/**
 * Show keyboard shortcut feedback
 */
function showShortcutFeedback(messageElement, text) {
  const feedback = document.createElement('div');
  feedback.className = 'chatmarker-shortcut-feedback';
  feedback.textContent = text;

  const rect = messageElement.getBoundingClientRect();
  feedback.style.position = 'fixed';
  feedback.style.top = `${rect.top + 10}px`;
  feedback.style.right = '20px';
  feedback.style.zIndex = '100001';

  document.body.appendChild(feedback);

  // Fade out and remove
  setTimeout(() => {
    feedback.classList.add('fade-out');
    setTimeout(() => feedback.remove(), 300);
  }, 1500);
}

/**
 * Show keyboard shortcuts help modal
 */
function showKeyboardShortcutsHelp() {
  const existingModal = document.querySelector('.chatmarker-shortcuts-help');
  if (existingModal) {
    existingModal.remove();
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'chatmarker-shortcuts-help';
  modal.innerHTML = `
    <div class="chatmarker-shortcuts-help-content">
      <div class="chatmarker-shortcuts-help-header">
        <h3>⌨️ Keyboard Shortcuts</h3>
        <button class="chatmarker-shortcuts-help-close">✕</button>
      </div>
      <div class="chatmarker-shortcuts-help-body">
        <div class="shortcut-item">
          <kbd>M</kbd>
          <span>Mark/Unmark message (hover over message)</span>
        </div>
        <div class="shortcut-item">
          <kbd>N</kbd>
          <span>Add/Edit note (marked messages only)</span>
        </div>
        <div class="shortcut-item">
          <kbd>R</kbd>
          <span>Set reminder (marked messages only)</span>
        </div>
        <div class="shortcut-item">
          <kbd>1</kbd>
          <span>Toggle Urgent label</span>
        </div>
        <div class="shortcut-item">
          <kbd>2</kbd>
          <span>Toggle Important label</span>
        </div>
        <div class="shortcut-item">
          <kbd>3</kbd>
          <span>Toggle Completed label</span>
        </div>
        <div class="shortcut-item">
          <kbd>4</kbd>
          <span>Toggle Follow-up label</span>
        </div>
        <div class="shortcut-item">
          <kbd>5</kbd>
          <span>Toggle Question label</span>
        </div>
        <div class="shortcut-item">
          <kbd>Del</kbd>
          <span>Delete mark (marked messages only)</span>
        </div>
        <div class="shortcut-item">
          <kbd>?</kbd>
          <span>Show/Hide this help</span>
        </div>
      </div>
      <div class="chatmarker-shortcuts-help-footer">
        <p>💡 Hover over a message to use shortcuts</p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close button
  modal.querySelector('.chatmarker-shortcuts-help-close').addEventListener('click', () => {
    modal.remove();
  });

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Close on Escape
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

/**
 * Capitalize label name
 */
function capitalizeLabel(label) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Listen for extension unload/reload
chrome.runtime.onConnect.addListener(() => {
  // Connection established, extension is active
});

// Check for context invalidation periodically
let contextCheckInterval = setInterval(() => {
  if (!isExtensionContextValid()) {
    console.warn('[ChatMarker] Extension context invalidated');
    clearInterval(contextCheckInterval);

    // Show notification to user
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      max-width: 300px;
    `;
    notification.innerHTML = `
      ⚠️ ChatMarker extension was updated.<br>
      <span style="font-size: 13px; opacity: 0.9;">Please reload this page to continue using features.</span>
    `;
    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => notification.remove(), 10000);
  }
}, 5000); // Check every 5 seconds

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
    setupNavigationWatcher();
    setupKeyboardShortcuts();
  });
} else {
  init();
  setupNavigationWatcher();
  setupKeyboardShortcuts();
}

console.log('[ChatMarker] WhatsApp content script loaded');
