// Firestore Cloud Sync for ChatMarker

// Sync status
let isUploading = false;
let isDownloading = false;
let lastSyncTime = null;

// Get sync session key for current user
function getSyncSessionKey() {
  if (!currentUser) return null;
  return `syncSession_${currentUser.uid}`;
}

// Check if initial sync completed for current session
async function hasCompletedInitialSync() {
  const key = getSyncSessionKey();
  if (!key) return false;

  const result = await chrome.storage.session.get(key);
  return result[key] === true;
}

// Mark initial sync as completed
async function markInitialSyncCompleted() {
  const key = getSyncSessionKey();
  if (key) {
    await chrome.storage.session.set({ [key]: true });
    console.log('[ChatMarker Sync] Initial sync marked as completed for this session');
  }
}

// Get Firestore reference for user's chat markers
function getUserChatMarkersRef() {
  console.log('[ChatMarker Sync] getUserChatMarkersRef - db:', !!db, 'currentUser:', !!currentUser);
  if (!db || !currentUser) {
    console.error('[ChatMarker Sync] ERROR: Firestore not initialized or user not signed in', { db: !!db, currentUser: !!currentUser });
    throw new Error('Firestore not initialized or user not signed in');
  }
  console.log('[ChatMarker Sync] Returning chat markers ref for user:', currentUser.uid);
  return db.collection('users').doc(currentUser.uid).collection('chatMarkers');
}

// Get Firestore reference for user's reminders
function getUserRemindersRef() {
  console.log('[ChatMarker Sync] getUserRemindersRef - db:', !!db, 'currentUser:', !!currentUser);
  if (!db || !currentUser) {
    console.error('[ChatMarker Sync] ERROR: Firestore not initialized or user not signed in', { db: !!db, currentUser: !!currentUser });
    throw new Error('Firestore not initialized or user not signed in');
  }
  console.log('[ChatMarker Sync] Returning reminders ref for user:', currentUser.uid);
  return db.collection('users').doc(currentUser.uid).collection('reminders');
}

