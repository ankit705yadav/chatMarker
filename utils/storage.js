/**
 * ChatMarker Storage System
 * Handles all CRUD operations for markers and reminders using Chrome Storage API
 */

// Storage keys
const STORAGE_KEYS = {
  MARKERS: 'markers',
  CHAT_MARKERS: 'chatMarkers',
  REMINDERS: 'reminders',
  SETTINGS: 'settings',
  LABELS: 'labels'
};

// Default settings
const DEFAULT_SETTINGS = {
  theme: 'auto', // 'light', 'dark', 'auto'
  markIcon: 'star', // 'star', 'flag', 'bookmark', 'dot'
  notificationSound: true,
  defaultView: 'popup', // 'popup', 'dashboard'
  fontSize: 'medium', // 'small', 'medium', 'large'
  compactMode: false,
  autoCategorizationEnabled: false
};

// Default label presets
const DEFAULT_LABELS = [
  { id: 'urgent', name: 'Urgent', color: '#EF4444' },
  { id: 'important', name: 'Important', color: '#F59E0B' },
  { id: 'completed', name: 'Completed', color: '#10B981' },
  { id: 'followup', name: 'Follow-up', color: '#3B82F6' },
  { id: 'question', name: 'Question', color: '#8B5CF6' }
];

/**
 * Generate a unique message ID based on platform, chat, and message content
 */
function generateMessageId(platform, chatId, messageContent, sender, timestamp) {
  const contentHash = simpleHash(messageContent.substring(0, 100));
  return `${platform}:${chatId}:${sender}:${timestamp}:${contentHash}`;
}

/**
 * Simple hash function for message content
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Save a marker
 * @param {Object} markerData - The marker data to save
 * @returns {Promise<Object>} The saved marker
 */
async function saveMarker(markerData) {
  try {
    // Validate required fields
    if (!markerData.messageId) {
      throw new Error('messageId is required');
    }

    // Add timestamps
    const now = Date.now();
    const marker = {
      ...markerData,
      createdAt: markerData.createdAt || now,
      updatedAt: now
    };

    // Get existing markers
    const markers = await getAllMarkers();

    // Add or update marker
    markers[marker.messageId] = marker;

    // Save to storage
    await chrome.storage.local.set({ [STORAGE_KEYS.MARKERS]: markers });

    console.log('[ChatMarker] Marker saved:', marker.messageId);
    return marker;
  } catch (error) {
    console.error('[ChatMarker] Error saving marker:', error);
    throw error;
  }
}

/**
 * Get a marker by message ID
 * @param {string} messageId - The message ID
 * @returns {Promise<Object|null>} The marker or null
 */
async function getMarker(messageId) {
  try {
    const markers = await getAllMarkers();
    return markers[messageId] || null;
  } catch (error) {
    console.error('[ChatMarker] Error getting marker:', error);
    return null;
  }
}

/**
 * Get all markers
 * @returns {Promise<Object>} All markers as an object keyed by messageId
 */
async function getAllMarkers() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.MARKERS);
    return result[STORAGE_KEYS.MARKERS] || {};
  } catch (error) {
    console.error('[ChatMarker] Error getting all markers:', error);
    return {};
  }
}

/**
 * Get markers as an array (sorted by most recent)
 * @returns {Promise<Array>} Array of markers
 */
async function getMarkersArray() {
  try {
    const markersObj = await getAllMarkers();
    const markers = Object.values(markersObj);

    // Sort by updatedAt (most recent first)
    markers.sort((a, b) => b.updatedAt - a.updatedAt);

    return markers;
  } catch (error) {
    console.error('[ChatMarker] Error getting markers array:', error);
    return [];
  }
}

/**
 * Update a marker
 * @param {string} messageId - The message ID
 * @param {Object} updates - The fields to update
 * @returns {Promise<Object>} The updated marker
 */
