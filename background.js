/**
 * ChatMarker Background Service Worker
 * Handles reminders, notifications, and message passing
 */

// Import storage functions (using importScripts for service worker)
importScripts('utils/storage.js');

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[ChatMarker] Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // First time install
    await initializeExtension();
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('[ChatMarker] Extension updated to version:', chrome.runtime.getManifest().version);
  }

  // Set up daily cleanup alarm
  chrome.alarms.create('daily_cleanup', {
    when: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
    periodInMinutes: 24 * 60 // Repeat every 24 hours
  });

  // Create context menus
  createContextMenus();

  // Update badge on install
  await updateBadge();
});

/**
 * Handle extension icon click - open side panel
 */
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

/**
 * Initialize extension on first install
 */
async function initializeExtension() {
  console.log('[ChatMarker] Initializing extension...');

  // Set default settings
  const defaultSettings = {
    theme: 'auto',
    markIcon: 'star',
    notificationSound: true,
    defaultView: 'popup',
    fontSize: 'medium',
    compactMode: false,
    autoCategorizationEnabled: false
  };

  await chrome.storage.local.set({ settings: defaultSettings });

  // Set default labels
  const defaultLabels = [
    { id: 'urgent', name: 'Urgent', color: '#EF4444' },
    { id: 'important', name: 'Important', color: '#F59E0B' },
    { id: 'completed', name: 'Completed', color: '#10B981' },
    { id: 'followup', name: 'Follow-up', color: '#3B82F6' },
    { id: 'question', name: 'Question', color: '#8B5CF6' }
  ];

  await chrome.storage.local.set({ labels: defaultLabels });

  console.log('[ChatMarker] Extension initialized successfully');
}

/**
 * Handle alarm events (reminders and cleanup)
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('[ChatMarker] ⏰ ALARM TRIGGERED:', alarm.name, 'at', new Date());

  if (alarm.name.startsWith('reminder_')) {
    console.log('[ChatMarker] Handling reminder alarm...');
    await handleReminder(alarm.name);
  } else if (alarm.name === 'daily_cleanup') {
    await performDailyCleanup();
  }
});

/**
 * Handle reminder notification
 */
async function handleReminder(reminderId) {
  try {
    console.log('[ChatMarker] Fetching reminder:', reminderId);
    const reminder = await getReminder(reminderId);

    if (!reminder || !reminder.active) {
      console.log('[ChatMarker] Reminder not found or inactive:', reminderId);
      return;
    }

    console.log('[ChatMarker] Reminder found:', reminder);

    // Get associated marker
    const marker = await getMarker(reminder.messageId);

    if (!marker) {
      console.log('[ChatMarker] Marker not found for reminder:', reminderId);
      console.log('[ChatMarker] Will show notification anyway with reminder data');
    }

    console.log('[ChatMarker] Creating notification...');

    // Create notification using Service Worker Notifications API
    const notificationTitle = 'ChatMarker Reminder ⏰';
    const notificationBody = reminder.notificationText || (marker && marker.messageText) || 'You have a reminder';
    const contextInfo = marker ? `${marker.sender} (${capitalizeFirst(marker.platform)})` : `${reminder.sender} (${capitalizeFirst(reminder.platform)})`;

    const notificationOptions = {
      body: `${notificationBody}\n\n${contextInfo}`,
      icon: chrome.runtime.getURL('icons/icon48.png'),
      badge: chrome.runtime.getURL('icons/icon48.png'),
      tag: reminderId,
      requireInteraction: true,
      data: {
        reminderId: reminderId,
        messageId: reminder.messageId
      },
      actions: [
        { action: 'view', title: 'View Message' },
        { action: 'snooze', title: 'Snooze 1h' }
      ]
    };

    // Use Service Worker registration to show notification
    self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => {
        console.log('[ChatMarker] ✅ Notification created successfully');
      })
      .catch((error) => {
        console.error('[ChatMarker] ❌ Notification failed:', error);
      });

    // Update badge to show pending reminders
    await updateBadge();

    // Mark reminder as fired (but keep it for now)
    reminder.firedAt = Date.now();
    await saveReminder(reminder);

  } catch (error) {
    console.error('[ChatMarker] ❌ Error handling reminder:', error);
  }
}

/**
 * Handle notification action button clicks (Service Worker API)
 */
self.addEventListener('notificationclick', async (event) => {
  console.log('[ChatMarker] Notification clicked:', event.action, event.notification.tag);

  event.notification.close();

  const reminderId = event.notification.tag;
  if (!reminderId || !reminderId.startsWith('reminder_')) return;

  const reminder = await getReminder(reminderId);
  if (!reminder) {
    console.log('[ChatMarker] Reminder not found:', reminderId);
    return;
  }

  if (event.action === 'view') {
    // View Message action
    console.log('[ChatMarker] View message action clicked');
    await navigateToMessage(reminder.messageId);
  } else if (event.action === 'snooze') {
    // Snooze 1 hour action
    console.log('[ChatMarker] Snooze action clicked');
    await snoozeReminder(reminderId, 60); // 60 minutes
  } else {
    // Body click (no specific action)
    console.log('[ChatMarker] Notification body clicked');
    await navigateToMessage(reminder.messageId);
  }
});

