/**
 * ChatMarker - Reddit Content Script
 * Chat-only marking (no individual message marking)
 */

// Reddit DOM selectors
const SELECTORS = {
  // Chat container (floating overlay at bottom right)
  chatContainer: "div.group.overflow-hidden",
  chatWindow: 'div[class*="rounded-tl-"][class*="rounded-tr-"]',

  // Chat header
  chatHeader: "header.flex.items-center",
  chatHeaderText: "header.flex.items-center h-\\[2\\.75rem\\]",

  // Messages
  messageContainer: "div.room-message",
  messageRegular: "div.room-message.regular",

  // Room/Chat list
  roomsList: 'rs-virtual-scroll[class*="rs-rooms-nav"]',
  roomBanners: "rs-room-banners",

  // Full-screen chat (chat.reddit.com)
  fullScreenChatList: 'a[aria-label*="Direct chat with"]',
  fullScreenChatHeader: "header.flex.items-center.h-\\[2\\.75rem\\]",
  fullScreenUsername: ".text-14.font-sans.font-semibold",
  fullScreenRoomName: ".room-name",
  fullScreenLastMessageTime: ".last-message-time",

  // Old Reddit messages (fallback)
  oldRedditMessageContainer: ".message",
  oldRedditInbox: '.content[role="main"]',
};

// State management
let isInitialized = false;
let currentChatId = null;
let lastRightClickedElement = null;

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
    console.warn(
      "[ChatMarker] Extension context invalidated - page reload recommended",
    );
    if (callback) {
      callback({ success: false, error: "Extension context invalidated" });
    }
    return;
  }

  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "[ChatMarker] Message send error:",
          chrome.runtime.lastError.message,
        );
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
    console.error("[ChatMarker] Failed to send message:", error);
    if (callback) {
      callback({ success: false, error: error.message });
    }
  }
}

/**
 * Detect if Reddit is in dark mode
 */
