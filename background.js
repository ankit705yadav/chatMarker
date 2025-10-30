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
  console.log('[ChatMarker] Alarm triggered:', alarm.name);

  if (alarm.name.startsWith('reminder_')) {
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
    const reminder = await getReminder(reminderId);

    if (!reminder || !reminder.active) {
      console.log('[ChatMarker] Reminder not found or inactive:', reminderId);
      return;
    }

    // Get associated marker
    const marker = await getMarker(reminder.messageId);

    if (!marker) {
      console.log('[ChatMarker] Marker not found for reminder:', reminderId);
      return;
    }

    // Create notification
    const notificationOptions = {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'ChatMarker Reminder',
      message: reminder.notificationText || marker.messageText || 'You have a reminder',
      contextMessage: `${marker.sender} (${capitalizeFirst(marker.platform)})`,
      priority: 2,
      requireInteraction: true,
      buttons: [
        { title: 'View Message' },
        { title: 'Snooze 1h' }
      ]
    };

    chrome.notifications.create(reminderId, notificationOptions);

    // Update badge to show pending reminders
    await updateBadge();

    // Mark reminder as fired (but keep it for now)
    reminder.firedAt = Date.now();
    await saveReminder(reminder);

  } catch (error) {
    console.error('[ChatMarker] Error handling reminder:', error);
  }
}

/**
 * Handle notification button clicks
 */
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (!notificationId.startsWith('reminder_')) return;

  const reminder = await getReminder(notificationId);
  if (!reminder) return;

  if (buttonIndex === 0) {
    // View Message button
    await navigateToMessage(reminder.messageId);
  } else if (buttonIndex === 1) {
    // Snooze 1 hour button
    await snoozeReminder(notificationId, 60); // 60 minutes
  }

  // Clear the notification
  chrome.notifications.clear(notificationId);
});

/**
 * Handle notification click (body click)
 */
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId.startsWith('reminder_')) {
    const reminder = await getReminder(notificationId);
    if (reminder) {
      await navigateToMessage(reminder.messageId);
    }
    chrome.notifications.clear(notificationId);
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
 * Update extension badge with reminder count
 */
async function updateBadge() {
  try {
    const activeReminders = await getActiveReminders();
    const count = activeReminders.length;

    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#EF4444' }); // Red
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
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
          sendResponse({ success: true, marker });
          break;

        case 'deleteMarker':
          await deleteMarker(request.messageId);
          sendResponse({ success: true });
          break;

        case 'getMarker':
          const fetchedMarker = await getMarker(request.messageId);
          sendResponse({ success: true, marker: fetchedMarker });
          break;

        case 'getAllMarkers':
          const markers = await getMarkersArray();
          sendResponse({ success: true, markers });
          break;

        case 'createReminder':
          const reminder = await saveReminder(request.data);

          // Create Chrome alarm
          chrome.alarms.create(reminder.reminderId, {
            when: reminder.reminderTime
          });

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

// Initialize badge on startup
updateBadge();

console.log('[ChatMarker] Background service worker loaded');