async function updateMarker(messageId, updates) {
  try {
    const marker = await getMarker(messageId);
    if (!marker) {
      throw new Error('Marker not found');
    }

    const updatedMarker = {
      ...marker,
      ...updates,
      updatedAt: Date.now()
    };

    return await saveMarker(updatedMarker);
  } catch (error) {
    console.error('[ChatMarker] Error updating marker:', error);
    throw error;
  }
}

/**
 * Delete a marker
 * @param {string} messageId - The message ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteMarker(messageId) {
  try {
    const markers = await getAllMarkers();

    if (!markers[messageId]) {
      return false;
    }

    delete markers[messageId];

    await chrome.storage.local.set({ [STORAGE_KEYS.MARKERS]: markers });

    console.log('[ChatMarker] Marker deleted:', messageId);
    return true;
  } catch (error) {
    console.error('[ChatMarker] Error deleting marker:', error);
    throw error;
  }
}

/**
 * Delete multiple markers
 * @param {Array<string>} messageIds - Array of message IDs
 * @returns {Promise<number>} Number of markers deleted
 */
async function deleteMarkers(messageIds) {
  try {
    const markers = await getAllMarkers();
    let deleteCount = 0;

    for (const messageId of messageIds) {
      if (markers[messageId]) {
        delete markers[messageId];
        deleteCount++;
      }
    }

    await chrome.storage.local.set({ [STORAGE_KEYS.MARKERS]: markers });

    console.log(`[ChatMarker] ${deleteCount} markers deleted`);
    return deleteCount;
  } catch (error) {
    console.error('[ChatMarker] Error deleting markers:', error);
    throw error;
  }
}

/**
 * Clear all markers
 * @returns {Promise<boolean>} Success status
 */
async function clearAllMarkers() {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.MARKERS]: {} });
    console.log('[ChatMarker] All markers cleared');
    return true;
  } catch (error) {
    console.error('[ChatMarker] Error clearing markers:', error);
    throw error;
  }
}

// ==================== CHAT MARKERS ====================

/**
 * Save a chat marker
 * @param {Object} chatMarker - Chat marker data
 * @returns {Promise<Object>} The saved chat marker
 */
async function saveChatMarker(chatMarker) {
  try {
    // Generate chatMarkerId if not provided
    if (!chatMarker.chatMarkerId) {
      chatMarker.chatMarkerId = `chat_${chatMarker.platform}_${chatMarker.chatId}_${Date.now()}`;
    }

    // Add timestamps
    if (!chatMarker.createdAt) {
      chatMarker.createdAt = Date.now();
    }
    chatMarker.updatedAt = Date.now();

    const chatMarkers = await getAllChatMarkers();
    chatMarkers[chatMarker.chatMarkerId] = chatMarker;

    await chrome.storage.local.set({ [STORAGE_KEYS.CHAT_MARKERS]: chatMarkers });

    console.log('[ChatMarker] Chat marker saved:', chatMarker.chatMarkerId);
    return chatMarker;
  } catch (error) {
    console.error('[ChatMarker] Error saving chat marker:', error);
    throw error;
  }
}

/**
 * Get a chat marker by ID
 * @param {string} chatMarkerId - The chat marker ID
 * @returns {Promise<Object|null>} The chat marker or null
 */
async function getChatMarker(chatMarkerId) {
  try {
    const chatMarkers = await getAllChatMarkers();
    return chatMarkers[chatMarkerId] || null;
  } catch (error) {
    console.error('[ChatMarker] Error getting chat marker:', error);
    return null;
  }
}

/**
 * Get all chat markers as an object
 * @returns {Promise<Object>} Object of chat markers keyed by ID
 */
async function getAllChatMarkers() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CHAT_MARKERS);
    return result[STORAGE_KEYS.CHAT_MARKERS] || {};
  } catch (error) {
    console.error('[ChatMarker] Error getting all chat markers:', error);
    return {};
  }
}

/**
 * Get chat markers as an array (sorted by most recent)
 * @returns {Promise<Array>} Array of chat markers
 */
