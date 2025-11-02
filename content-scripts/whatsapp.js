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
 * Detect if WhatsApp is in dark mode
 */
function isDarkMode() {
  // WhatsApp uses data-theme="dark" on html element
  const htmlTheme = document.documentElement.getAttribute('data-theme');
  if (htmlTheme === 'dark') return true;

  // Fallback: check body background color
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  const rgb = bodyBg.match(/\d+/g);
  if (rgb) {
    const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
    return brightness < 128;
  }

  return false;
}

/**
 * Get theme colors - Always use dark theme matching side-panel
 */
function getThemeColors() {
  // Always return dark theme colors matching the extension side-panel
  return {
    modalBg: '#1E293B',        // --color-surface
    textPrimary: '#F1F5F9',    // --color-text-primary
    textSecondary: '#94A3B8',  // --color-text-secondary
    border: '#334155',         // --color-border
    infoBg: '#334155',         // --color-border (for info boxes)
    infoText: '#94A3B8',       // --color-text-secondary
    inputBg: '#0F172A',        // --color-background
    inputBorder: '#334155',    // --color-border
    buttonSecondaryBg: '#334155',   // --color-border
    buttonSecondaryText: '#F1F5F9', // --color-text-primary
    buttonSecondaryBorder: '#334155', // --color-border
    primary: '#6366F1',        // --color-primary
    primaryDark: '#4338CA',    // --color-primary-dark
  };
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

    // Set up chat list observer for indicators
    setTimeout(() => {
      setupChatListObserver();
    }, 2000);

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
                updateChatListIndicators(); // Refresh indicators
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
                updateChatListIndicators(); // Refresh indicators
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
              } else {
                updateChatListIndicators(); // Refresh indicators
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
                updateChatListIndicators(); // Refresh indicators
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

  // Get theme colors
  const theme = getThemeColors();

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
    background: ${theme.modalBg};
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
  `;

  modal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: ${theme.textPrimary};">Add Note to Chat</h2>
      <button class="chatmarker-close-btn" style="background: none; border: none; font-size: 24px; color: ${theme.textSecondary}; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">×</button>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="padding: 12px; background: ${theme.infoBg}; border-radius: 6px; margin-bottom: 16px;">
        <strong style="color: ${theme.infoText};">Chat:</strong>
        <div style="color: ${theme.textSecondary}; margin-top: 4px;">${chatMarker.chatName}</div>
      </div>
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: ${theme.textPrimary};">Your Note:</label>
      <textarea class="chatmarker-note-textarea" placeholder="Add your note here..." maxlength="500" style="width: 100%; box-sizing: border-box; min-height: 120px; padding: 12px; border: 1px solid ${theme.inputBorder}; border-radius: 6px; font-family: inherit; font-size: 14px; resize: vertical; background: ${theme.inputBg}; color: ${theme.textPrimary}; transition: border-color 0.2s, box-shadow 0.2s;">${chatMarker.notes || ''}</textarea>
      <div style="text-align: right; margin-top: 4px; font-size: 12px; color: ${theme.textSecondary};">
        <span class="chatmarker-char-count">0</span> / 500
      </div>
    </div>
    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;">
      <button class="chatmarker-cancel-btn" style="padding: 10px 20px; border: 1px solid ${theme.buttonSecondaryBorder}; background: ${theme.buttonSecondaryBg}; color: ${theme.buttonSecondaryText}; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 14px; transition: all 0.2s;">Cancel</button>
      <button class="chatmarker-save-btn" style="padding: 10px 20px; border: none; background: ${theme.primary}; color: white; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 14px; transition: all 0.2s;">Save Note</button>
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

  // Add focus/blur effects for textarea
  textarea.addEventListener('focus', () => {
    textarea.style.borderColor = '#6366F1';
    textarea.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
  });
  textarea.addEventListener('blur', () => {
    textarea.style.borderColor = theme.inputBorder;
    textarea.style.boxShadow = 'none';
  });

  // Add hover effects for buttons
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = theme.inputBorder;
  });
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = theme.buttonSecondaryBg;
  });

  saveBtn.addEventListener('mouseenter', () => {
    saveBtn.style.background = theme.primaryDark;
    saveBtn.style.transform = 'translateY(-1px)';
    saveBtn.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
  });
  saveBtn.addEventListener('mouseleave', () => {
    saveBtn.style.background = theme.primary;
    saveBtn.style.transform = 'translateY(0)';
    saveBtn.style.boxShadow = 'none';
  });

  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = theme.inputBorder;
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'none';
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

    safeSendMessage(
      {
        action: 'saveChatMarker',
        data: { ...chatMarker, notes: noteText, updatedAt: Date.now() }
      },
      (response) => {
        if (response && response.success) {
          showToast('✅ Note saved');
          closeModal();
          updateChatListIndicators(); // Refresh indicators
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

  // Get theme colors
  const theme = getThemeColors();

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
    background: ${theme.modalBg};
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
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
      <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: ${theme.textPrimary};">Set Reminder for Chat</h2>
      <button class="chatmarker-close-btn" style="background: none; border: none; font-size: 24px; color: ${theme.textSecondary}; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">×</button>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="padding: 12px; background: ${theme.infoBg}; border-radius: 6px; margin-bottom: 16px;">
        <strong style="color: ${theme.infoText};">Chat:</strong>
        <div style="color: ${theme.textSecondary}; margin-top: 4px;">${chatMarker.chatName}</div>
      </div>
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: ${theme.textPrimary};">Quick Options:</label>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
        <button class="chatmarker-quick-reminder" data-minutes="60" style="padding: 10px; border: 1px solid ${theme.buttonSecondaryBorder}; background: ${theme.buttonSecondaryBg}; color: ${theme.buttonSecondaryText}; border-radius: 6px; cursor: pointer; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.2s;">⏰ 1 Hour</button>
        <button class="chatmarker-quick-reminder" data-minutes="180" style="padding: 10px; border: 1px solid ${theme.buttonSecondaryBorder}; background: ${theme.buttonSecondaryBg}; color: ${theme.buttonSecondaryText}; border-radius: 6px; cursor: pointer; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.2s;">⏰ 3 Hours</button>
        <button class="chatmarker-quick-reminder" data-minutes="1440" style="padding: 10px; border: 1px solid ${theme.buttonSecondaryBorder}; background: ${theme.buttonSecondaryBg}; color: ${theme.buttonSecondaryText}; border-radius: 6px; cursor: pointer; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.2s;">⏰ Tomorrow</button>
        <button class="chatmarker-quick-reminder" data-minutes="10080" style="padding: 10px; border: 1px solid ${theme.buttonSecondaryBorder}; background: ${theme.buttonSecondaryBg}; color: ${theme.buttonSecondaryText}; border-radius: 6px; cursor: pointer; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.2s;">⏰ Next Week</button>
      </div>
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: ${theme.textPrimary};">Or choose custom date & time:</label>
      <input type="datetime-local" class="chatmarker-custom-datetime" min="${minDateTime}" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid ${theme.inputBorder}; border-radius: 6px; font-family: inherit; font-size: 14px; background: ${theme.inputBg}; color: ${theme.textPrimary}; transition: border-color 0.2s, box-shadow 0.2s;">
    </div>
    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;">
      <button class="chatmarker-cancel-btn" style="padding: 10px 20px; border: 1px solid ${theme.buttonSecondaryBorder}; background: ${theme.buttonSecondaryBg}; color: ${theme.buttonSecondaryText}; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 14px; transition: all 0.2s;">Cancel</button>
      <button class="chatmarker-save-reminder-btn" disabled style="padding: 10px 20px; border: none; background: ${theme.textSecondary}; color: white; border-radius: 6px; font-weight: 500; cursor: not-allowed; font-size: 14px; transition: all 0.2s;">Set Reminder</button>
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

  // Function to enable save button
  const enableSaveButton = () => {
    saveBtn.disabled = false;
    saveBtn.style.background = theme.primary;
    saveBtn.style.cursor = 'pointer';
  };

  // Add hover effects for quick reminder buttons
  quickBtns.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.background = theme.primary;
      btn.style.borderColor = theme.primary;
      btn.style.color = 'white';
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 4px 8px rgba(99, 102, 241, 0.2)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = theme.buttonSecondaryBg;
      btn.style.borderColor = theme.buttonSecondaryBorder;
      btn.style.color = theme.buttonSecondaryText;
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = 'none';
    });
  });

  // Add focus/blur effects for datetime input
  customDateTime.addEventListener('focus', () => {
    customDateTime.style.borderColor = theme.primary;
    customDateTime.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
  });
  customDateTime.addEventListener('blur', () => {
    customDateTime.style.borderColor = theme.inputBorder;
    customDateTime.style.boxShadow = 'none';
  });

  // Enable save button when datetime is selected
  customDateTime.addEventListener('change', () => {
    if (customDateTime.value) {
      enableSaveButton();
    }
  });

  // Add hover effects for cancel button
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = theme.inputBorder;
  });
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = theme.buttonSecondaryBg;
  });

  // Add hover effects for save button (when enabled)
  saveBtn.addEventListener('mouseenter', () => {
    if (!saveBtn.disabled) {
      saveBtn.style.background = theme.primaryDark;
      saveBtn.style.transform = 'translateY(-1px)';
      saveBtn.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
    }
  });
  saveBtn.addEventListener('mouseleave', () => {
    if (!saveBtn.disabled) {
      saveBtn.style.background = theme.primary;
      saveBtn.style.transform = 'translateY(0)';
      saveBtn.style.boxShadow = 'none';
    }
  });

  // Add hover effect for close button
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = theme.inputBorder;
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'none';
  });

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
    if (saveBtn.disabled) {
      return;
    }
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
          updateChatListIndicators(); // Refresh indicators
        } else {
          showToast('❌ Failed to set reminder');
        }
      }
    );
  }
}

/**
 * Set up observer for chat list to add indicators
 */
function setupChatListObserver() {
  console.log('[ChatMarker] Setting up chat list observer for indicators...');

  // Initial update
  setTimeout(() => {
    updateChatListIndicators();
  }, 1000);

  // Set up MutationObserver to watch for chat list changes
  const observer = new MutationObserver(() => {
    clearTimeout(window.whatsappChatListUpdateTimeout);
    window.whatsappChatListUpdateTimeout = setTimeout(() => {
      updateChatListIndicators();
    }, 500);
  });

  // Observe the entire document for changes (WhatsApp is highly dynamic)
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[ChatMarker] Chat list observer set up');
}

/**
 * Update indicators for all marked chats in the list
 */
function updateChatListIndicators() {
  safeSendMessage(
    {
      action: 'getAllChatMarkers'
    },
    (response) => {
      if (response && response.success && response.data) {
        // Convert object to array if needed
        const markersData = response.data;
        const markers = Array.isArray(markersData) ? markersData : Object.values(markersData);
        const whatsappMarkers = markers.filter(m => m.platform === 'whatsapp');

        console.log('[ChatMarker] Found', whatsappMarkers.length, 'WhatsApp markers');

        const chatItems = findChatListItems();

        chatItems.forEach(({ element, name }) => {
          // Match by chat name since chat list items don't have the same ID format
          const matchedMarker = whatsappMarkers.find(m => m.chatName === name);
          const isMarked = !!matchedMarker;

          console.log(`[ChatMarker] Chat "${name}": marked=${isMarked}`);

          // Check if indicator already exists
          const existingIndicator = element.querySelector('.chatmarker-whatsapp-indicator');

          if (isMarked && !existingIndicator) {
            console.log(`[ChatMarker] ⭐ Adding indicator to "${name}"`);
            addChatListIndicator(element, matchedMarker);
          } else if (!isMarked && existingIndicator) {
            console.log(`[ChatMarker] Removing indicator from "${name}"`);
            existingIndicator.remove();
          } else if (isMarked && existingIndicator) {
            console.log(`[ChatMarker] Indicator already exists for "${name}"`);
          }
        });
      }
    }
  );
}

/**
 * Find all chat list items in WhatsApp sidebar
 */
function findChatListItems() {
  const chatItems = [];

  // WhatsApp chat list items - updated selectors based on current DOM
  const selectors = [
    'div._ak72',  // Current WhatsApp structure
    'div[role="listitem"]',
    'div[data-testid="cell-frame-container"]'
  ];

  let allChatElements = [];
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      allChatElements = Array.from(elements);
      console.log(`[ChatMarker] Found ${elements.length} chat items using selector: ${selector}`);
      break;
    }
  }

  if (allChatElements.length === 0) {
    console.warn('[ChatMarker] No chat items found with any selector');
    return chatItems;
  }

  allChatElements.forEach(element => {
    // Try to extract chat name from the element
    const chatName = extractChatNameFromListItem(element);
    if (chatName) {
      console.log(`[ChatMarker] Found chat item: "${chatName}"`);
      chatItems.push({
        element: element,
        name: chatName
      });
    }
  });

  console.log('[ChatMarker] Total chat items with names:', chatItems.length);
  return chatItems;
}

/**
 * Extract chat name from a chat list item
 */
function extractChatNameFromListItem(element) {
  // Try to find span with title attribute first (most reliable)
  const titleSpan = element.querySelector('span[title]');
  if (titleSpan) {
    const title = titleSpan.getAttribute('title');
    if (title && title.length > 0) {
      // Make sure it's not a message preview or timestamp
      if (!title.match(/^\d/) && !title.includes(':')) {
        return title;
      }
    }
  }

  // Fallback: try other selectors
  const selectors = [
    'span[data-testid="conversation-title"]',
    'span.x1iyjqo2.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft[dir="auto"]'
  ];

  for (const selector of selectors) {
    const nameElement = element.querySelector(selector);
    if (nameElement) {
      const name = nameElement.textContent.trim();
      if (name && name.length > 0) {
        return name;
      }
    }
  }

  return null;
}

/**
 * Add star indicator to a chat list item
 */
function addChatListIndicator(chatElement, chatMarker) {
  // Find the parent container to position relative to
  // The indicator should be on the outer container
  let container = chatElement;

  // If this is the inner _ak72 div, go up to the parent
  if (chatElement.classList.contains('_ak72')) {
    container = chatElement.parentElement;
  }

  // Make sure the container is positioned
  if (!container.style.position || container.style.position === 'static') {
    container.style.position = 'relative';
  }

  const indicator = document.createElement('div');
  indicator.className = 'chatmarker-whatsapp-indicator';
  indicator.textContent = '⭐';
  indicator.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 18px;
    z-index: 999;
    pointer-events: none;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
    line-height: 1;
  `;

  container.appendChild(indicator);
  console.log('[ChatMarker] ✅ Star indicator added to container');
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
