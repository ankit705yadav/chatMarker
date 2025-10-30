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
 * Initialize the content script
 */
async function init() {
  if (isInitialized) return;

  console.log('[ChatMarker] Initializing WhatsApp Web integration...');

  try {
    // Wait for WhatsApp to fully load - increased timeout for slow connections
    console.log('[ChatMarker] Waiting for #main element...');
    await waitForElement(SELECTORS.chatContainer, 30000);
    console.log('[ChatMarker] #main found!');

    // Wait a bit more for messages to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Load marked messages from storage
    await loadMarkedMessages();

    // Process existing messages
    await processAllMessages();

    // Set up observer for new messages
    setupMutationObserver();

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
 * Load marked messages from storage via background
 */
async function loadMarkedMessages() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
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
 */
function generateMessageId(messageData) {
  const { platform, chatId, sender, timestamp, messageText } = messageData;

  // Simple hash function for content
  const contentHash = simpleHash(messageText.substring(0, 100));

  return `${platform}:${chatId}:${sender}:${timestamp}:${contentHash}`;
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

  // Add click handler
  iconContainer.addEventListener('click', (e) => {
    e.stopPropagation();
    handleMarkToggle(messageElement, messageId);
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
  chrome.runtime.sendMessage(
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
  chrome.runtime.sendMessage(
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
          chrome.runtime.sendMessage(
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
    chrome.runtime.sendMessage(
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

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
    setupNavigationWatcher();
  });
} else {
  init();
  setupNavigationWatcher();
}

console.log('[ChatMarker] WhatsApp content script loaded');
