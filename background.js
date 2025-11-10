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
    defaultView: 'popup',
    fontSize: 'medium',
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
  console.log('[ChatMarker] Alarm details:', alarm);

  if (alarm.name.startsWith('reminder_')) {
    console.log('[ChatMarker] This is a reminder alarm, handling...');
    await handleReminder(alarm.name);
  } else if (alarm.name === 'daily_cleanup') {
    console.log('[ChatMarker] This is a cleanup alarm, handling...');
    await performDailyCleanup();
  } else {
    console.log('[ChatMarker] Unknown alarm type:', alarm.name);
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

    // Create notification using Chrome Notifications API
    const notificationTitle = '🔔 ChatMarker Reminder';
    const chatName = reminder.chatName || 'Unknown Chat';

    // Get note from marker if available
    let noteText = '';
    if (marker && marker.notes) {
      noteText = marker.notes.length > 100 ? marker.notes.substring(0, 100) + '...' : marker.notes;
    }

    const notificationOptions = {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: notificationTitle,
      message: chatName + (noteText ? `\n${noteText}` : ''),
      priority: 2,
      requireInteraction: true,
      silent: false,  // Explicitly enable sound
      buttons: [
        { title: 'View Chat' }
      ]
    };

    // Use Chrome Notifications API
    chrome.notifications.create(reminderId, notificationOptions, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('[ChatMarker] ❌ Notification failed:', chrome.runtime.lastError);
      } else {
        console.log('[ChatMarker] ✅ Notification created successfully:', notificationId);
      }
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
 * Handle notification button clicks (Chrome Notifications API)
 */
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  console.log('[ChatMarker] Notification button clicked:', notificationId, 'button:', buttonIndex);

  if (!notificationId || !notificationId.startsWith('reminder_')) return;

  const reminder = await getReminder(notificationId);
  if (!reminder) {
    console.log('[ChatMarker] Reminder not found:', notificationId);
    return;
  }

  if (buttonIndex === 0) {
    // Button 0: "View Chat" - open platform main page
    console.log('[ChatMarker] View chat button clicked');
    await navigateToChatByReminder(reminder);
    chrome.notifications.clear(notificationId);
  }
});

/**
 * Handle notification body click (Chrome Notifications API)
 */
chrome.notifications.onClicked.addListener(async (notificationId) => {
  console.log('[ChatMarker] Notification body clicked:', notificationId);

  if (!notificationId || !notificationId.startsWith('reminder_')) return;

  const reminder = await getReminder(notificationId);
  if (!reminder) {
    console.log('[ChatMarker] Reminder not found:', notificationId);
    return;
  }

  // Navigate to the platform main page
  await navigateToChatByReminder(reminder);
  chrome.notifications.clear(notificationId);
});

/**
 * Navigate to chat by reminder data
 */
