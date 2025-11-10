/**
 * ChatMarker - Instagram Content Script
 * Chat-only marking (no individual message marking)
 */

// State management
let isInitialized = false;
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
    "[ChatMarker] Initializing Instagram integration (chat-only mode)...",
  );

  try {
    // Wait for Instagram to load
    await waitForElement("body", 5000);
    console.log("[ChatMarker] Instagram loaded");

    // Listen for messages from background
    chrome.runtime.onMessage.addListener(handleBackgroundMessage);

    // Set up right-click capture for chat list marking
    setupContextMenuCapture();

    // Set up chat list observer for indicators
    setTimeout(() => {
      setupChatListObserver();
    }, 2000);

    isInitialized = true;
    console.log("[ChatMarker] Instagram integration ready (chat-only mode)");
    console.log(
      '[ChatMarker] Right-click any chat in the list and select "ChatMarker" to mark',
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
 * Capture right-click events to know which chat list item was clicked
 */
function setupContextMenuCapture() {
  document.addEventListener(
    "contextmenu",
    (e) => {
      lastRightClickedElement = e.target;
      console.log("[ChatMarker] Right-clicked element:", e.target);
    },
    true,
  );
}

/**
 * Extract chat name from right-clicked chat list item
 */
function getChatNameFromRightClick() {
  if (!lastRightClickedElement) {
    console.log("[ChatMarker] No lastRightClickedElement");
    return null;
  }

  console.log(
    "[ChatMarker] Extracting from right-clicked element:",
    lastRightClickedElement,
  );

  // Traverse up to find the chat list item
  let element = lastRightClickedElement;
  let depth = 0;
  const maxDepth = 20;

  while (element && depth < maxDepth) {
    // Look for span with title attribute (contains chat name)
    if (element.querySelectorAll) {
      const titleSpan = element.querySelector("span[title]");
      if (titleSpan) {
        const chatName = titleSpan.getAttribute("title");
        if (chatName && chatName.length > 0) {
          console.log(
            "[ChatMarker] ✅ Extracted chat name from title span:",
            chatName,
          );
          return chatName;
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
 * Extract chat ID - uses chat name as ID for Instagram
 */
function getCurrentChatId() {
  const chatName = getChatName();
  if (chatName && chatName !== "Unknown Chat") {
    const chatId = `instagram_${chatName.replace(/\s+/g, "_")}`;
    console.log("[ChatMarker] Generated chat ID:", chatId);
    return chatId;
  }
  return "unknown";
}

/**
 * Extract chat name
 */
function getChatName() {
  console.log("[ChatMarker] Attempting to get chat name...");

  // Try to get from right-clicked chat list item
  const nameFromRightClick = getChatNameFromRightClick();
  if (nameFromRightClick) {
    return nameFromRightClick;
  }

  console.warn("[ChatMarker] Could not find chat name");
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

    if (!chatId || chatId === "unknown" || chatName === "Unknown Chat") {
      showToast(
        "⚠️ Could not identify chat. Please right-click on a chat in the list.",
      );
      return;
    }

    console.log("[ChatMarker] Marking chat:", chatName, chatId);

    // Check if chat is already marked
    safeSendMessage(
      {
        action: "getChatMarker",
        chatId: chatId,
        platform: "instagram",
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
                setTimeout(() => updateChatListIndicators(), 200);
              } else {
                console.error("[ChatMarker] Failed to unmark chat");
                showToast("❌ Failed to unmark chat");
              }
            },
          );
        } else {
          // Chat not marked - mark it
          const chatMarker = {
            platform: "instagram",
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
                setTimeout(() => updateChatListIndicators(), 200);
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

    if (!chatId || chatId === "unknown" || chatName === "Unknown Chat") {
      showToast(
        "⚠️ Could not identify chat. Please right-click on a chat in the list.",
      );
      return;
    }

    // Get current chat marker
    safeSendMessage(
      {
        action: "getChatMarker",
        chatId: chatId,
        platform: "instagram",
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
                setTimeout(() => updateChatListIndicators(), 200);
              }
            },
          );
        } else {
          // Chat not marked yet - mark it first with this label
          const chatMarker = {
            platform: "instagram",
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
                setTimeout(() => updateChatListIndicators(), 200);
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

  if (!chatId || chatId === "unknown" || chatName === "Unknown Chat") {
    showToast(
      "⚠️ Could not identify chat. Please right-click on a chat in the list.",
    );
    return;
  }

  // Get current chat marker
  safeSendMessage(
    {
      action: "getChatMarker",
      chatId: chatId,
      platform: "instagram",
    },
    (response) => {
      if (response && response.success && response.data) {
        // Chat is marked - show inline note modal
        showInlineNoteModal(response.data);
      } else {
        // Chat not marked yet - mark it first, then show note modal
        const chatMarker = {
          platform: "instagram",
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

  if (!chatId || chatId === "unknown" || chatName === "Unknown Chat") {
    showToast(
      "⚠️ Could not identify chat. Please right-click on a chat in the list.",
    );
    return;
  }

  // Get current chat marker
  safeSendMessage(
    {
      action: "getChatMarker",
      chatId: chatId,
      platform: "instagram",
    },
    (response) => {
      if (response && response.success && response.data) {
        // Chat is marked - show inline reminder modal
        showInlineReminderModal(response.data);
      } else {
        // Chat not marked yet - mark it first, then show reminder modal
        const chatMarker = {
          platform: "instagram",
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
 * Show inline note modal on Instagram page
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
          setTimeout(() => updateChatListIndicators(), 200);
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
 * Show inline reminder modal on Instagram page
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
      platform: "instagram",
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
          setTimeout(() => updateChatListIndicators(), 200);
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
    clearTimeout(window.instagramChatListUpdateTimeout);
    window.instagramChatListUpdateTimeout = setTimeout(() => {
      updateChatListIndicators();
    }, 500);
  });

  // Observe the body for chat list changes
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
      const instagramMarkers = Object.values(chatMarkers).filter(
        (m) => m.platform === "instagram",
      );
      console.log(
        "[ChatMarker] Found",
        instagramMarkers.length,
        "Instagram chat markers",
      );

      const chatItems = findChatListItems();

      chatItems.forEach(({ element, name }) => {
        const matchedMarker = instagramMarkers.find((m) => m.chatName === name);
        const isMarked = !!matchedMarker;

        // Check if indicator already exists
        const existingIndicator = element.querySelector(
          ".chatmarker-instagram-indicator",
        );

        if (isMarked && !existingIndicator) {
          console.log(`[ChatMarker] Adding indicator to "${name}"`);
          addChatListIndicator(element, matchedMarker);
        } else if (isMarked && existingIndicator) {
          // Update existing indicator in case labels changed
          console.log(`[ChatMarker] Updating indicator for "${name}"`);
          existingIndicator.remove();
          addChatListIndicator(element, matchedMarker);
        } else if (!isMarked && existingIndicator) {
          console.log(`[ChatMarker] Removing indicator from "${name}"`);
          existingIndicator.remove();
        }
      });
    },
  );
}

/**
 * Find all chat list items in Instagram
 */
function findChatListItems() {
  const chatItems = [];

  // Instagram chat list items contain span[title] with chat name
  // Find all elements with span[title] and traverse up to find the container
  const titleSpans = document.querySelectorAll("span[title]");

  titleSpans.forEach((titleSpan) => {
    const chatName = titleSpan.getAttribute("title");
    if (!chatName || chatName.length === 0) return;

    // Traverse up to find the outer container (has many classes including html-div)
    let container = titleSpan;
    let depth = 0;
    const maxDepth = 15;

    while (container && depth < maxDepth) {
      // Look for the outer chat container
      // It typically has classes like: html-div xdj266r x14z9mp xat24cr x1lziwak x1qjc9v5
      if (
        container.classList &&
        container.classList.contains("html-div") &&
        container.classList.contains("xdj266r") &&
        container.classList.contains("x1qjc9v5")
      ) {
        // Check if we already added this container
        const alreadyAdded = chatItems.some(
          (item) => item.element === container,
        );
        if (!alreadyAdded) {
          chatItems.push({
            element: container,
            name: chatName,
          });
        }
        break;
      }

      container = container.parentElement;
      depth++;
    }
  });

  console.log("[ChatMarker] Total chat items found:", chatItems.length);
  return chatItems;
}

/**
 * Add indicator to chat list item - absolute positioned on right edge
 */
function addChatListIndicator(chatElement, chatMarker) {
  // Make chat element positioned for absolute positioning
  chatElement.style.position = "relative";

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
    titleText = `Marked with: ${chatMarker.labels.join(", ")}`;
  }

  // Create indicator absolutely positioned at top-right edge
  const indicator = document.createElement("div");
  indicator.className = "chatmarker-instagram-indicator";
  indicator.textContent = displayContent;
  indicator.title = titleText;
  indicator.style.cssText = `
    position: absolute;
    top: -2px;
    right: 4px;
    font-size: 14px;
    line-height: 1;
    z-index: 10;
    pointer-events: none;
  `;

  // Append to chat element
  chatElement.appendChild(indicator);
  console.log(
    "[ChatMarker] Added indicator to:",
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

console.log("[ChatMarker] Instagram content script loaded");