/**
 * Navigate to a message in its platform
 */
async function navigateToMessage(messageId) {
  try {
    const marker = await getMarker(messageId);
    if (!marker) return;

    // Determine the URL based on platform
    let url = '';
    switch (marker.platform) {
      case 'whatsapp':
        url = 'https://web.whatsapp.com/';
        break;
      case 'messenger':
        url = 'https://www.messenger.com/';
        break;
      case 'instagram':
        url = 'https://www.instagram.com/direct/inbox/';
        break;
      case 'linkedin':
        url = 'https://www.linkedin.com/messaging/';
        break;
      case 'reddit':
        url = 'https://www.reddit.com/chat';
        break;
    }

    if (!url) return;

    // Find or create a tab for the platform
    const tabs = await chrome.tabs.query({ url: url + '*' });

    if (tabs.length > 0) {
      // Platform tab exists, switch to it
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });

      // Send message to content script to scroll to message
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'scrollToMessage',
        messageId: messageId
      });
    } else {
      // Create new tab
      await chrome.tabs.create({ url: url });
    }
  } catch (error) {
    console.error('[ChatMarker] Error navigating to message:', error);
  }
}

/**
 * Snooze a reminder
 */
async function snoozeReminder(reminderId, minutes) {
  try {
    const reminder = await getReminder(reminderId);
    if (!reminder) return;

    // Create new alarm for snoozed time
    const newTime = Date.now() + (minutes * 60 * 1000);
    reminder.reminderTime = newTime;
    reminder.active = true;
    delete reminder.firedAt;

    await saveReminder(reminder);

    // Create new alarm
    chrome.alarms.create(reminderId, { when: newTime });

    console.log(`[ChatMarker] Reminder snoozed for ${minutes} minutes`);
  } catch (error) {
    console.error('[ChatMarker] Error snoozing reminder:', error);
  }
}

/**
 * Perform daily cleanup
 */
async function performDailyCleanup() {
  try {
    console.log('[ChatMarker] Performing daily cleanup...');

    const markers = await getAllMarkers();
    const reminders = await getAllReminders();

    // Clean up old reminders (older than 30 days and already fired)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let cleanedReminders = 0;

    for (const [reminderId, reminder] of Object.entries(reminders)) {
      if (reminder.firedAt && reminder.firedAt < thirtyDaysAgo) {
        await deleteReminder(reminderId);
        chrome.alarms.clear(reminderId);
        cleanedReminders++;
      }
    }

    console.log(`[ChatMarker] Cleanup complete. Removed ${cleanedReminders} old reminders.`);

  } catch (error) {
    console.error('[ChatMarker] Error during cleanup:', error);
  }
}

/**
 * Update extension badge with chat marker count
 */
async function updateBadge() {
  try {
    const chatMarkers = await getAllChatMarkers();
    const chatMarkerCount = Object.keys(chatMarkers).length;

    const activeReminders = await getActiveReminders();
    const reminderCount = activeReminders.length;

    // Show chat marker count primarily, with reminder indicator
    if (chatMarkerCount > 0) {
      chrome.action.setBadgeText({ text: chatMarkerCount.toString() });

      // If there are pending reminders, use orange, otherwise use blue
      if (reminderCount > 0) {
        chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' }); // Orange (has reminders)
      } else {
        chrome.action.setBadgeBackgroundColor({ color: '#6366F1' }); // Primary blue
      }
    } else {
      chrome.action.setBadgeText({ text: '' });
    }

    console.log(`[ChatMarker] Badge updated: ${chatMarkerCount} chat marks, ${reminderCount} reminders`);
  } catch (error) {
    console.error('[ChatMarker] Error updating badge:', error);
  }
}

