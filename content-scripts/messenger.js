/**
 * ChatMarker - Facebook Messenger Content Script
 * Handles chat marking on Facebook's floating messenger bar
 */

console.log('[ChatMarker] Facebook Messenger content script loaded');

// ==========================================
// GLOBAL STATE
// ==========================================

// Store the last right-clicked element to extract chat info from
let lastRightClickedElement = null;

// ==========================================
// INITIALIZATION
// ==========================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('[ChatMarker] Initializing Facebook Messenger integration...');

  // Set up chat list observer after a delay to let Facebook load
  setTimeout(() => {
    setupChatListObserver();
  }, 2000);

  // Listen for messages from background script
  setupMessageListener();

  // Listen for right-clicks to capture the clicked element
  setupContextMenuCapture();

  console.log('[ChatMarker] Facebook Messenger integration initialized');
}

/**
 * Capture right-click events to know which element was clicked
 */
function setupContextMenuCapture() {
  document.addEventListener('contextmenu', (e) => {
    lastRightClickedElement = e.target;
    console.log('[ChatMarker] Right-clicked element:', e.target);
  }, true);
}

// ==========================================
// DARK MODE DETECTION
// ==========================================

/**
 * Detect if Facebook is in dark mode
 */
function isDarkMode() {
  // Facebook uses __fb-dark-mode class on html element
  if (document.documentElement.classList.contains('__fb-dark-mode')) {
    return true;
  }

  // Also check data-color-scheme attribute
  const colorScheme = document.documentElement.getAttribute('data-color-scheme');
  if (colorScheme === 'dark') {
    return true;
  }

  // Fallback: Check background color brightness
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

// ==========================================
// CHAT DETECTION & EXTRACTION
// ==========================================

/**
 * Find all chat items in the messenger sidebar
 */
function findChatItems() {
  // Look for chat items by their structure
  // The name is in nested spans, so we'll find elements with this pattern
  const chatItems = [];

  // Find all elements that contain the name pattern
  const nameSpans = document.querySelectorAll('span.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft');

  nameSpans.forEach(span => {
    const chatName = span.textContent.trim();

    // Use the same validation as extractChatNameFromElement
    if (!isValidChatName(chatName)) return;

    // Find the parent chat item container
    // The chat item is several levels up from the name span
    let chatItem = span;
    let depth = 0;
    const maxDepth = 15; // Safety limit

    while (chatItem && depth < maxDepth) {
      chatItem = chatItem.parentElement;
      depth++;

      // Look for a container that has profile image and name
      if (chatItem && chatItem.querySelector('img[src*="fbcdn"]')) {
        // This is likely the chat item container
        const chatId = generateChatId(chatName);
        console.log('[ChatMarker] Found chat item:', chatName, '→', chatId);
        chatItems.push({
          element: chatItem,
          name: chatName,
          chatId: chatId
        });
        break;
      }
    }
  });

  console.log('[ChatMarker] Total chat items found:', chatItems.length);
  return chatItems;
}

/**
 * Generate a consistent chat ID from chat name
 */
function generateChatId(chatName) {
  // Simple hash function for chat ID
  let hash = 0;
  for (let i = 0; i < chatName.length; i++) {
    const char = chatName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'facebook:' + Math.abs(hash).toString(36);
}

/**
 * Get current chat info from right-clicked element
 */
function getCurrentChatInfo() {
  // Extract from the right-clicked element (only works on chat list items)
  if (lastRightClickedElement) {
    const chatName = extractChatNameFromElement(lastRightClickedElement);
    if (chatName) {
      console.log('[ChatMarker] Extracted chat name from right-click:', chatName);
      return {
        chatId: generateChatId(chatName),
        chatName: chatName,
        platform: 'facebook'
      };
    }
  }

  // If we can't extract the chat name, user didn't right-click on a chat item
  return null;
}

/**
 * Extract chat name from a clicked element by traversing up the DOM
 */
function extractChatNameFromElement(element) {
  if (!element) return null;

  // Traverse up the DOM to find the chat name
  let current = element;
  let depth = 0;
  const maxDepth = 20; // Safety limit

  while (current && depth < maxDepth) {
    // Look for the specific span that contains the chat name
    const nameSpan = current.querySelector('span.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft');

    if (nameSpan) {
      const chatName = nameSpan.textContent.trim();

      // Check if this is a valid chat name (not a timestamp, system message, etc.)
      if (isValidChatName(chatName)) {
        return chatName;
      }
    }

    current = current.parentElement;
    depth++;
  }

  return null;
}

/**
 * Check if a string is a valid chat name
 */
function isValidChatName(text) {
  if (!text || text.length === 0) return false;

  // Filter out system messages
  if (text.startsWith('You:')) return false;
  if (text.includes('new message')) return false;
  if (text.includes('·')) return false;

  // Filter out timestamps (like "37w", "1h", "2d", "3m", etc.)
  // Pattern: number followed by single letter (w, h, d, m, s)
  const timestampPattern = /^\d+[whdms]$/i;
  if (timestampPattern.test(text)) return false;

  // Filter out very short text (timestamps and other non-names)
  // Most chat names are at least 2 characters
  if (text.length < 2) return false;

  // Filter out common non-name patterns
  if (text === 'Marketplace') return false;
  if (text.toLowerCase().includes('unavailable')) return false;

  return true;
}

// ==========================================
// CHAT LIST INDICATORS
// ==========================================

/**
 * Set up observer for chat list to add indicators
 */
function setupChatListObserver() {
  console.log('[ChatMarker] Setting up chat list observer for indicators...');

  // Initial update
  setTimeout(() => {
    setTimeout(() => updateChatListIndicators(), 200);
  }, 1000);

  // Set up MutationObserver to watch for chat list changes
  const observer = new MutationObserver(() => {
    setTimeout(() => updateChatListIndicators(), 200);
  });

  // Observe the entire document body for changes (Facebook is highly dynamic)
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

        console.log('[ChatMarker] Markers:', markers.map(m => `${m.chatName} (${m.chatId})`));

        const chatItems = findChatItems();

        chatItems.forEach(({ element, name, chatId }) => {
          const matchedMarker = markers.find(m => m.chatId === chatId);
          const isMarked = !!matchedMarker;

          console.log(`[ChatMarker] Chat: "${name}" (${chatId}) → Marked: ${isMarked}`);

          // Check if indicator already exists
          const existingIndicator = element.querySelector('.chatmarker-facebook-indicator');

          if (isMarked && !existingIndicator) {
            console.log(`[ChatMarker] Adding indicator to "${name}"`);
            addChatListIndicator(element, matchedMarker);
          } else if (isMarked && existingIndicator) {
            // Update existing indicator in case labels changed
            existingIndicator.remove();
            addChatListIndicator(element, matchedMarker);
          } else if (!isMarked && existingIndicator) {
            console.log(`[ChatMarker] Removing indicator from "${name}"`);
            existingIndicator.remove();
          }
        });
      }
    }
  );
}