async function getChatMarkersArray() {
  try {
    const chatMarkers = await getAllChatMarkers();
    const array = Object.values(chatMarkers);
    // Sort by most recent
    array.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    return array;
  } catch (error) {
    console.error('[ChatMarker] Error getting chat markers array:', error);
    return [];
  }
}

/**
 * Get chat marker by chatId and platform
 * @param {string} chatId - The chat ID
 * @param {string} platform - The platform
 * @returns {Promise<Object|null>} The chat marker or null
 */
async function getChatMarkerByChatId(chatId, platform) {
  try {
    const chatMarkers = await getAllChatMarkers();
    const marker = Object.values(chatMarkers).find(
      m => m.chatId === chatId && m.platform === platform
    );
    return marker || null;
  } catch (error) {
    console.error('[ChatMarker] Error getting chat marker by chatId:', error);
    return null;
  }
}

/**
 * Update a chat marker
 * @param {string} chatMarkerId - The chat marker ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} The updated chat marker
 */
async function updateChatMarker(chatMarkerId, updates) {
  try {
    const chatMarkers = await getAllChatMarkers();
    const existing = chatMarkers[chatMarkerId];

    if (!existing) {
      throw new Error(`Chat marker not found: ${chatMarkerId}`);
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };

    chatMarkers[chatMarkerId] = updated;
    await chrome.storage.local.set({ [STORAGE_KEYS.CHAT_MARKERS]: chatMarkers });

    console.log('[ChatMarker] Chat marker updated:', chatMarkerId);
    return updated;
  } catch (error) {
    console.error('[ChatMarker] Error updating chat marker:', error);
    throw error;
  }
}

/**
 * Delete a chat marker
 * @param {string} chatMarkerId - The chat marker ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteChatMarker(chatMarkerId) {
  try {
    const chatMarkers = await getAllChatMarkers();

    if (!chatMarkers[chatMarkerId]) {
      return false;
    }

    delete chatMarkers[chatMarkerId];
    await chrome.storage.local.set({ [STORAGE_KEYS.CHAT_MARKERS]: chatMarkers });

    console.log('[ChatMarker] Chat marker deleted:', chatMarkerId);
    return true;
  } catch (error) {
    console.error('[ChatMarker] Error deleting chat marker:', error);
    throw error;
  }
}

/**
 * Clear all chat markers
 * @returns {Promise<boolean>} Success status
 */
async function clearAllChatMarkers() {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.CHAT_MARKERS]: {} });
    console.log('[ChatMarker] All chat markers cleared');
    return true;
  } catch (error) {
    console.error('[ChatMarker] Error clearing chat markers:', error);
    throw error;
  }
}

// ==================== REMINDERS ====================

/**
 * Save a reminder
 * @param {Object} reminderData - The reminder data
 * @returns {Promise<Object>} The saved reminder
 */
async function saveReminder(reminderData) {
  try {
    if (!reminderData.reminderId) {
      reminderData.reminderId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    const reminders = await getAllReminders();
    reminders[reminderData.reminderId] = reminderData;

    await chrome.storage.local.set({ [STORAGE_KEYS.REMINDERS]: reminders });

    console.log('[ChatMarker] Reminder saved:', reminderData.reminderId);
    return reminderData;
  } catch (error) {
    console.error('[ChatMarker] Error saving reminder:', error);
    throw error;
  }
}

/**
 * Get a reminder by ID
 * @param {string} reminderId - The reminder ID
 * @returns {Promise<Object|null>} The reminder or null
 */
async function getReminder(reminderId) {
  try {
    const reminders = await getAllReminders();
    return reminders[reminderId] || null;
  } catch (error) {
    console.error('[ChatMarker] Error getting reminder:', error);
    return null;
  }
}

/**
 * Get all reminders
 * @returns {Promise<Object>} All reminders
 */
async function getAllReminders() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.REMINDERS);
    return result[STORAGE_KEYS.REMINDERS] || {};
  } catch (error) {
    console.error('[ChatMarker] Error getting all reminders:', error);
    return {};
  }
}