/**
 * Listen for messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[ChatMarker] Message received:', request.action);

  // Handle async operations
  (async () => {
    try {
      switch (request.action) {
        case 'saveMarker':
          const marker = await saveMarker(request.data);
          await updateBadge(); // Update badge when marker is saved
          sendResponse({ success: true, marker });
          break;

        case 'deleteMarker':
          await deleteMarker(request.messageId);
          await updateBadge(); // Update badge when marker is deleted
          sendResponse({ success: true });
          break;

        case 'getMarker':
          const fetchedMarker = await getMarker(request.data.messageId);
          sendResponse({ success: true, data: fetchedMarker });
          break;

        case 'getAllMarkers':
          const allMarkers = await getAllMarkers();
          sendResponse({ success: true, data: allMarkers });
          break;

        case 'createReminder':
          console.log('[ChatMarker] Creating reminder with data:', request.data);
          const reminder = await saveReminder(request.data);
          console.log('[ChatMarker] Reminder saved:', reminder.reminderId);

          // Create Chrome alarm
          chrome.alarms.create(reminder.reminderId, {
            when: reminder.reminderTime
          });
          console.log('[ChatMarker] Chrome alarm created for:', new Date(reminder.reminderTime));

          await updateBadge();
          sendResponse({ success: true, reminder });
          break;

        case 'deleteReminder':
          await deleteReminder(request.reminderId);
          chrome.alarms.clear(request.reminderId);
          await updateBadge();
          sendResponse({ success: true });
          break;

        case 'updateSettings':
          const settings = await updateSettings(request.data);
          sendResponse({ success: true, settings });
          break;

        case 'navigateToMessage':
          await navigateToMessage(request.messageId);
          sendResponse({ success: true });
          break;

        case 'saveChatMarker':
          const chatMarker = await saveChatMarker(request.data);
          await updateBadge();
          sendResponse({ success: true, chatMarker });
          break;

        case 'deleteChatMarker':
          await deleteChatMarker(request.chatMarkerId);
          await updateBadge();
          sendResponse({ success: true });
          break;

        case 'getChatMarker':
          const fetchedChatMarker = await getChatMarkerByChatId(request.chatId, request.platform);
          sendResponse({ success: true, data: fetchedChatMarker });
          break;

        case 'getAllChatMarkers':
          const allChatMarkers = await getAllChatMarkers();
          sendResponse({ success: true, data: allChatMarkers });
          break;

        case 'openSidebarWithNote':
          // Store the pending action and chat marker data
          await chrome.storage.local.set({
            pendingAction: 'openNote',
            pendingChatMarker: request.chatMarker
          });
          // Open the sidebar
          await chrome.sidePanel.open({ tabId: sender.tab.id });
          sendResponse({ success: true });
          break;

        case 'openSidebarWithReminder':
          // Store the pending action and chat marker data
          await chrome.storage.local.set({
            pendingAction: 'openReminder',
            pendingChatMarker: request.chatMarker
          });
          // Open the sidebar
          await chrome.sidePanel.open({ tabId: sender.tab.id });
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[ChatMarker] Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  // Return true to indicate async response
  return true;
});

/**
 * Utility: Capitalize first letter
 */
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Create context menus - Chat-only version
 */
function createContextMenus() {
  // Remove all existing menus first
  chrome.contextMenus.removeAll(() => {
    // Main ChatMarker menu
    chrome.contextMenus.create({
      id: 'chatmarker-main',
      title: 'ChatMarker',
      contexts: ['page'],
      documentUrlPatterns: [
        'https://web.whatsapp.com/*',
        'https://www.messenger.com/*',
        'https://www.facebook.com/*',
        'https://www.instagram.com/*',
        'https://www.linkedin.com/*',
        'https://www.reddit.com/*',
        'https://old.reddit.com/*'
      ]
    });

    // Mark/Unmark chat
    chrome.contextMenus.create({
      id: 'chatmarker-mark-chat',
      parentId: 'chatmarker-main',
      title: '⭐ Mark/Unmark Chat',
      contexts: ['page']
    });

    // Separator
    chrome.contextMenus.create({
      id: 'chatmarker-separator-1',
      parentId: 'chatmarker-main',
      type: 'separator',
      contexts: ['page']
    });

    // Add labels submenu
    chrome.contextMenus.create({
      id: 'chatmarker-labels',
      parentId: 'chatmarker-main',
      title: '🏷️ Add Label',
      contexts: ['page']
    });

    // Label options
    const labels = [
      { id: 'urgent', name: 'Urgent', emoji: '🔴' },
      { id: 'important', name: 'Important', emoji: '🟡' },
      { id: 'completed', name: 'Completed', emoji: '🟢' },
      { id: 'followup', name: 'Follow-up', emoji: '🔵' },
      { id: 'question', name: 'Question', emoji: '🟣' }
    ];

    labels.forEach(label => {
      chrome.contextMenus.create({
        id: `chatmarker-label-${label.id}`,
        parentId: 'chatmarker-labels',
        title: `${label.emoji} ${label.name}`,
        contexts: ['page']
      });
    });

    // Separator
    chrome.contextMenus.create({
      id: 'chatmarker-separator-2',
      parentId: 'chatmarker-main',
      type: 'separator',
      contexts: ['page']
    });

    // Add note
    chrome.contextMenus.create({
      id: 'chatmarker-note',
      parentId: 'chatmarker-main',
      title: '📝 Add/Edit Note',
      contexts: ['page']
    });

    // Set reminder
    chrome.contextMenus.create({
      id: 'chatmarker-reminder',
      parentId: 'chatmarker-main',
      title: '⏰ Set/Edit Reminder',
      contexts: ['page']
    });

    console.log('[ChatMarker] Chat-only context menus created');
  });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('[ChatMarker] Context menu clicked:', info.menuItemId);

  // Send message to content script to handle the action
  try {
    chrome.tabs.sendMessage(tab.id, {
      action: 'contextMenuAction',
      menuItemId: info.menuItemId,
      selectionText: info.selectionText
    });
  } catch (error) {
    console.error('[ChatMarker] Error sending context menu action:', error);
  }
});

// Initialize badge on startup
updateBadge();

// Create context menus on startup
createContextMenus();

console.log('[ChatMarker] Background service worker loaded');