// Upload local data to Firestore
async function syncToCloud() {
  console.log('[ChatMarker Sync] ⬆️ syncToCloud() called');
  console.log('[ChatMarker Sync] isUploading:', isUploading, 'isDownloading:', isDownloading);

  if (isUploading) {
    console.log('[ChatMarker Sync] Upload already in progress, skipping');
    return;
  }

  try {
    isUploading = true;
    console.log('[ChatMarker Sync] Starting upload to cloud...');
    updateSyncStatus('⬆️ Syncing to cloud...');

    // Get local data
    const chatMarkers = await getAllChatMarkers() || {};
    const reminders = await getAllReminders() || {};

    console.log(`[ChatMarker Sync] ⬆️ Uploading ${Object.keys(chatMarkers).length} chat markers and ${Object.keys(reminders).length} reminders to cloud...`);

    const chatMarkersRef = getUserChatMarkersRef();
    const remindersRef = getUserRemindersRef();
    const batch = db.batch();

    // Delete all existing cloud chat markers (full replace strategy)
    console.log('[ChatMarker Sync] Fetching existing cloud chat markers...');
    const existingChatMarkers = await chatMarkersRef.get();
    console.log(`[ChatMarker Sync] Found ${existingChatMarkers.size} existing chat markers, deleting...`);
    existingChatMarkers.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete all existing cloud reminders
    console.log('[ChatMarker Sync] Fetching existing cloud reminders...');
    const existingReminders = await remindersRef.get();
    console.log(`[ChatMarker Sync] Found ${existingReminders.size} existing reminders, deleting...`);
    existingReminders.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Add all local chat markers
    console.log('[ChatMarker Sync] Adding local chat markers to batch...');
    Object.entries(chatMarkers).forEach(([id, marker]) => {
      const docRef = chatMarkersRef.doc(id);
      batch.set(docRef, {
        ...marker,
        syncedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    // Add all local reminders
    console.log('[ChatMarker Sync] Adding local reminders to batch...');
    Object.entries(reminders).forEach(([id, reminder]) => {
      const docRef = remindersRef.doc(id);
      batch.set(docRef, {
        ...reminder,
        syncedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    console.log('[ChatMarker Sync] Committing batch to Firestore...');
    await batch.commit();
    lastSyncTime = new Date();

    console.log('[ChatMarker Sync] ✅ Sync to cloud complete at', lastSyncTime);
    updateSyncStatus('✅ Synced');

    // Hide success message after 2 seconds
    setTimeout(() => updateSyncStatus(''), 2000);

  } catch (error) {
    console.error('[ChatMarker Sync] Sync to cloud failed:', error);
    updateSyncStatus('❌ Sync failed');
    setTimeout(() => updateSyncStatus(''), 3000);
    throw error;
  } finally {
    isUploading = false;
    console.log('[ChatMarker Sync] Upload complete, isUploading set to false');
  }
}

// Download data from Firestore
async function syncFromCloud() {
  console.log('[ChatMarker Sync] ⬇️ syncFromCloud() called');
  console.log('[ChatMarker Sync] isUploading:', isUploading, 'isDownloading:', isDownloading);

  if (isDownloading) {
    console.log('[ChatMarker Sync] Download already in progress, skipping');
    return;
  }

  try {
    isDownloading = true;
    console.log('[ChatMarker Sync] Starting download from cloud...');
    updateSyncStatus('⬇️ Syncing from cloud...');

    const chatMarkersRef = getUserChatMarkersRef();
    const remindersRef = getUserRemindersRef();

    // Fetch chat markers from cloud
    console.log('[ChatMarker Sync] Fetching cloud chat markers...');
    const chatMarkersSnapshot = await chatMarkersRef.get();
    const cloudChatMarkers = {};
    chatMarkersSnapshot.forEach(doc => {
      const data = doc.data();
      // Remove Firestore metadata fields
      delete data.syncedAt;
      cloudChatMarkers[doc.id] = data;
    });

    // Fetch reminders from cloud
    console.log('[ChatMarker Sync] Fetching cloud reminders...');
    const remindersSnapshot = await remindersRef.get();
    const cloudReminders = {};
    remindersSnapshot.forEach(doc => {
      const data = doc.data();
      // Remove Firestore metadata fields
      delete data.syncedAt;
      cloudReminders[doc.id] = data;
    });

    console.log(`[ChatMarker Sync] ⬇️ Downloaded ${Object.keys(cloudChatMarkers).length} chat markers and ${Object.keys(cloudReminders).length} reminders from cloud`);

    // Get local data for comparison
    const localChatMarkers = await getAllChatMarkers() || {};
    const localReminders = await getAllReminders() || {};
    console.log(`[ChatMarker Sync] Local storage has ${Object.keys(localChatMarkers).length} chat markers and ${Object.keys(localReminders).length} reminders`);

    // Cloud is ALWAYS the source of truth
    console.log('[ChatMarker Sync] Cloud is source of truth, replacing local with cloud data');
    await chrome.storage.local.set({
      chatMarkers: cloudChatMarkers,
      reminders: cloudReminders
    });

    if (Object.keys(cloudChatMarkers).length > 0 || Object.keys(cloudReminders).length > 0) {
      console.log('[ChatMarker Sync] ✅ Synced data from cloud to local');
    } else {
      console.log('[ChatMarker Sync] ✅ Cloud is empty, cleared local storage (data deleted on another device)');
    }

    lastSyncTime = new Date();
    updateSyncStatus('✅ Synced');

    // Reload UI to show updated data
    if (typeof loadMarkers === 'function') {
      loadMarkers();
    }

    setTimeout(() => updateSyncStatus(''), 2000);

  } catch (error) {
    console.error('[ChatMarker Sync] Sync from cloud failed:', error);
    updateSyncStatus('❌ Sync failed');
    setTimeout(() => updateSyncStatus(''), 3000);
    throw error;
  } finally {
    isDownloading = false;
    console.log('[ChatMarker Sync] Download complete, isDownloading set to false');
  }
}

// Update sync status UI
function updateSyncStatus(message) {
  // Only update UI if running in a document context (popup), not in service worker (background)
  if (typeof document !== 'undefined') {
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
      syncStatus.textContent = message;
      syncStatus.style.display = message ? 'inline-block' : 'none';
    }
  }
  // Always log the status for debugging
  if (message) {
    console.log('[ChatMarker Sync] Status:', message);
  }
}

// Setup automatic cloud sync
async function setupCloudSync() {
  console.log('[ChatMarker Sync] setupCloudSync() called');
  console.log('[ChatMarker Sync] currentUser:', currentUser ? `${currentUser.email} (${currentUser.uid})` : 'null');
  console.log('[ChatMarker Sync] db:', !!db);

  // Check if initial sync already completed for this session
  const syncCompleted = await hasCompletedInitialSync();
  console.log('[ChatMarker Sync] hasCompletedInitialSync:', syncCompleted);

  // Only auto-download once per session
  if (syncCompleted) {
    console.log('[ChatMarker Sync] Initial sync already completed for this session, skipping auto-download');
    console.log('[ChatMarker Sync] ✅ Cloud sync ready (already synced)');
    return;
  }

  // Automatically download from cloud when user is signed in
  if (currentUser) {
    console.log('[ChatMarker Sync] User is signed in, scheduling auto-download in 1 second...');
    // Wait a bit for UI to load, then sync from cloud
    setTimeout(async () => {
      console.log('[ChatMarker Sync] 1 second elapsed, starting auto-download...');
      try {
        await syncFromCloud();
        await markInitialSyncCompleted();
        console.log('[ChatMarker Sync] ✅ Initial sync completed, session flag set');
      } catch (error) {
        console.error('[ChatMarker Sync] ❌ Auto-download from cloud failed:', error);
      }
    }, 1000);
  } else {
    console.warn('[ChatMarker Sync] ⚠️ No user signed in, skipping auto-download');
  }

  console.log('[ChatMarker Sync] ✅ Automatic cloud sync initialized');
}

// Auto-sync when user makes changes (debounced)
let autoSyncTimeout = null;
function triggerAutoSync() {
  console.log('[ChatMarker Sync] 🔄 triggerAutoSync() called');
  if (!currentUser) {
    console.warn('[ChatMarker Sync] ⚠️ No user signed in, skipping auto-sync');
    return;
  }

  console.log('[ChatMarker Sync] User signed in, scheduling auto-upload in 3 seconds...');
  // Debounce: wait 3 seconds after last change before syncing
  clearTimeout(autoSyncTimeout);
  autoSyncTimeout = setTimeout(async () => {
    console.log('[ChatMarker Sync] 3 seconds elapsed, starting auto-upload...');
    try {
      await syncToCloud();
    } catch (error) {
      console.error('[ChatMarker Sync] ❌ Auto-sync failed:', error);
    }
  }, 3000);
}
