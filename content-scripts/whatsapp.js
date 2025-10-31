/**
 * ChatMarker - WhatsApp Web Content Script
 * Chat-only marking (no individual message marking)
 */

// WhatsApp Web DOM selectors
const SELECTORS = {
  // Main chat container
  chatContainer: '#main',

  // Chat info
  chatHeader: 'header[data-testid="conversation-header"]',
  chatTitle: 'span[data-testid="conversation-title"]',

  // Message container (for chat ID extraction)
  messageContainer: 'div[data-id]'
};

// State management
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

  console.log('[ChatMarker] Initializing WhatsApp Web integration (chat-only mode)...');

  try {
    // Wait for WhatsApp to fully load
    await waitForElement('#app', 10000);
    console.log('[ChatMarker] WhatsApp app loaded');

    // Listen for messages from background
    chrome.runtime.onMessage.addListener(handleBackgroundMessage);

    isInitialized = true;
    console.log('[ChatMarker] WhatsApp Web integration ready (chat-only mode)');
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
 * Extract chat ID from current conversation
 */
function getCurrentChatId() {
  // WhatsApp Web chat IDs are in message data-id attributes
  const messageElement = document.querySelector(SELECTORS.messageContainer);
  if (messageElement) {
    const dataId = messageElement.getAttribute('data-id');
    if (dataId) {
      // Extract chat ID from data-id (format: true_<chatId>_<messageId>)
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
  // Try multiple selectors for chat title
  const selectors = [
    'span[data-testid="conversation-title"]',
    'header[data-testid="conversation-header"] span[title]',
    'header[data-testid="conversation-header"] span[dir="auto"]',
    '#main header span[dir="auto"]',
    'header .copyable-text span'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const name = element.textContent.trim();
      if (name && name.length > 0) {
        console.log('[ChatMarker] Found chat name:', name, 'using selector:', selector);
        return name;
      }
    }
  }

  console.warn('[ChatMarker] Could not find chat name, using fallback');
  return 'Unknown Chat';
}

/**
 * Handle context menu actions - Chat-only version
 */
function handleContextMenuAction(menuItemId, selectionText) {
  console.log('[ChatMarker] Context menu action:', menuItemId);

  // All actions are chat-level only
  switch (menuItemId) {
    case 'chatmarker-mark-chat':
      markCurrentChat();
      break;

    case 'chatmarker-label-urgent':
    case 'chatmarker-label-important':
    case 'chatmarker-label-completed':
    case 'chatmarker-label-followup':
    case 'chatmarker-label-question':
      const labelId = menuItemId.replace('chatmarker-label-', '');
      toggleChatLabel(labelId);
      break;

    case 'chatmarker-note':
      openChatNoteEditor();
      break;

    case 'chatmarker-reminder':
      openChatReminderPicker();
      break;

    default:
      console.warn('[ChatMarker] Unknown context menu action:', menuItemId);
  }
}

/**
 * Handle messages from background script
 */
function handleBackgroundMessage(request, sender, sendResponse) {
  switch (request.action) {
    case 'contextMenuAction':
      handleContextMenuAction(request.menuItemId, request.selectionText);
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
}

/**
 * Mark the current chat
 */
async function markCurrentChat() {
  try {
    const chatId = getCurrentChatId();
    const chatName = getChatName();

    if (!chatId || chatId === 'unknown') {
      showToast('⚠️ Could not identify current chat');
      return;
    }

    console.log('[ChatMarker] Marking chat:', chatName, chatId);

    // Check if chat is already marked
    safeSendMessage(
      {
        action: 'getChatMarker',
        chatId: chatId,
        platform: 'whatsapp'
      },
      async (response) => {
        if (response && response.success && response.data) {
          // Chat already marked - unmark it
          safeSendMessage(
            {
              action: 'deleteChatMarker',
              chatMarkerId: response.data.chatMarkerId
            },
            (deleteResponse) => {
              if (deleteResponse && deleteResponse.success) {
                console.log('[ChatMarker] Chat unmarked:', chatName);
                showToast(`✅ Chat "${chatName}" unmarked`);
              } else {
                console.error('[ChatMarker] Failed to unmark chat');
                showToast('❌ Failed to unmark chat');
              }
            }
          );
        } else {
          // Chat not marked - mark it
          const chatMarker = {
            platform: 'whatsapp',
            chatId: chatId,
            chatName: chatName,
            labels: [],
            notes: '',
            createdAt: Date.now()
          };

          safeSendMessage(
            {
              action: 'saveChatMarker',
              data: chatMarker
            },
            (saveResponse) => {
              if (saveResponse && saveResponse.success) {
                console.log('[ChatMarker] Chat marked successfully:', chatName);
                showToast(`✅ Chat "${chatName}" marked`);
              } else {
                console.error('[ChatMarker] Failed to mark chat:', saveResponse?.error);
                showToast('❌ Failed to mark chat');
              }
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('[ChatMarker] Error marking chat:', error);
    showToast('❌ Error marking chat');
  }
}

/**
 * Toggle a label on the current chat
 */
async function toggleChatLabel(labelName) {
  try {
    const chatId = getCurrentChatId();
    const chatName = getChatName();

    if (!chatId || chatId === 'unknown') {
      showToast('⚠️ Could not identify current chat');
      return;
    }

    // Get current chat marker
    safeSendMessage(
      {
        action: 'getChatMarker',
        chatId: chatId,
        platform: 'whatsapp'
      },
      async (response) => {
        if (response && response.success && response.data) {
          // Chat is marked - toggle label
          const chatMarker = response.data;
          const labels = chatMarker.labels || [];
          const index = labels.indexOf(labelName);

          if (index > -1) {
            // Remove label
            labels.splice(index, 1);
            showToast(`🏷️ Label "${labelName}" removed`);
          } else {
            // Add label
            labels.push(labelName);
            showToast(`🏷️ Label "${labelName}" added`);
          }

          // Update chat marker
          safeSendMessage(
            {
              action: 'saveChatMarker',
              data: { ...chatMarker, labels, updatedAt: Date.now() }
            },
            (saveResponse) => {
              if (!saveResponse || !saveResponse.success) {
                console.error('[ChatMarker] Failed to update labels');
                showToast('❌ Failed to update label');
              }
            }
          );
        } else {
          // Chat not marked yet - mark it first with this label
          const chatMarker = {
            platform: 'whatsapp',
            chatId: chatId,
            chatName: chatName,
            labels: [labelName],
            notes: '',
            createdAt: Date.now()
          };

          safeSendMessage(
            {
              action: 'saveChatMarker',
              data: chatMarker
            },
            (saveResponse) => {
              if (saveResponse && saveResponse.success) {
                showToast(`✅ Chat marked with "${labelName}" label`);
              } else {
                showToast('❌ Failed to mark chat');
              }
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('[ChatMarker] Error toggling chat label:', error);
    showToast('❌ Error updating label');
  }
}

/**
 * Open note editor for current chat - Inline modal
 */
function openChatNoteEditor() {
  const chatId = getCurrentChatId();
  const chatName = getChatName();

  if (!chatId || chatId === 'unknown') {
    showToast('⚠️ Could not identify current chat');
    return;
  }

  // Get current chat marker
  safeSendMessage(
    {
      action: 'getChatMarker',
      chatId: chatId,
      platform: 'whatsapp'
    },
    (response) => {
      if (response && response.success && response.data) {
        // Chat is marked - show inline note modal
        showInlineNoteModal(response.data);
      } else {
        // Chat not marked yet - mark it first, then show note modal
        const chatMarker = {
          platform: 'whatsapp',
          chatId: chatId,
          chatName: chatName,
          labels: [],
          notes: '',
          createdAt: Date.now()
        };

        safeSendMessage(
          {
            action: 'saveChatMarker',
            data: chatMarker
          },
          (saveResponse) => {
            if (saveResponse && saveResponse.success) {
              showInlineNoteModal(saveResponse.chatMarker);
            } else {
              showToast('❌ Failed to mark chat');
            }
          }
        );
      }
    }
  );
}

/**
 * Open reminder picker for current chat - Inline modal
 */
function openChatReminderPicker() {
  const chatId = getCurrentChatId();
  const chatName = getChatName();

  if (!chatId || chatId === 'unknown') {
    showToast('⚠️ Could not identify current chat');
    return;
  }

  // Get current chat marker
  safeSendMessage(
    {
      action: 'getChatMarker',
      chatId: chatId,
      platform: 'whatsapp'
    },
    (response) => {
      if (response && response.success && response.data) {
        // Chat is marked - show inline reminder modal
        showInlineReminderModal(response.data);
      } else {
        // Chat not marked yet - mark it first, then show reminder modal
        const chatMarker = {
          platform: 'whatsapp',
          chatId: chatId,
          chatName: chatName,
          labels: [],
          notes: '',
          createdAt: Date.now()
        };

        safeSendMessage(
          {
            action: 'saveChatMarker',
            data: chatMarker
          },
          (saveResponse) => {
            if (saveResponse && saveResponse.success) {
              showInlineReminderModal(saveResponse.chatMarker);
            } else {
              showToast('❌ Failed to mark chat');
            }
          }
        );
      }
    }
  );
}

/**
 * Show inline note modal on WhatsApp page
 */
function showInlineNoteModal(chatMarker) {
  // Remove existing modal if any
  const existingModal = document.querySelector('.chatmarker-inline-modal');
  if (existingModal) existingModal.remove();

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'chatmarker-inline-modal';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  `;

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">Add Note to Chat</h2>
      <button class="chatmarker-close-btn" style="background: none; border: none; font-size: 24px; color: #6B7280; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">×</button>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="padding: 12px; background: #F3F4F6; border-radius: 6px; margin-bottom: 16px;">
        <strong style="color: #374151;">Chat:</strong>
        <div style="color: #6B7280; margin-top: 4px;">${chatMarker.chatName}</div>
      </div>
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Your Note:</label>
      <textarea class="chatmarker-note-textarea" placeholder="Add your note here..." style="width: 100%; min-height: 120px; padding: 12px; border: 1px solid #D1D5DB; border-radius: 6px; font-family: inherit; font-size: 14px; resize: vertical;">${chatMarker.notes || ''}</textarea>
      <div style="text-align: right; margin-top: 4px; font-size: 12px; color: #6B7280;">
        <span class="chatmarker-char-count">0</span> / 500
      </div>
    </div>
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button class="chatmarker-cancel-btn" style="padding: 10px 20px; border: 1px solid #D1D5DB; background: white; color: #374151; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 14px;">Cancel</button>
      <button class="chatmarker-save-btn" style="padding: 10px 20px; border: none; background: #6366F1; color: white; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 14px;">Save Note</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Get elements
  const textarea = modal.querySelector('.chatmarker-note-textarea');
  const charCount = modal.querySelector('.chatmarker-char-count');
  const closeBtn = modal.querySelector('.chatmarker-close-btn');
  const cancelBtn = modal.querySelector('.chatmarker-cancel-btn');
  const saveBtn = modal.querySelector('.chatmarker-save-btn');

  // Update char count
  const updateCharCount = () => {
    charCount.textContent = textarea.value.length;
  };
  updateCharCount();
  textarea.addEventListener('input', updateCharCount);

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

    safeSendMessage(
      {
        action: 'saveChatMarker',
        data: { ...chatMarker, notes: noteText, updatedAt: Date.now() }
      },
      (response) => {
        if (response && response.success) {
          showToast('✅ Note saved');
          closeModal();
        } else {
          showToast('❌ Failed to save note');
        }
      }
    );
  });

  // Focus textarea
  textarea.focus();
}

/**
 * Show inline reminder modal on WhatsApp page
 */
function showInlineReminderModal(chatMarker) {
  // Remove existing modal if any
  const existingModal = document.querySelector('.chatmarker-inline-modal');
  if (existingModal) existingModal.remove();

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'chatmarker-inline-modal';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  `;

  // Get min datetime (now)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">Set Reminder for Chat</h2>
      <button class="chatmarker-close-btn" style="background: none; border: none; font-size: 24px; color: #6B7280; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">×</button>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="padding: 12px; background: #F3F4F6; border-radius: 6px; margin-bottom: 16px;">
        <strong style="color: #374151;">Chat:</strong>
        <div style="color: #6B7280; margin-top: 4px;">${chatMarker.chatName}</div>
      </div>
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Quick Options:</label>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
        <button class="chatmarker-quick-reminder" data-minutes="60" style="padding: 10px; border: 1px solid #D1D5DB; background: white; border-radius: 6px; cursor: pointer; font-size: 14px;">⏰ 1 Hour</button>
        <button class="chatmarker-quick-reminder" data-minutes="180" style="padding: 10px; border: 1px solid #D1D5DB; background: white; border-radius: 6px; cursor: pointer; font-size: 14px;">⏰ 3 Hours</button>
        <button class="chatmarker-quick-reminder" data-minutes="1440" style="padding: 10px; border: 1px solid #D1D5DB; background: white; border-radius: 6px; cursor: pointer; font-size: 14px;">⏰ Tomorrow</button>
        <button class="chatmarker-quick-reminder" data-minutes="10080" style="padding: 10px; border: 1px solid #D1D5DB; background: white; border-radius: 6px; cursor: pointer; font-size: 14px;">⏰ Next Week</button>
      </div>
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Or choose custom date & time:</label>
      <input type="datetime-local" class="chatmarker-custom-datetime" min="${minDateTime}" style="width: 100%; padding: 10px; border: 1px solid #D1D5DB; border-radius: 6px; font-family: inherit; font-size: 14px;">
    </div>
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button class="chatmarker-cancel-btn" style="padding: 10px 20px; border: 1px solid #D1D5DB; background: white; color: #374151; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 14px;">Cancel</button>
      <button class="chatmarker-save-reminder-btn" style="padding: 10px 20px; border: none; background: #6366F1; color: white; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 14px;">Set Reminder</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Get elements
  const customDateTime = modal.querySelector('.chatmarker-custom-datetime');
  const quickBtns = modal.querySelectorAll('.chatmarker-quick-reminder');
  const closeBtn = modal.querySelector('.chatmarker-close-btn');
  const cancelBtn = modal.querySelector('.chatmarker-cancel-btn');
  const saveBtn = modal.querySelector('.chatmarker-save-reminder-btn');

  // Close handlers
  const closeModal = () => overlay.remove();
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Quick reminder buttons
  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = parseInt(btn.dataset.minutes);
      const reminderTime = Date.now() + (minutes * 60 * 1000);
      saveReminder(reminderTime);
    });
  });

  // Save reminder handler
  saveBtn.addEventListener('click', () => {
    if (!customDateTime.value) {
      showToast('⚠️ Please select a date and time');
      return;
    }
    const reminderTime = new Date(customDateTime.value).getTime();
    if (reminderTime <= Date.now()) {
      showToast('⚠️ Reminder time must be in the future');
      return;
    }
    saveReminder(reminderTime);
  });

  function saveReminder(reminderTime) {
    const reminderData = {
      messageId: chatMarker.chatMarkerId,
      reminderTime: reminderTime,
      title: `Reminder: ${chatMarker.chatName}`,
      body: chatMarker.notes || 'Check this chat',
      chatName: chatMarker.chatName,
      platform: 'whatsapp',
      active: true
    };

    safeSendMessage(
      {
        action: 'createReminder',
        data: reminderData
      },
      (response) => {
        if (response && response.success) {
          const date = new Date(reminderTime);
          showToast(`✅ Reminder set for ${date.toLocaleString()}`);
          closeModal();
        } else {
          showToast('❌ Failed to set reminder');
        }
      }
    );
  }
}

/**
 * Show a toast notification
 */
function showToast(message) {
  // Remove existing toast if any
  const existingToast = document.querySelector('.chatmarker-toast');
  if (existingToast) existingToast.remove();

  // Create toast
  const toast = document.createElement('div');
  toast.className = 'chatmarker-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1F2937;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
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
  });
} else {
  init();
}

console.log('[ChatMarker] WhatsApp content script loaded (chat-only mode)');