async function navigateToChatByReminder(reminder) {
  try {
    // Determine the URL based on platform
    let url = '';
    switch (reminder.platform) {
      case 'whatsapp':
        url = 'https://web.whatsapp.com/';
        break;
      case 'messenger':
      case 'facebook':
        url = 'https://www.facebook.com/';
        break;
      case 'instagram':
        url = 'https://www.instagram.com/';
        break;
      case 'linkedin':
        url = 'https://www.linkedin.com/';
        break;
      case 'reddit':
        url = 'https://www.reddit.com/';
        break;
    }

    if (!url) return;

    // Find or create a tab for the platform
    const tabs = await chrome.tabs.query({ url: url + '*' });

    if (tabs.length > 0) {
      // Platform tab exists, switch to it
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // Create new tab
      await chrome.tabs.create({ url: url });
    }
  } catch (error) {
    console.error('[ChatMarker] Error navigating to chat:', error);
  }
}

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
          const alarmTime = reminder.reminderTime;
          const now = Date.now();
          const timeUntilAlarm = alarmTime - now;

          console.log('[ChatMarker] Creating alarm:', reminder.reminderId);
          console.log('[ChatMarker] Current time:', now, new Date());
          console.log('[ChatMarker] Alarm time:', alarmTime, new Date(alarmTime));
          console.log('[ChatMarker] Time until alarm (ms):', timeUntilAlarm);
          console.log('[ChatMarker] Time until alarm (minutes):', Math.floor(timeUntilAlarm / 60000));

          // Chrome alarms have a minimum delay of 1 minute
          if (timeUntilAlarm < 60000) {
            console.warn('[ChatMarker] ⚠️ WARNING: Alarm is less than 1 minute away!');
            console.warn('[ChatMarker] ⚠️ Chrome alarms require minimum 1 minute delay');
            console.warn('[ChatMarker] ⚠️ This alarm may not fire!');
          }

          chrome.alarms.create(reminder.reminderId, {
            when: alarmTime
          }, () => {
            if (chrome.runtime.lastError) {
              console.error('[ChatMarker] Failed to create alarm:', chrome.runtime.lastError);
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
              console.log('[ChatMarker] ✅ Chrome alarm created successfully');
              // Verify alarm was created
              chrome.alarms.get(reminder.reminderId, (alarm) => {
                if (alarm) {
                  console.log('[ChatMarker] ✅ Verified alarm exists:', alarm);
                  console.log('[ChatMarker] Alarm scheduled for:', new Date(alarm.scheduledTime).toLocaleString());
                } else {
                  console.error('[ChatMarker] ❌ ERROR: Alarm was not found after creation!');
                  console.error('[ChatMarker] This may happen if alarm was < 1 minute in the future');
                }
              });

              sendResponse({ success: true, reminder });
            }
          });

          await updateBadge();
          return true; // Will respond asynchronously

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

        case 'testNotification':
          // Test notification immediately
          console.log('[ChatMarker] Testing notification...');
          chrome.notifications.create('test_notification', {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: '🔔 ChatMarker Test',
            message: 'Test Chat\nThis is a test notification',
            priority: 2,
            requireInteraction: true,
            silent: false  // Explicitly enable sound
          }, (notificationId) => {
            if (chrome.runtime.lastError) {
              console.error('[ChatMarker] Test notification failed:', chrome.runtime.lastError);
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
              console.log('[ChatMarker] ✅ Test notification created:', notificationId);
              sendResponse({ success: true });
            }
          });
          return true; // Will respond asynchronously

        case 'checkAlarms':
          // Check all active alarms
          chrome.alarms.getAll((alarms) => {
            console.log('[ChatMarker] Active alarms:', alarms);
            sendResponse({ success: true, alarms });
          });
          return true; // Will respond asynchronously

        case 'testReminderIn1Min':
          // Create a test reminder that fires in 1 minute (Chrome alarms minimum)
          console.log('[ChatMarker] Creating test reminder for 1 minute from now...');
          const testReminderId = `reminder_test_${Date.now()}`;
          const testReminderTime = Date.now() + 60000; // 1 minute from now

          const testReminder = {
            reminderId: testReminderId,
            platform: 'test',
            chatId: 'test_chat',
            chatName: 'Test Chat',
            reminderTime: testReminderTime,
            active: true,
            createdAt: Date.now()
          };

          // Save reminder
          await saveReminder(testReminder);
          console.log('[ChatMarker] Test reminder saved to storage');

          // Create alarm
          chrome.alarms.create(testReminderId, {
            when: testReminderTime
          }, () => {
            if (chrome.runtime.lastError) {
              console.error('[ChatMarker] Failed to create test alarm:', chrome.runtime.lastError);
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
              console.log('[ChatMarker] ✅ Test alarm created! Will fire in 1 minute');
              console.log('[ChatMarker] Current time:', new Date().toLocaleTimeString());
              console.log('[ChatMarker] Alarm will fire at:', new Date(testReminderTime).toLocaleTimeString());
              console.log('[ChatMarker] Watch for "⏰ ALARM TRIGGERED" message in console...');

              // Verify alarm was created
              chrome.alarms.get(testReminderId, (alarm) => {
                if (alarm) {
                  console.log('[ChatMarker] ✅ Verified: Alarm exists in Chrome:', alarm);
                } else {
                  console.error('[ChatMarker] ❌ ERROR: Alarm not found after creation!');
                }
              });

              sendResponse({ success: true, message: 'Test reminder set for 1 minute. Check console logs.' });
            }
          });
          return true; // Will respond asynchronously

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
    // Main ChatMarker menu (for WhatsApp and Messenger only)
    // Facebook, Reddit, Instagram, and LinkedIn have their own menus with contexts: ['all'] below
    chrome.contextMenus.create({
      id: 'chatmarker-main',
      title: 'ChatMarker',
      contexts: ['page'],
      documentUrlPatterns: [
        'https://web.whatsapp.com/*',
        'https://www.messenger.com/*'
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

    // ========== Facebook-specific context menus with 'all' contexts ==========
    // Facebook needs 'all' contexts to work on chat list items

    // Main ChatMarker menu for Facebook
    chrome.contextMenus.create({
      id: 'chatmarker-main-facebook',
      title: 'ChatMarker',
      contexts: ['all'],
      documentUrlPatterns: [
        'https://www.facebook.com/*'
      ]
    });

    // Mark/Unmark chat (Facebook)
    chrome.contextMenus.create({
      id: 'chatmarker-mark-chat-facebook',
      parentId: 'chatmarker-main-facebook',
      title: '⭐ Mark/Unmark Chat',
      contexts: ['all']
    });

    // Separator
    chrome.contextMenus.create({
      id: 'chatmarker-separator-1-facebook',
      parentId: 'chatmarker-main-facebook',
      type: 'separator',
      contexts: ['all']
    });

    // Add labels submenu (Facebook)
    chrome.contextMenus.create({
      id: 'chatmarker-labels-facebook',
      parentId: 'chatmarker-main-facebook',
      title: '🏷️ Add Label',
      contexts: ['all']
    });

    // Label options for Facebook (with unique IDs)
    labels.forEach(label => {
      chrome.contextMenus.create({
        id: `chatmarker-label-${label.id}-facebook`,
        parentId: 'chatmarker-labels-facebook',
        title: `${label.emoji} ${label.name}`,
        contexts: ['all']
      });
    });

    // Separator
    chrome.contextMenus.create({
      id: 'chatmarker-separator-2-facebook',
      parentId: 'chatmarker-main-facebook',
      type: 'separator',
      contexts: ['all']
    });

    // Add note (Facebook)
    chrome.contextMenus.create({
      id: 'chatmarker-note-facebook',
      parentId: 'chatmarker-main-facebook',
      title: '📝 Add/Edit Note',
      contexts: ['all']
    });

    // Set reminder (Facebook)
    chrome.contextMenus.create({
      id: 'chatmarker-reminder-facebook',
      parentId: 'chatmarker-main-facebook',
      title: '⏰ Set/Edit Reminder',
      contexts: ['all']
    });

    // ========== Reddit-specific context menus with 'all' contexts ==========
    // Reddit needs 'all' contexts to work on chat list items

    // Main ChatMarker menu for Reddit
    chrome.contextMenus.create({
      id: 'chatmarker-main-reddit',
      title: 'ChatMarker',
      contexts: ['all'],
      documentUrlPatterns: [
        'https://www.reddit.com/*',
        'https://old.reddit.com/*',
        'https://chat.reddit.com/*'
      ]
    });

    // Mark/Unmark chat (Reddit)
    chrome.contextMenus.create({
      id: 'chatmarker-mark-chat-reddit',
      parentId: 'chatmarker-main-reddit',
      title: '⭐ Mark/Unmark Chat',
      contexts: ['all']
    });

    // Separator
    chrome.contextMenus.create({
      id: 'chatmarker-separator-1-reddit',
      parentId: 'chatmarker-main-reddit',
      type: 'separator',
      contexts: ['all']
    });

    // Add labels submenu (Reddit)
    chrome.contextMenus.create({
      id: 'chatmarker-labels-reddit',
      parentId: 'chatmarker-main-reddit',
      title: '🏷️ Add Label',
      contexts: ['all']
    });

    // Label options for Reddit (with unique IDs)
    labels.forEach(label => {
      chrome.contextMenus.create({
        id: `chatmarker-label-${label.id}-reddit`,
        parentId: 'chatmarker-labels-reddit',
        title: `${label.emoji} ${label.name}`,
        contexts: ['all']
      });
    });

    // Separator
    chrome.contextMenus.create({
      id: 'chatmarker-separator-2-reddit',
      parentId: 'chatmarker-main-reddit',
      type: 'separator',
      contexts: ['all']
    });

    // Add note (Reddit)
    chrome.contextMenus.create({
      id: 'chatmarker-note-reddit',
      parentId: 'chatmarker-main-reddit',
      title: '📝 Add/Edit Note',
      contexts: ['all']
    });

    // Set reminder (Reddit)
    chrome.contextMenus.create({
      id: 'chatmarker-reminder-reddit',
      parentId: 'chatmarker-main-reddit',
      title: '⏰ Set/Edit Reminder',
      contexts: ['all']
    });

    // ========== Instagram-specific context menus with 'all' contexts ==========
    // Instagram needs 'all' contexts to work on chat list items

    // Main ChatMarker menu for Instagram
    chrome.contextMenus.create({
      id: 'chatmarker-main-instagram',
      title: 'ChatMarker',
      contexts: ['all'],
      documentUrlPatterns: [
        'https://www.instagram.com/*'
      ]
    });

    // Mark/Unmark chat (Instagram)
    chrome.contextMenus.create({
      id: 'chatmarker-mark-chat-instagram',
      parentId: 'chatmarker-main-instagram',
      title: '⭐ Mark/Unmark Chat',
      contexts: ['all']
    });

    // Separator
    chrome.contextMenus.create({
      id: 'chatmarker-separator-1-instagram',
      parentId: 'chatmarker-main-instagram',
      type: 'separator',
      contexts: ['all']
    });

    // Add labels submenu (Instagram)
    chrome.contextMenus.create({
      id: 'chatmarker-labels-instagram',
      parentId: 'chatmarker-main-instagram',
      title: '🏷️ Add Label',
      contexts: ['all']
    });

    // Label options for Instagram (with unique IDs)
    labels.forEach(label => {
      chrome.contextMenus.create({
        id: `chatmarker-label-${label.id}-instagram`,
        parentId: 'chatmarker-labels-instagram',
        title: `${label.emoji} ${label.name}`,
        contexts: ['all']
      });
    });

    // Separator
    chrome.contextMenus.create({
      id: 'chatmarker-separator-2-instagram',
      parentId: 'chatmarker-main-instagram',
      type: 'separator',
      contexts: ['all']
    });

    // Add note (Instagram)
    chrome.contextMenus.create({
      id: 'chatmarker-note-instagram',
      parentId: 'chatmarker-main-instagram',
      title: '📝 Add/Edit Note',
      contexts: ['all']
    });

    // Set reminder (Instagram)
    chrome.contextMenus.create({
      id: 'chatmarker-reminder-instagram',
      parentId: 'chatmarker-main-instagram',
      title: '⏰ Set/Edit Reminder',
      contexts: ['all']
    });

    // ========== LinkedIn-specific context menus with 'all' contexts ==========
    // LinkedIn needs 'all' contexts to work on chat list items

    // Main ChatMarker menu for LinkedIn
    chrome.contextMenus.create({
      id: 'chatmarker-main-linkedin',
      title: 'ChatMarker',
      contexts: ['all'],
      documentUrlPatterns: [
        'https://www.linkedin.com/*'
      ]
    });

    // Mark/Unmark chat (LinkedIn)
    chrome.contextMenus.create({
      id: 'chatmarker-mark-chat-linkedin',
      parentId: 'chatmarker-main-linkedin',
      title: '⭐ Mark/Unmark Chat',
      contexts: ['all']
    });

    // Separator
    chrome.contextMenus.create({
      id: 'chatmarker-separator-1-linkedin',
      parentId: 'chatmarker-main-linkedin',
      type: 'separator',
      contexts: ['all']
    });

    // Add labels submenu (LinkedIn)
    chrome.contextMenus.create({
      id: 'chatmarker-labels-linkedin',
      parentId: 'chatmarker-main-linkedin',
      title: '🏷️ Add Label',
      contexts: ['all']
    });

    // Label options for LinkedIn (with unique IDs)
    labels.forEach(label => {
      chrome.contextMenus.create({
        id: `chatmarker-label-${label.id}-linkedin`,
        parentId: 'chatmarker-labels-linkedin',
        title: `${label.emoji} ${label.name}`,
        contexts: ['all']
      });
    });

    // Separator
    chrome.contextMenus.create({
      id: 'chatmarker-separator-2-linkedin',
      parentId: 'chatmarker-main-linkedin',
      type: 'separator',
      contexts: ['all']
    });

    // Add note (LinkedIn)
    chrome.contextMenus.create({
      id: 'chatmarker-note-linkedin',
      parentId: 'chatmarker-main-linkedin',
      title: '📝 Add/Edit Note',
      contexts: ['all']
    });

    // Set reminder (LinkedIn)
    chrome.contextMenus.create({
      id: 'chatmarker-reminder-linkedin',
      parentId: 'chatmarker-main-linkedin',
      title: '⏰ Set/Edit Reminder',
      contexts: ['all']
    });

    console.log('[ChatMarker] Chat-only context menus created (including Facebook, Reddit, Instagram, and LinkedIn-specific menus)');
  });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('[ChatMarker] Context menu clicked:', info.menuItemId);

  // Normalize platform-specific menu IDs by removing '-facebook', '-reddit', '-instagram', or '-linkedin' suffix
  // This allows content scripts to handle both regular and platform-specific menus with same logic
  let menuItemId = info.menuItemId;
  if (menuItemId.endsWith('-facebook')) {
    menuItemId = menuItemId.replace('-facebook', '');
    console.log('[ChatMarker] Normalized Facebook menu ID:', menuItemId);
  } else if (menuItemId.endsWith('-reddit')) {
    menuItemId = menuItemId.replace('-reddit', '');
    console.log('[ChatMarker] Normalized Reddit menu ID:', menuItemId);
  } else if (menuItemId.endsWith('-instagram')) {
    menuItemId = menuItemId.replace('-instagram', '');
    console.log('[ChatMarker] Normalized Instagram menu ID:', menuItemId);
  } else if (menuItemId.endsWith('-linkedin')) {
    menuItemId = menuItemId.replace('-linkedin', '');
    console.log('[ChatMarker] Normalized LinkedIn menu ID:', menuItemId);
  }

  // Send message to content script to handle the action
  try {
    chrome.tabs.sendMessage(tab.id, {
      action: 'contextMenuAction',
      menuItemId: menuItemId,
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