/**
 * Add indicator (star or labels) to a chat list item
 */
function addChatListIndicator(chatElement, chatMarker) {
  // Use overlay positioning (like Reddit) to prevent Facebook from removing it
  chatElement.style.position = 'relative';

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

  if (chatMarker && chatMarker.labels && chatMarker.labels.length > 0) {
    // Show label emojis instead of star
    displayContent = chatMarker.labels.map(label => labelEmojis[label] || '🏷️').join('');
    titleText = `Labels: ${chatMarker.labels.join(', ')}`;
  }

  // Add notes to tooltip if present
  if (chatMarker && chatMarker.notes && chatMarker.notes.trim()) {
    titleText += `\n\nNote: ${chatMarker.notes}`;
  }

  const indicator = document.createElement('div');
  indicator.className = 'chatmarker-facebook-indicator';
  indicator.textContent = displayContent;
  indicator.title = titleText;
  indicator.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 16px;
    z-index: 10;
    pointer-events: auto;
    cursor: pointer;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  `;

  chatElement.appendChild(indicator);
}

// ==========================================
// MESSAGE PASSING
// ==========================================

/**
 * Safe wrapper for chrome.runtime.sendMessage
 */
function safeSendMessage(message, callback) {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[ChatMarker] Message error:', chrome.runtime.lastError);
        if (callback) callback({ success: false, error: chrome.runtime.lastError.message });
      } else {
        if (callback) callback(response);
      }
    });
  } catch (error) {
    console.error('[ChatMarker] Failed to send message:', error);
    if (callback) callback({ success: false, error: error.message });
  }
}

/**
 * Set up listener for messages from background script
 */
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[ChatMarker] Received message:', request);

    switch (request.action) {
      case 'contextMenuAction':
        handleContextMenuAction(request.menuItemId);
        break;
      case 'markChat':
        handleMarkChat();
        break;
      case 'addNote':
        handleAddNote();
        break;
      case 'setReminder':
        handleSetReminder();
        break;
      case 'chatMarkerUpdated':
        // Refresh indicators when markers are updated
        setTimeout(() => updateChatListIndicators(), 200);
        break;
    }

    sendResponse({ success: true });
    return true; // Keep message channel open for async response
  });
}

/**
 * Handle context menu action
 */
function handleContextMenuAction(menuItemId) {
  console.log('[ChatMarker] Context menu action:', menuItemId);

  if (menuItemId === 'chatmarker-mark-chat') {
    handleMarkChat();
  } else if (menuItemId === 'chatmarker-note') {
    handleAddNote();
  } else if (menuItemId === 'chatmarker-reminder') {
    handleSetReminder();
  } else if (menuItemId.startsWith('chatmarker-label-')) {
    const labelId = menuItemId.replace('chatmarker-label-', '');
    handleAddLabel(labelId);
  }
}

/**
 * Handle add label action
 */
function handleAddLabel(labelId) {
  const chatInfo = getCurrentChatInfo();

  if (!chatInfo) {
    showToast('⚠️ Please open a chat first');
    return;
  }

  // Get existing marker or create new one
  safeSendMessage(
    {
      action: 'getChatMarker',
      chatId: chatInfo.chatId,
      platform: 'facebook'
    },
    (response) => {
      let chatMarker;

      if (response && response.success && response.data) {
        chatMarker = response.data;
      } else {
        // Create new marker
        chatMarker = {
          chatMarkerId: chatInfo.chatId,
          platform: 'facebook',
          chatId: chatInfo.chatId,
          chatName: chatInfo.chatName,
          labels: [],
          notes: '',
          timestamp: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      }

      // Toggle label
      if (!chatMarker.labels) chatMarker.labels = [];

      if (chatMarker.labels.includes(labelId)) {
        // Remove label
        chatMarker.labels = chatMarker.labels.filter(l => l !== labelId);
        showToast(`🏷️ Label removed`);
      } else {
        // Add label
        chatMarker.labels.push(labelId);
        showToast(`🏷️ Label added`);
      }

      // Save
      safeSendMessage(
        {
          action: 'saveChatMarker',
          data: { ...chatMarker, updatedAt: Date.now() }
        },
        (response) => {
          if (response && response.success) {
            setTimeout(() => updateChatListIndicators(), 200);
          }
        }
      );
    }
  );
}

/**
 * Handle mark/unmark chat action
 */
function handleMarkChat() {
  const chatInfo = getCurrentChatInfo();

  if (!chatInfo) {
    showToast('⚠️ Please open a chat first');
    return;
  }

  // Check if already marked
  safeSendMessage(
    {
      action: 'getChatMarker',
      chatId: chatInfo.chatId,
      platform: 'facebook'
    },
    (response) => {
      if (response && response.success && response.data) {
        // Already marked, show options
        showChatMarkerOptions(response.data);
      } else {
        // Not marked, create new marker
        const markerData = {
          chatMarkerId: chatInfo.chatId,
          platform: 'facebook',
          chatId: chatInfo.chatId,
          chatName: chatInfo.chatName,
          labels: [],
          notes: '',
          timestamp: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        safeSendMessage(
          {
            action: 'saveChatMarker',
            data: markerData
          },
          (response) => {
            if (response && response.success) {
              showToast('⭐ Chat marked');
              setTimeout(() => updateChatListIndicators(), 200);
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
 * Show options for an existing chat marker
 */
function showChatMarkerOptions(chatMarker) {
  // For now, just show a simple confirm to unmark
  if (confirm(`Chat "${chatMarker.chatName}" is marked.\n\nUnmark it?`)) {
    safeSendMessage(
      {
        action: 'deleteChatMarker',
        chatMarkerId: chatMarker.chatMarkerId
      },
      (response) => {
        if (response && response.success) {
          showToast('✓ Chat unmarked');
          setTimeout(() => updateChatListIndicators(), 200);
        } else {
          showToast('❌ Failed to unmark chat');
        }
      }
    );
  }
}

/**
 * Handle add note action
 */
function handleAddNote() {
  const chatInfo = getCurrentChatInfo();

  if (!chatInfo) {
    showToast('⚠️ Please open a chat first');
    return;
  }

  // Get existing marker or create new one
  safeSendMessage(
    {
      action: 'getChatMarker',
      chatId: chatInfo.chatId,
      platform: 'facebook'
    },
    (response) => {
      if (response && response.success && response.data) {
        showInlineNoteModal(response.data);
      } else {
        // Create new marker
        const markerData = {
          chatMarkerId: chatInfo.chatId,
          platform: 'facebook',
          chatId: chatInfo.chatId,
          chatName: chatInfo.chatName,
          labels: [],
          notes: '',
          timestamp: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        showInlineNoteModal(markerData);
      }
    }
  );
}

/**
 * Handle set reminder action
 */
function handleSetReminder() {
  const chatInfo = getCurrentChatInfo();

  if (!chatInfo) {
    showToast('⚠️ Please open a chat first');
    return;
  }

  // Get existing marker or create new one
  safeSendMessage(
    {
      action: 'getChatMarker',
      chatId: chatInfo.chatId,
      platform: 'facebook'
    },
    (response) => {
      if (response && response.success && response.data) {
        showInlineReminderModal(response.data);
      } else {
        // Create new marker
        const markerData = {
          chatMarkerId: chatInfo.chatId,
          platform: 'facebook',
          chatId: chatInfo.chatId,
          chatName: chatInfo.chatName,
          labels: [],
          notes: '',
          timestamp: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        showInlineReminderModal(markerData);
      }
    }
  );
}

// ==========================================
// INLINE NOTE MODAL
// ==========================================

/**
 * Show inline note modal on Facebook page
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
          setTimeout(() => updateChatListIndicators(), 200);
        } else {
          showToast('❌ Failed to save note');
        }
      }
    );
  });

  // Focus textarea
  textarea.focus();
}

// ==========================================
// INLINE REMINDER MODAL
// ==========================================

/**
 * Show inline reminder modal on Facebook page
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
    customDateTime.style.borderColor = '#6366F1';
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
      platform: 'facebook',
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
          setTimeout(() => updateChatListIndicators(), 200);
        } else {
          showToast('❌ Failed to set reminder');
        }
      }
    );
  }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

/**
 * Show toast notification
 */
function showToast(message) {
  // Remove existing toast if any
  const existingToast = document.querySelector('.chatmarker-toast');
  if (existingToast) existingToast.remove();

  const theme = getThemeColors();

  const toast = document.createElement('div');
  toast.className = 'chatmarker-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${theme.modalBg};
    color: ${theme.textPrimary};
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
    border: 1px solid ${theme.border};
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