/**
 * Get active reminders as an array
 * @returns {Promise<Array>} Array of active reminders
 */
async function getActiveReminders() {
  try {
    const remindersObj = await getAllReminders();
    const reminders = Object.values(remindersObj);

    return reminders.filter(r => r.active && r.reminderTime > Date.now());
  } catch (error) {
    console.error('[ChatMarker] Error getting active reminders:', error);
    return [];
  }
}

/**
 * Delete a reminder
 * @param {string} reminderId - The reminder ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteReminder(reminderId) {
  try {
    const reminders = await getAllReminders();

    if (!reminders[reminderId]) {
      return false;
    }

    delete reminders[reminderId];

    await chrome.storage.local.set({ [STORAGE_KEYS.REMINDERS]: reminders });

    console.log('[ChatMarker] Reminder deleted:', reminderId);
    return true;
  } catch (error) {
    console.error('[ChatMarker] Error deleting reminder:', error);
    throw error;
  }
}

/**
 * Clear all reminders
 * @returns {Promise<void>}
 */
async function clearAllReminders() {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.REMINDERS]: {} });
    console.log('[ChatMarker] All reminders cleared');
  } catch (error) {
    console.error('[ChatMarker] Error clearing reminders:', error);
    throw error;
  }
}

/**
 * Get settings
 * @returns {Promise<Object>} Settings object
 */
async function getSettings() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
  } catch (error) {
    console.error('[ChatMarker] Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update settings
 * @param {Object} updates - Settings to update
 * @returns {Promise<Object>} Updated settings
 */
async function updateSettings(updates) {
  try {
    const currentSettings = await getSettings();
    const newSettings = { ...currentSettings, ...updates };

    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: newSettings });

    console.log('[ChatMarker] Settings updated');
    return newSettings;
  } catch (error) {
    console.error('[ChatMarker] Error updating settings:', error);
    throw error;
  }
}

/**
 * Get labels
 * @returns {Promise<Array>} Array of labels
 */
async function getLabels() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.LABELS);
    return result[STORAGE_KEYS.LABELS] || DEFAULT_LABELS;
  } catch (error) {
    console.error('[ChatMarker] Error getting labels:', error);
    return DEFAULT_LABELS;
  }
}

/**
 * Save custom labels
 * @param {Array} labels - Array of label objects
 * @returns {Promise<Array>} Saved labels
 */
async function saveLabels(labels) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.LABELS]: labels });
    console.log('[ChatMarker] Labels saved');
    return labels;
  } catch (error) {
    console.error('[ChatMarker] Error saving labels:', error);
    throw error;
  }
}

/**
 * Search markers by text
 * @param {string} query - Search query
 * @returns {Promise<Array>} Filtered markers
 */
async function searchMarkers(query) {
  try {
    if (!query) {
      return await getMarkersArray();
    }

    const markers = await getMarkersArray();
    const lowerQuery = query.toLowerCase();

    return markers.filter(marker => {
      return (
        marker.messageText?.toLowerCase().includes(lowerQuery) ||
        marker.sender?.toLowerCase().includes(lowerQuery) ||
        marker.chatName?.toLowerCase().includes(lowerQuery) ||
        marker.notes?.toLowerCase().includes(lowerQuery)
      );
    });
  } catch (error) {
    console.error('[ChatMarker] Error searching markers:', error);
    return [];
  }
}

/**
 * Filter markers by criteria
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Filtered markers
 */