function isDarkMode() {
  // Reddit uses body class for theme
  if (document.body.classList.contains("theme-dark")) return true;

  // Also check data-theme attribute
  const bodyTheme = document.body.getAttribute("data-theme");
  if (bodyTheme === "dark") return true;

  // Fallback: check body background color
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  const rgb = bodyBg.match(/\d+/g);
  if (rgb) {
    const brightness =
      (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
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
    modalBg: "#1E293B", // --color-surface
    textPrimary: "#F1F5F9", // --color-text-primary
    textSecondary: "#94A3B8", // --color-text-secondary
    border: "#334155", // --color-border
    infoBg: "#334155", // --color-border (for info boxes)
    infoText: "#94A3B8", // --color-text-secondary
    inputBg: "#0F172A", // --color-background
    inputBorder: "#334155", // --color-border
    buttonSecondaryBg: "#334155", // --color-border
    buttonSecondaryText: "#F1F5F9", // --color-text-primary
    buttonSecondaryBorder: "#334155", // --color-border
    primary: "#6366F1", // --color-primary
    primaryDark: "#4338CA", // --color-primary-dark
  };
}

/**
 * Initialize the content script
 */
async function init() {
  if (isInitialized) return;

  console.log(
    "[ChatMarker] Initializing Reddit integration (chat-only mode)...",
  );

  try {
    // Detect which Reddit interface we're on
    const isOldReddit = window.location.hostname === "old.reddit.com";
    const isNewReddit = window.location.hostname === "www.reddit.com";
    const isFullScreenChat = window.location.hostname === "chat.reddit.com";

    if (isFullScreenChat) {
      // Wait for full-screen chat to load
      await waitForElement("body", 5000);
      console.log("[ChatMarker] Full-screen Reddit Chat detected");
      console.log("[ChatMarker] Right-click on a chat in the list to mark it");
    } else if (isNewReddit) {
      // Wait for Reddit to load
      await waitForElement("body", 5000);
      console.log("[ChatMarker] New Reddit detected");

      // Note: Chat window is a floating overlay that may not be open yet
      // The extension will work when user opens a chat
      console.log(
        "[ChatMarker] Waiting for chat window to be opened by user...",
      );
    } else if (isOldReddit) {
      await waitForElement("body", 5000);
      console.log("[ChatMarker] Old Reddit detected");
    }

    // Listen for messages from background
    chrome.runtime.onMessage.addListener(handleBackgroundMessage);

    // Set up right-click capture for chat list marking
    setupContextMenuCapture();

    // Set up chat list observer for indicators
    setTimeout(() => {
      setupChatListObserver();
      setupOpenChatObserver();
    }, 2000);

    isInitialized = true;
    console.log("[ChatMarker] Reddit integration ready (chat-only mode)");
    console.log(
      '[ChatMarker] Right-click anywhere on the page and select "ChatMarker" to mark a chat',
    );
  } catch (error) {
    console.error("[ChatMarker] Initialization failed:", error);
    console.log("[ChatMarker] Will retry initialization in 5 seconds...");

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
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for ${selector}`));
    }, timeout);
  });
}

/**
 * Helper function to search through shadow DOM
 */
function findInShadowDOM(selector, root = document) {
  // First try normal query
  let result = root.querySelector(selector);
  if (result) return result;

  // Search through all shadow roots
  const allElements = root.querySelectorAll("*");
  for (const element of allElements) {
    if (element.shadowRoot) {
      result = findInShadowDOM(selector, element.shadowRoot);
      if (result) return result;
    }
  }
  return null;
}

/**
 * Helper function to get all matching elements including shadow DOM
 */
function findAllInShadowDOM(selector, root = document) {
  const results = [];

  // Add results from current level
  results.push(...root.querySelectorAll(selector));

  // Search through all shadow roots
  const allElements = root.querySelectorAll("*");
  for (const element of allElements) {
    if (element.shadowRoot) {
      results.push(...findAllInShadowDOM(selector, element.shadowRoot));
    }
  }
  return results;
}

/**
 * Capture right-click events to know which chat list item was clicked
 */
function setupContextMenuCapture() {
  document.addEventListener(
    "contextmenu",
    (e) => {
      lastRightClickedElement = e.target;

      // Store the composed path (includes shadow DOM)
      if (e.composedPath) {
        window.chatMarkerLastClickPath = e.composedPath();
        console.log(
          "[ChatMarker] Right-clicked element (with composed path):",
          e.target,
        );
        console.log(
          "[ChatMarker] Composed path length:",
          window.chatMarkerLastClickPath.length,
        );
      } else {
        window.chatMarkerLastClickPath = null;
        console.log("[ChatMarker] Right-clicked element:", e.target);
      }
    },
    true,
  );
}

/**
 * Extract chat name from right-clicked chat list item
 */
function getChatNameFromRightClick() {
  if (!lastRightClickedElement && !window.chatMarkerLastClickPath) {
    console.log("[ChatMarker] No lastRightClickedElement or composedPath");
    return null;
  }

  console.log(
    "[ChatMarker] Extracting from right-clicked element:",
    lastRightClickedElement,
  );

  // Method 1: Use composedPath if available (handles shadow DOM)
  if (window.chatMarkerLastClickPath) {
    console.log(
      "[ChatMarker] Using composedPath to traverse shadow DOM boundaries",
    );

    for (let i = 0; i < window.chatMarkerLastClickPath.length; i++) {
      const element = window.chatMarkerLastClickPath[i];

      // Debug first 10 elements
      if (i < 10) {
        console.log(
          `[ChatMarker] Path[${i}]:`,
          element.tagName || element.nodeName,
          element.className || "",
        );
      }

      // Look for room-name span first (for full-screen chat)
      if (element.classList?.contains("room-name")) {
        const name = element.textContent.trim();
        if (name && name.length > 0) {
          console.log(
            "[ChatMarker] ✅ Extracted chat name from room-name span (composedPath):",
            name,
          );
          return name;
        }
      }

      // Look for <a> element with aria-label
      if (element.tagName === "A") {
        const ariaLabel = element.getAttribute?.("aria-label");
        console.log("[ChatMarker] Found <a> with aria-label:", ariaLabel);

        if (ariaLabel?.includes("Direct chat with")) {
          const match = ariaLabel.match(/Direct chat with ([A-Za-z0-9_-]+)/);
          if (match) {
            console.log(
              "[ChatMarker] ✅ Extracted chat name from aria-label (composedPath):",
              match[1],
            );
            return match[1];
          }
        }

        // Try to find room-name span inside this <a>
        if (element.querySelector) {
          const roomNameSpan = element.querySelector(".room-name");
          if (roomNameSpan) {
            const name = roomNameSpan.textContent.trim();
            if (name && name.length > 0) {
              console.log(
                "[ChatMarker] ✅ Extracted chat name from room-name span (composedPath):",
                name,
              );
              return name;
            }
          }
        }
      }
    }
  }

  // Method 2: Fallback to normal DOM traversal
  let element = lastRightClickedElement;
  let depth = 0;
  const maxDepth = 20;

  while (element && depth < maxDepth) {
    // Look for the <a> element with aria-label containing "Direct chat with"
    if (element.tagName === "A") {
      const ariaLabel = element.getAttribute("aria-label");

      if (ariaLabel?.includes("Direct chat with")) {
        const match = ariaLabel.match(/Direct chat with ([A-Za-z0-9_-]+)/);
        if (match) {
          console.log(
            "[ChatMarker] ✅ Extracted chat name from aria-label:",
            match[1],
          );
          return match[1];
        }
      }

      // Also try to find room-name span inside this <a>
      const roomNameSpan = element.querySelector(".room-name");
      if (roomNameSpan) {
        const name = roomNameSpan.textContent.trim();
        if (name && name.length > 0) {
          console.log(
            "[ChatMarker] ✅ Extracted chat name from room-name span:",
            name,
          );
          return name;
        }
      }
    }

    element = element.parentElement;
    depth++;
  }

  console.log("[ChatMarker] ❌ Could not extract chat name from right-click");
  return null;
}

/**
 * Extract chat ID from current conversation
 */
function getCurrentChatId() {
  console.log("[ChatMarker] Attempting to get chat ID...");

  // First, try to generate ID from right-clicked chat list item
  const nameFromRightClick = getChatNameFromRightClick();
  if (nameFromRightClick) {
    const chatId = `reddit_chat_${nameFromRightClick}`;
    console.log("[ChatMarker] Generated chat ID from right-click:", chatId);
    return chatId;
  }

  // For chat.reddit.com, check regular DOM first
  if (window.location.hostname === "chat.reddit.com") {
    const titleDiv = document.querySelector('div[title][aria-label*="Current chat"]');
    if (titleDiv) {
      const username = titleDiv.getAttribute("title");
      if (username) {
        const chatId = `reddit_chat_${username}`;
        console.log("[ChatMarker] Chat ID from title div (full-screen):", chatId);
        return chatId;
      }
    }
  }

  // Method 1: Look for the div with title and aria-label containing "Direct chat" (including Shadow DOM)
  const titleDiv = findInShadowDOM('div[title][aria-label*="Direct chat"]');
  if (titleDiv) {
    const username = titleDiv.getAttribute("title");
    if (username) {
      const chatId = `reddit_chat_${username}`;
      console.log("[ChatMarker] Chat ID from title div:", chatId);
      return chatId;
    }
  }

  // Method 2: Look for aria-label containing "Direct chat with"
  const chatLabel = findInShadowDOM('[aria-label*="Direct chat with"]');
  if (chatLabel) {
    const label = chatLabel.getAttribute("aria-label");
    const match = label.match(/Direct chat with ([A-Za-z0-9_-]+)/);
    if (match) {
      const chatId = `reddit_chat_${match[1]}`;
      console.log("[ChatMarker] Chat ID from aria-label:", chatId);
      return chatId;
    }
  }

  // Method 3: Try to find any header with flex and items-center classes
  const headers = findAllInShadowDOM("header.flex.items-center");
  console.log("[ChatMarker] Found headers:", headers.length);

  for (const header of headers) {
    // Look for title div inside this header
    const titleDiv = header.querySelector("div[title]");
    if (titleDiv) {
      const username = titleDiv.getAttribute("title");
      if (username && username.length > 0) {
        const chatId = `reddit_chat_${username}`;
        console.log("[ChatMarker] Chat ID from header title:", chatId);
        return chatId;
      }
    }
  }

  // Method 4: Try to get from messages
  const messages = findAllInShadowDOM("div.room-message");
  console.log("[ChatMarker] Found messages:", messages.length);

  if (messages.length > 0) {
    for (const message of messages) {
      const ariaLabel = message.getAttribute("aria-label");
      if (ariaLabel) {
        console.log("[ChatMarker] Message aria-label:", ariaLabel);
        // aria-label format: "Careless_Ad_7706 said 18 ho..."
        const usernameMatch = ariaLabel.match(/^([A-Za-z0-9_-]+)\s+said/);
        if (usernameMatch) {
          const chatId = `reddit_chat_${usernameMatch[1]}`;
          console.log("[ChatMarker] Chat ID from message:", chatId);
          return chatId;
        }
      }
    }
  }

  // For old Reddit messages - extract from URL
  const url = window.location.href;

  // Check for direct message thread
  const dmMatch = url.match(/\/message\/messages\/([a-z0-9]+)/i);
  if (dmMatch) return `dm_${dmMatch[1]}`;

  // Check for specific message
  const messageMatch = url.match(/\/message\/[^/]+\/([a-z0-9]+)/i);
  if (messageMatch) return `msg_${messageMatch[1]}`;

  // Check for modmail
  const modmailMatch = url.match(/\/r\/([^/]+)\/about\/modmail/);
  if (modmailMatch) return `modmail_${modmailMatch[1]}`;

  console.log("[ChatMarker] Could not determine chat ID");
  return "unknown";
}

/**
 * Extract chat name
 */
function getChatName() {
  console.log("[ChatMarker] Attempting to get chat name...");

  // First, try to get from right-clicked chat list item
  const nameFromRightClick = getChatNameFromRightClick();
  if (nameFromRightClick) {
    return nameFromRightClick;
  }

  // For chat.reddit.com, check regular DOM first
  if (window.location.hostname === "chat.reddit.com") {
    const titleDiv = document.querySelector('div[title][aria-label*="Current chat"]');
    if (titleDiv) {
      const username = titleDiv.getAttribute("title");
      if (username) {
        console.log("[ChatMarker] Found chat name from title div:", username);
        return username;
      }
    }
  }

  // Method 1: Look for the div with title attribute (including Shadow DOM)
  const titleDiv = findInShadowDOM('div[title][aria-label*="Direct chat"]');
  if (titleDiv) {
    const username = titleDiv.getAttribute("title");
    if (username) {
      console.log("[ChatMarker] Found chat name from title div:", username);
      return username;
    }
  }

  // Method 2: Look for aria-label containing "Direct chat with"
  const chatLabel = findInShadowDOM('[aria-label*="Direct chat with"]');
  if (chatLabel) {
    const label = chatLabel.getAttribute("aria-label");
    const match = label.match(/Direct chat with ([A-Za-z0-9_-]+)/);
    if (match) {
      console.log("[ChatMarker] Found chat name from aria-label:", match[1]);
      return match[1];
    }
  }

  // Method 3: Try to find any header and extract title
  const headers = findAllInShadowDOM("header.flex.items-center");
  for (const header of headers) {
    const titleDiv = header.querySelector("div[title]");
    if (titleDiv) {
      const username = titleDiv.getAttribute("title");
      if (username && username.length > 0) {
        console.log(
          "[ChatMarker] Found chat name from header title:",
          username,
        );
        return username;
      }
    }
  }

  // Method 4: Try to extract from message aria-labels
  const messages = findAllInShadowDOM("div.room-message");
  if (messages.length > 0) {
    for (const message of messages) {
      const ariaLabel = message.getAttribute("aria-label");
      if (ariaLabel) {
        // aria-label format: "Careless_Ad_7706 said 18 ho..."
        const usernameMatch = ariaLabel.match(/^([A-Za-z0-9_-]+)\s+said/);
        if (usernameMatch) {
          const name = usernameMatch[1];
          console.log("[ChatMarker] Found chat name from message:", name);
          return name;
        }
      }
    }
  }

  // Try old Reddit username from header
  const selectors = [
    ".correspondent h1",
    ".subject",
    "h1",
    ".fancy-toggle-button .title",
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const name = element.textContent.trim();
      if (name && name.length > 0 && !name.includes("messages")) {
        console.log(
          "[ChatMarker] Found chat name:",
          name,
          "using selector:",
          selector,
        );
        return name;
      }
    }
  }

  // Fallback: extract from URL
  const url = window.location.href;
  const userMatch = url.match(/\/user\/([^/]+)/);
  if (userMatch) return `u/${userMatch[1]}`;

  const subredditMatch = url.match(/\/r\/([^/]+)/);
  if (subredditMatch) return `r/${subredditMatch[1]}`;

  console.warn("[ChatMarker] Could not find chat name, using fallback");
  return "Unknown Chat";
}

/**
 * Handle context menu actions - Chat-only version
 */
function handleContextMenuAction(menuItemId, selectionText) {
  console.log("[ChatMarker] Context menu action:", menuItemId);

  // All actions are chat-level only
  switch (menuItemId) {
    case "chatmarker-mark-chat":
      markCurrentChat();
      break;

    case "chatmarker-label-urgent":
    case "chatmarker-label-important":
    case "chatmarker-label-completed":
    case "chatmarker-label-followup":
    case "chatmarker-label-question":
      const labelId = menuItemId.replace("chatmarker-label-", "");
      toggleChatLabel(labelId);
      break;

    case "chatmarker-note":
      openChatNoteEditor();
      break;

    case "chatmarker-reminder":
      openChatReminderPicker();
      break;

    default:
      console.warn("[ChatMarker] Unknown context menu action:", menuItemId);
  }
}

/**
 * Handle messages from background script
 */
function handleBackgroundMessage(request, sender, sendResponse) {
  switch (request.action) {
    case "contextMenuAction":
      handleContextMenuAction(request.menuItemId, request.selectionText);
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: "Unknown action" });
  }
}

/**
 * Mark the current chat
 */
async function markCurrentChat() {
  try {
    const chatId = getCurrentChatId();
    const chatName = getChatName();

    if (!chatId || chatId === "unknown") {
      showToast("⚠️ Could not identify current chat");
      return;
    }

    console.log("[ChatMarker] Marking chat:", chatName, chatId);

    // Check if chat is already marked
    safeSendMessage(
      {
        action: "getChatMarker",
        chatId: chatId,
        platform: "reddit",
      },
      async (response) => {
        if (response && response.success && response.data) {
          // Chat already marked - unmark it
          safeSendMessage(
            {
              action: "deleteChatMarker",
              chatMarkerId: response.data.chatMarkerId,
            },
            (deleteResponse) => {
              if (deleteResponse && deleteResponse.success) {
                console.log("[ChatMarker] Chat unmarked:", chatName);
                showToast(`✅ Chat "${chatName}" unmarked`);
                setTimeout(() => {
                  updateChatListIndicators();
                  updateOpenChatIndicator();
                }, 200);
              } else {
                console.error("[ChatMarker] Failed to unmark chat");
                showToast("❌ Failed to unmark chat");
              }
            },
          );
        } else {
          // Chat not marked - mark it
          const chatMarker = {
            platform: "reddit",
            chatId: chatId,
            chatName: chatName,
            labels: [],
            notes: "",
            createdAt: Date.now(),
          };

          safeSendMessage(
            {
              action: "saveChatMarker",
              data: chatMarker,
            },
            (saveResponse) => {
              if (saveResponse && saveResponse.success) {
                console.log("[ChatMarker] Chat marked successfully:", chatName);
                showToast(`✅ Chat "${chatName}" marked`);
                setTimeout(() => {
                  updateChatListIndicators();
                  updateOpenChatIndicator();
                }, 200);
              } else {
                console.error(
                  "[ChatMarker] Failed to mark chat:",
                  saveResponse?.error,
                );
                showToast("❌ Failed to mark chat");
              }
            },
          );
        }
      },
    );
  } catch (error) {
    console.error("[ChatMarker] Error marking chat:", error);
    showToast("❌ Error marking chat");
  }
}

/**
 * Toggle a label on the current chat
 */
async function toggleChatLabel(labelName) {
  try {
    const chatId = getCurrentChatId();
    const chatName = getChatName();

    if (!chatId || chatId === "unknown") {
      showToast("⚠️ Could not identify current chat");
      return;
    }

    // Get current chat marker
    safeSendMessage(
      {
        action: "getChatMarker",
        chatId: chatId,
        platform: "reddit",
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
              action: "saveChatMarker",
              data: { ...chatMarker, labels, updatedAt: Date.now() },
            },
            (saveResponse) => {
              if (!saveResponse || !saveResponse.success) {
                console.error("[ChatMarker] Failed to update labels");
                showToast("❌ Failed to update label");
              } else {
                setTimeout(() => {
                  updateChatListIndicators();
                  updateOpenChatIndicator();
                }, 200);
              }
            },
          );
        } else {
          // Chat not marked yet - mark it first with this label
          const chatMarker = {
            platform: "reddit",
            chatId: chatId,
            chatName: chatName,
            labels: [labelName],
            notes: "",
            createdAt: Date.now(),
          };

          safeSendMessage(
            {
              action: "saveChatMarker",
              data: chatMarker,
            },
            (saveResponse) => {
              if (saveResponse && saveResponse.success) {
                showToast(`✅ Chat marked with "${labelName}" label`);
                setTimeout(() => {
                  updateChatListIndicators();
                  updateOpenChatIndicator();
                }, 200);
              } else {
                showToast("❌ Failed to mark chat");
              }
            },
          );
        }
      },
    );
  } catch (error) {
    console.error("[ChatMarker] Error toggling chat label:", error);
    showToast("❌ Error updating label");
  }
}

/**
 * Open note editor for current chat - Inline modal
 */
function openChatNoteEditor() {
  const chatId = getCurrentChatId();
  const chatName = getChatName();

  if (!chatId || chatId === "unknown") {
    showToast("⚠️ Could not identify current chat");
    return;
  }

  // Get current chat marker
  safeSendMessage(
    {
      action: "getChatMarker",
      chatId: chatId,
      platform: "reddit",
    },
    (response) => {
      if (response && response.success && response.data) {
        // Chat is marked - show inline note modal
        showInlineNoteModal(response.data);
      } else {
        // Chat not marked yet - mark it first, then show note modal
        const chatMarker = {
          platform: "reddit",
          chatId: chatId,
          chatName: chatName,
          labels: [],
          notes: "",
          createdAt: Date.now(),
        };

        safeSendMessage(
          {
            action: "saveChatMarker",
            data: chatMarker,
          },
          (saveResponse) => {
            if (saveResponse && saveResponse.success) {
              showInlineNoteModal(saveResponse.chatMarker);
            } else {
              showToast("❌ Failed to mark chat");
            }
          },
        );
      }
    },
  );
}

/**
 * Open reminder picker for current chat - Inline modal
 */
function openChatReminderPicker() {
  const chatId = getCurrentChatId();
  const chatName = getChatName();

  if (!chatId || chatId === "unknown") {
    showToast("⚠️ Could not identify current chat");
    return;
  }

  // Get current chat marker
  safeSendMessage(
    {
      action: "getChatMarker",
      chatId: chatId,
      platform: "reddit",
    },
    (response) => {
      if (response && response.success && response.data) {
        // Chat is marked - show inline reminder modal
        showInlineReminderModal(response.data);
      } else {
        // Chat not marked yet - mark it first, then show reminder modal
        const chatMarker = {
          platform: "reddit",
          chatId: chatId,
          chatName: chatName,
          labels: [],
          notes: "",
          createdAt: Date.now(),
        };

        safeSendMessage(
          {
            action: "saveChatMarker",
            data: chatMarker,
          },
          (saveResponse) => {
            if (saveResponse && saveResponse.success) {
              showInlineReminderModal(saveResponse.chatMarker);
            } else {
              showToast("❌ Failed to mark chat");
            }
          },
        );
      }
    },
  );
}

/**
 * Show inline note modal on Reddit page
 */
function showInlineNoteModal(chatMarker) {
  // Remove existing modal if any
  const existingModal = document.querySelector(".chatmarker-inline-modal");
  if (existingModal) existingModal.remove();

  // Get theme colors
  const theme = getThemeColors();

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "chatmarker-inline-modal";
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
  const modal = document.createElement("div");
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
      <textarea class="chatmarker-note-textarea" placeholder="Add your note here..." maxlength="500" style="width: 100%; box-sizing: border-box; min-height: 120px; padding: 12px; border: 1px solid ${theme.inputBorder}; border-radius: 6px; font-family: inherit; font-size: 14px; resize: vertical; background: ${theme.inputBg}; color: ${theme.textPrimary}; transition: border-color 0.2s, box-shadow 0.2s;">${chatMarker.notes || ""}</textarea>
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
  const textarea = modal.querySelector(".chatmarker-note-textarea");
  const charCount = modal.querySelector(".chatmarker-char-count");
  const closeBtn = modal.querySelector(".chatmarker-close-btn");
  const cancelBtn = modal.querySelector(".chatmarker-cancel-btn");
  const saveBtn = modal.querySelector(".chatmarker-save-btn");

  // Update char count
  const updateCharCount = () => {
    charCount.textContent = textarea.value.length;
  };
  updateCharCount();
  textarea.addEventListener("input", updateCharCount);

  // Add focus/blur effects for textarea
  textarea.addEventListener("focus", () => {
    textarea.style.borderColor = "#6366F1";
    textarea.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
  });
  textarea.addEventListener("blur", () => {
    textarea.style.borderColor = theme.inputBorder;
    textarea.style.boxShadow = "none";
  });

  // Add hover effects for buttons
  cancelBtn.addEventListener("mouseenter", () => {
    cancelBtn.style.background = theme.inputBorder;
  });
  cancelBtn.addEventListener("mouseleave", () => {
    cancelBtn.style.background = theme.buttonSecondaryBg;
  });

  saveBtn.addEventListener("mouseenter", () => {
    saveBtn.style.background = theme.primaryDark;
    saveBtn.style.transform = "translateY(-1px)";
    saveBtn.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.3)";
  });
  saveBtn.addEventListener("mouseleave", () => {
    saveBtn.style.background = theme.primary;
    saveBtn.style.transform = "translateY(0)";
    saveBtn.style.boxShadow = "none";
  });

  closeBtn.addEventListener("mouseenter", () => {
    closeBtn.style.background = theme.inputBorder;
  });
  closeBtn.addEventListener("mouseleave", () => {
    closeBtn.style.background = "none";
  });

  // Close handlers
  const closeModal = () => overlay.remove();
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // Save handler
  saveBtn.addEventListener("click", () => {
    const noteText = textarea.value.trim();

    safeSendMessage(
      {
        action: "saveChatMarker",
        data: { ...chatMarker, notes: noteText, updatedAt: Date.now() },
      },
      (response) => {
        if (response && response.success) {
          showToast("✅ Note saved");
          closeModal();
          setTimeout(() => {
            updateChatListIndicators();
            updateOpenChatIndicator();
          }, 200);
        } else {
          showToast("❌ Failed to save note");
        }
      },
    );
  });

  // Focus textarea
  textarea.focus();
}

/**
 * Show inline reminder modal on Reddit page
 */
function showInlineReminderModal(chatMarker) {
  // Remove existing modal if any
  const existingModal = document.querySelector(".chatmarker-inline-modal");
  if (existingModal) existingModal.remove();

  // Get theme colors
  const theme = getThemeColors();

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "chatmarker-inline-modal";
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
  const modal = document.createElement("div");
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
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
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
        <button class="chatmarker-quick-reminder" data-minutes="60" style="border: 1px solid ${theme.buttonSecondaryBorder}; background: ${theme.buttonSecondaryBg}; color: ${theme.buttonSecondaryText}; border-radius: 6px; cursor: pointer; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.2s;">⏰ 1 Hour</button>
        <button class="chatmarker-quick-reminder" data-minutes="180" style="border: 1px solid ${theme.buttonSecondaryBorder}; background: ${theme.buttonSecondaryBg}; color: ${theme.buttonSecondaryText}; border-radius: 6px; cursor: pointer; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.2s;">⏰ 3 Hours</button>
        <button class="chatmarker-quick-reminder" data-minutes="1440" style="border: 1px solid ${theme.buttonSecondaryBorder}; background: ${theme.buttonSecondaryBg}; color: ${theme.buttonSecondaryText}; border-radius: 6px; cursor: pointer; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.2s;">⏰ Tomorrow</button>
        <button class="chatmarker-quick-reminder" data-minutes="10080" style="border: 1px solid ${theme.buttonSecondaryBorder}; background: ${theme.buttonSecondaryBg}; color: ${theme.buttonSecondaryText}; border-radius: 6px; cursor: pointer; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.2s;">⏰ Next Week</button>
      </div>
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: ${theme.textPrimary};">Or choose custom date & time:</label>
      <input type="datetime-local" class="chatmarker-custom-datetime" min="${minDateTime}" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid ${theme.inputBorder}; border-radius: 6px; font-family: inherit; font-size: 14px; background: ${theme.inputBg}; color: ${theme.textPrimary}; transition: border-color 0.2s, box-shadow 0.2s;">
    </div>
    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;">
      <button class="chatmarker-cancel-btn" style="border: 1px solid ${theme.buttonSecondaryBorder}; background: ${theme.buttonSecondaryBg}; color: ${theme.buttonSecondaryText}; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 14px; transition: all 0.2s;">Cancel</button>
      <button class="chatmarker-save-reminder-btn" disabled style="border: none; background: ${theme.textSecondary}; color: white; border-radius: 6px; font-weight: 500; cursor: not-allowed; font-size: 14px; transition: all 0.2s;">Set Reminder</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Get elements
  const customDateTime = modal.querySelector(".chatmarker-custom-datetime");
  const quickBtns = modal.querySelectorAll(".chatmarker-quick-reminder");
  const closeBtn = modal.querySelector(".chatmarker-close-btn");
  const cancelBtn = modal.querySelector(".chatmarker-cancel-btn");
  const saveBtn = modal.querySelector(".chatmarker-save-reminder-btn");

  // Function to enable save button
  const enableSaveButton = () => {
    saveBtn.disabled = false;
    saveBtn.style.background = theme.primary;
    saveBtn.style.cursor = "pointer";
  };

  // Add hover effects for quick reminder buttons
  quickBtns.forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      btn.style.background = theme.primary;
      btn.style.borderColor = theme.primary;
      btn.style.color = "white";
      btn.style.transform = "translateY(-2px)";
      btn.style.boxShadow = "0 4px 8px rgba(99, 102, 241, 0.2)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = theme.buttonSecondaryBg;
      btn.style.borderColor = theme.buttonSecondaryBorder;
      btn.style.color = theme.buttonSecondaryText;
      btn.style.transform = "translateY(0)";
      btn.style.boxShadow = "none";
    });
  });

  // Add focus/blur effects for datetime input
  customDateTime.addEventListener("focus", () => {
    customDateTime.style.borderColor = theme.primary;
    customDateTime.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
  });
  customDateTime.addEventListener("blur", () => {
    customDateTime.style.borderColor = theme.inputBorder;
    customDateTime.style.boxShadow = "none";
  });

  // Enable save button when datetime is selected
  customDateTime.addEventListener("change", () => {
    if (customDateTime.value) {
      enableSaveButton();
    }
  });

  // Add hover effects for cancel button
  cancelBtn.addEventListener("mouseenter", () => {
    cancelBtn.style.background = theme.inputBorder;
  });
  cancelBtn.addEventListener("mouseleave", () => {
    cancelBtn.style.background = theme.buttonSecondaryBg;
  });

  // Add hover effects for save button (when enabled)
  saveBtn.addEventListener("mouseenter", () => {
    if (!saveBtn.disabled) {
      saveBtn.style.background = theme.primaryDark;
      saveBtn.style.transform = "translateY(-1px)";
      saveBtn.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.3)";
    }
  });
  saveBtn.addEventListener("mouseleave", () => {
    if (!saveBtn.disabled) {
      saveBtn.style.background = theme.primary;
      saveBtn.style.transform = "translateY(0)";
      saveBtn.style.boxShadow = "none";
    }
  });

  // Add hover effect for close button
  closeBtn.addEventListener("mouseenter", () => {
    closeBtn.style.background = theme.inputBorder;
  });
  closeBtn.addEventListener("mouseleave", () => {
    closeBtn.style.background = "none";
  });

  // Close handlers
  const closeModal = () => overlay.remove();
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // Quick reminder buttons
  quickBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const minutes = parseInt(btn.dataset.minutes);
      const reminderTime = Date.now() + minutes * 60 * 1000;
      saveReminder(reminderTime);
    });
  });

  // Save reminder handler
  saveBtn.addEventListener("click", () => {
    if (saveBtn.disabled) {
      return;
    }
    if (!customDateTime.value) {
      showToast("⚠️ Please select a date and time");
      return;
    }
    const reminderTime = new Date(customDateTime.value).getTime();
    if (reminderTime <= Date.now()) {
      showToast("⚠️ Reminder time must be in the future");
      return;
    }
    saveReminder(reminderTime);
  });

  function saveReminder(reminderTime) {
    const reminderData = {
      messageId: chatMarker.chatMarkerId,
      reminderTime: reminderTime,
      title: `Reminder: ${chatMarker.chatName}`,
      body: chatMarker.notes || "Check this chat",
      chatName: chatMarker.chatName,
      platform: "reddit",
      active: true,
    };

    safeSendMessage(
      {
        action: "createReminder",
        data: reminderData,
      },
      (response) => {
        if (response && response.success) {
          const date = new Date(reminderTime);
          showToast(`✅ Reminder set for ${date.toLocaleString()}`);
          closeModal();
          setTimeout(() => {
            updateChatListIndicators();
            updateOpenChatIndicator();
          }, 200);
        } else {
          showToast("❌ Failed to set reminder");
        }
      },
    );
  }
}

/**
 * Set up observer for chat list to add indicators
 */
function setupChatListObserver() {
  console.log("[ChatMarker] Setting up chat list observer for indicators...");

  // Initial update
  setTimeout(() => {
    updateChatListIndicators();
  }, 1000);

  // Watch for changes in the chat list
  const observer = new MutationObserver(() => {
    clearTimeout(window.redditChatListUpdateTimeout);
    window.redditChatListUpdateTimeout = setTimeout(() => {
      updateChatListIndicators();
    }, 500);
  });

  // Observe the body for chat list changes (since it might be in shadow DOM)
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("[ChatMarker] Chat list observer attached");
}

/**
 * Update indicators on chat list items
 */
async function updateChatListIndicators() {
  console.log("[ChatMarker] Updating chat list indicators...");

  // Get all marked chats
  safeSendMessage(
    {
      action: "getAllChatMarkers",
    },
    (response) => {
      if (!response || !response.success) {
        console.log("[ChatMarker] Failed to get chat markers for indicators");
        return;
      }

      const chatMarkers = response.data || {};
      const redditMarkers = Object.values(chatMarkers).filter(
        (m) => m.platform === "reddit",
      );
      console.log(
        "[ChatMarker] Found",
        redditMarkers.length,
        "Reddit chat markers",
      );

      // Find all chat list items (check both shadow DOM and regular DOM)
      let chatListItems = [];

      // Try regular DOM first
      chatListItems = Array.from(
        document.querySelectorAll('a[aria-label*="Direct chat with"]')
      );
      console.log("[ChatMarker] Regular DOM search found:", chatListItems.length, "items");

      // If not found in regular DOM, try shadow DOM
      if (chatListItems.length === 0) {
        console.log("[ChatMarker] Searching shadow DOM...");
        chatListItems = findAllInShadowDOM('a[aria-label*="Direct chat with"]');
        console.log("[ChatMarker] Shadow DOM search found:", chatListItems.length, "items");
      }

      console.log(
        "[ChatMarker] Total found:",
        chatListItems.length,
        "chat list items",
      );

      chatListItems.forEach((item) => {
        processChatListItem(item, redditMarkers);
      });
    },
  );
}

/**
 * Process a single chat list item to add/remove indicator
 */
function processChatListItem(listItem, chatMarkers) {
  // Extract username from aria-label
  const ariaLabel = listItem.getAttribute("aria-label");
  if (!ariaLabel) {
    console.log("[ChatMarker] No aria-label on list item");
    return;
  }

  const match = ariaLabel.match(/Direct chat with ([A-Za-z0-9_-]+)/);
  if (!match) {
    console.log("[ChatMarker] No username match in aria-label:", ariaLabel);
    return;
  }

  const username = match[1];

  // Check if this chat is marked
  const isMarked = chatMarkers.some((marker) => marker.chatName === username);

  // Remove existing indicator (using data attribute for reliable selection)
  const existingIndicator = listItem.querySelector(
    "[data-chatmarker-indicator]",
  );
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Add indicator if marked
  if (isMarked) {
    const chatMarker = chatMarkers.find((m) => m.chatName === username);
    addChatListIndicator(listItem, chatMarker);
  }
}

/**
 * Add indicator to chat list item
 */
function addChatListIndicator(listItem, chatMarker) {
  // Find the time element (span with class "last-message-time")
  const timeElement = listItem.querySelector(".last-message-time");

  if (!timeElement) {
    console.warn("[ChatMarker] Could not find time element for indicator");
    return;
  }

  // Check if indicator already exists - if so, remove it first to update
  const existingIndicator = timeElement.querySelector(
    "[data-chatmarker-indicator]",
  );
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Label emoji mapping
  const labelEmojis = {
    urgent: "🔴",
    important: "🟡",
    completed: "🟢",
    followup: "🔵",
    question: "🟣",
  };

  // Determine what to display
  let displayContent = "⭐"; // Default star
  let titleText = "Marked chat";

  if (chatMarker.labels && chatMarker.labels.length > 0) {
    // Show label emojis instead of star
    displayContent = chatMarker.labels
      .map((label) => labelEmojis[label] || "🏷️")
      .join("");
    titleText = `Labels: ${chatMarker.labels.join(", ")}`;
  }

  // Add notes to tooltip if present
  if (chatMarker.notes && chatMarker.notes.trim()) {
    titleText += `\n\nNote: ${chatMarker.notes}`;
  }

  // Create indicator as inline element
  const indicator = document.createElement("span");
  indicator.className = "chatmarker-list-indicator";
  indicator.setAttribute("data-chatmarker-indicator", "true");
  indicator.textContent = displayContent;
  indicator.title = titleText;
  indicator.style.cssText = `
    display: inline-block;
    margin-right: 4px;
    font-size: 14px;
    line-height: 1;
    vertical-align: middle;
    cursor: pointer;
  `;

  // Insert indicator before the time text
  timeElement.insertBefore(indicator, timeElement.firstChild);
  console.log(
    "[ChatMarker] Added indicator before time to:",
    chatMarker.chatName,
    displayContent,
  );
}

/**
 * Set up observer for open chat window to add indicators
 */
function setupOpenChatObserver() {
  console.log("[ChatMarker] Setting up open chat window observer...");

  // Initial update
  setTimeout(() => {
    updateOpenChatIndicator();
  }, 1000);

  // Watch for changes in the chat window (including shadow DOM)
  const observer = new MutationObserver(() => {
    clearTimeout(window.redditOpenChatUpdateTimeout);
    window.redditOpenChatUpdateTimeout = setTimeout(() => {
      updateOpenChatIndicator();
    }, 500);
  });

  // Observe the body for chat window changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("[ChatMarker] Open chat window observer attached");
}

/**
 * Update indicator on open chat header
 */
async function updateOpenChatIndicator() {
  console.log("[ChatMarker] Updating open chat indicator...");

  // Find the chat header (check both regular DOM and shadow DOM)
  let chatHeader = null;

  // Try regular DOM first
  chatHeader = document.querySelector("header.flex.items-center.h-\\[2\\.75rem\\]");
  console.log("[ChatMarker] Regular DOM header search:", !!chatHeader);

  // If not found in regular DOM, try shadow DOM
  if (!chatHeader) {
    console.log("[ChatMarker] Searching shadow DOM for header...");
    chatHeader = findInShadowDOM("header.flex.items-center.h-\\[2\\.75rem\\]");
    console.log("[ChatMarker] Shadow DOM header search:", !!chatHeader);
  }

  if (!chatHeader) {
    console.log("[ChatMarker] No open chat window found");
    return;
  }

  // Extract username from the header
  let username = null;

  // Try to find div with title attribute
  const titleDiv = chatHeader.querySelector("div[title]");
  if (titleDiv) {
    username = titleDiv.getAttribute("title");
  }

  if (!username) {
    console.log("[ChatMarker] No username found in chat header");
    return;
  }

  console.log("[ChatMarker] Found open chat with username:", username);

  // Get all marked chats
  safeSendMessage(
    {
      action: "getAllChatMarkers",
    },
    (response) => {
      if (!response || !response.success) {
        console.log("[ChatMarker] Failed to get chat markers for open chat indicator");
        return;
      }

      const chatMarkers = response.data || {};
      const chatMarker = Object.values(chatMarkers).find(
        (m) => m.platform === "reddit" && m.chatName === username
      );

      // Remove existing indicator
      const existingIndicator = chatHeader.querySelector(
        "[data-chatmarker-open-chat-indicator]"
      );
      if (existingIndicator) {
        existingIndicator.remove();
      }

      // Add indicator if this chat is marked
      if (chatMarker) {
        addOpenChatIndicator(chatHeader, chatMarker);
      }
    }
  );
}

/**
 * Add indicator to open chat header
 */
function addOpenChatIndicator(chatHeader, chatMarker) {
  // Find the username text element (the semibold text)
  const usernameElement = chatHeader.querySelector(".text-14.font-sans.font-semibold");

  if (!usernameElement) {
    console.warn("[ChatMarker] Could not find username element in chat header");
    return;
  }

  // Check if indicator already exists
  const existingIndicator = chatHeader.querySelector(
    "[data-chatmarker-open-chat-indicator]"
  );
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Label emoji mapping
  const labelEmojis = {
    urgent: "🔴",
    important: "🟡",
    completed: "🟢",
    followup: "🔵",
    question: "🟣",
  };

  // Determine what to display
  let displayContent = "⭐"; // Default star
  let titleText = "Marked chat";

  if (chatMarker.labels && chatMarker.labels.length > 0) {
    // Show label emojis instead of star
    displayContent = chatMarker.labels
      .map((label) => labelEmojis[label] || "🏷️")
      .join("");
    titleText = `Labels: ${chatMarker.labels.join(", ")}`;
  }

  // Add notes to tooltip if present
  if (chatMarker.notes && chatMarker.notes.trim()) {
    titleText += `\n\nNote: ${chatMarker.notes}`;
  }

  // Create indicator as inline element
  const indicator = document.createElement("span");
  indicator.className = "chatmarker-open-chat-indicator";
  indicator.setAttribute("data-chatmarker-open-chat-indicator", "true");
  indicator.textContent = displayContent;
  indicator.title = titleText;
  indicator.style.cssText = `
    display: inline-block;
    margin-left: 6px;
    font-size: 14px;
    line-height: 1;
    vertical-align: middle;
    cursor: pointer;
  `;

  // Insert indicator after the username text
  usernameElement.appendChild(indicator);
  console.log(
    "[ChatMarker] Added indicator to open chat header:",
    chatMarker.chatName,
    displayContent,
  );
}

/**
 * Show a toast notification
 */
function showToast(message) {
  // Remove existing toast if any
  const existingToast = document.querySelector(".chatmarker-toast");
  if (existingToast) existingToast.remove();

  // Create toast
  const toast = document.createElement("div");
  toast.className = "chatmarker-toast";
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
    toast.style.animation = "slideOut 0.3s ease";
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
    console.warn("[ChatMarker] Extension context invalidated");
    clearInterval(contextCheckInterval);

    // Show notification to user
    const notification = document.createElement("div");
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
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    init();
  });
} else {
  init();
}

console.log("[ChatMarker] Reddit content script loaded (chat-only mode)");