async function filterMarkers(filters = {}) {
  try {
    let markers = await getMarkersArray();

    // Filter by platform
    if (filters.platform && filters.platform !== 'all') {
      markers = markers.filter(m => m.platform === filters.platform);
    }

    // Filter by labels
    if (filters.labels && filters.labels.length > 0) {
      markers = markers.filter(m => {
        return m.labels && m.labels.some(label => filters.labels.includes(label));
      });
    }

    // Filter by priority
    if (filters.priority && filters.priority !== 'all') {
      markers = markers.filter(m => m.priority === filters.priority);
    }

    // Filter by date range
    if (filters.dateRange) {
      const now = Date.now();
      let minTime = 0;

      switch (filters.dateRange) {
        case 'today':
          minTime = now - (24 * 60 * 60 * 1000);
          break;
        case 'week':
          minTime = now - (7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          minTime = now - (30 * 24 * 60 * 60 * 1000);
          break;
      }

      if (minTime > 0) {
        markers = markers.filter(m => m.createdAt >= minTime);
      }
    }

    // Filter by starred
    if (filters.starred) {
      markers = markers.filter(m => m.starred);
    }

    return markers;
  } catch (error) {
    console.error('[ChatMarker] Error filtering markers:', error);
    return [];
  }
}

/**
 * Get storage statistics
 * @returns {Promise<Object>} Storage stats
 */
async function getStorageStats() {
  try {
    const markers = await getAllMarkers();
    const reminders = await getAllReminders();

    const markerCount = Object.keys(markers).length;
    const reminderCount = Object.keys(reminders).length;
    const activeReminderCount = Object.values(reminders).filter(r => r.active).length;

    // Estimate storage size
    const bytesInUse = await chrome.storage.local.getBytesInUse();

    return {
      markerCount,
      reminderCount,
      activeReminderCount,
      bytesInUse,
      bytesAvailable: chrome.storage.local.QUOTA_BYTES - bytesInUse
    };
  } catch (error) {
    console.error('[ChatMarker] Error getting storage stats:', error);
    return {
      markerCount: 0,
      reminderCount: 0,
      activeReminderCount: 0,
      bytesInUse: 0,
      bytesAvailable: 0
    };
  }
}

/**
 * Export all data
 * @returns {Promise<Object>} Exported data
 */
async function exportData() {
  try {
    const markers = await getAllMarkers();
    const chatMarkers = await getAllChatMarkers();
    const reminders = await getAllReminders();
    const settings = await getSettings();
    const labels = await getLabels();

    return {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      markers,
      chatMarkers,
      reminders,
      settings,
      labels
    };
  } catch (error) {
    console.error('[ChatMarker] Error exporting data:', error);
    throw error;
  }
}

/**
 * Import data
 * @param {Object} data - Data to import
 * @returns {Promise<boolean>} Success status
 */
async function importData(data) {
  try {
    if (!data || !data.version) {
      throw new Error('Invalid import data');
    }

    if (data.markers) {
      await chrome.storage.local.set({ [STORAGE_KEYS.MARKERS]: data.markers });
    }
    if (data.chatMarkers) {
      await chrome.storage.local.set({ [STORAGE_KEYS.CHAT_MARKERS]: data.chatMarkers });
    }
    if (data.reminders) {
      await chrome.storage.local.set({ [STORAGE_KEYS.REMINDERS]: data.reminders });
    }
    if (data.settings) {
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: data.settings });
    }
    if (data.labels) {
      await chrome.storage.local.set({ [STORAGE_KEYS.LABELS]: data.labels });
    }

    console.log('[ChatMarker] Data imported successfully');
    return true;
  } catch (error) {
    console.error('[ChatMarker] Error importing data:', error);
    throw error;
  }
}

// Export all functions
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment (for testing)
  module.exports = {
    generateMessageId,
    simpleHash,
    saveMarker,
    getMarker,
    getAllMarkers,
    getMarkersArray,
    updateMarker,
    deleteMarker,
    deleteMarkers,
    clearAllMarkers,
    saveReminder,
    getReminder,
    getAllReminders,
    getActiveReminders,
    deleteReminder,
    getSettings,
    updateSettings,
    getLabels,
    saveLabels,
    searchMarkers,
    filterMarkers,
    getStorageStats,
    exportData,
    importData
  };
}
