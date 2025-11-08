// Firebase Authentication Module for ChatMarker Chrome Extension

// Firebase services will be initialized after imports
let auth = null;
let db = null;
let currentUser = null;

// Initialize Firebase
async function initializeFirebase() {
  console.log('[ChatMarker Auth] Initializing Firebase...');
  try {
    // Check if firebaseConfig is defined
    if (typeof firebaseConfig === 'undefined') {
      throw new Error('firebaseConfig not found. Please update firebase-config.js with your Firebase project credentials.');
    }

    // Firebase app
    console.log('[ChatMarker Auth] Creating Firebase app...');
    const app = firebase.initializeApp(firebaseConfig);
    console.log('[ChatMarker Auth] ✅ Firebase app created');

    // Get auth instance
    console.log('[ChatMarker Auth] Getting Auth instance...');
    auth = firebase.auth();
    console.log('[ChatMarker Auth] ✅ Auth instance created:', !!auth);

    // Get Firestore instance
    console.log('[ChatMarker Auth] Getting Firestore instance...');
    db = firebase.firestore();
    console.log('[ChatMarker Auth] ✅ Firestore instance created:', !!db);

    // Set up auth state listener
    console.log('[ChatMarker Auth] Setting up auth state listener...');
    auth.onAuthStateChanged((user) => {
      console.log('[ChatMarker Auth] Auth state changed - user:', user ? user.email : 'null');
      currentUser = user;

      if (user) {
        console.log('[ChatMarker Auth] User signed in:', user.email, 'UID:', user.uid);
        // Store user info in chrome storage
        chrome.storage.local.set({
          currentUser: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          }
        });

        // Show main app
        showMainApp();
      } else {
        console.log('[ChatMarker Auth] User signed out');
        chrome.storage.local.remove('currentUser');
        // Show auth screen
        showAuthScreen();
      }
    });

    console.log('[ChatMarker Auth] ✅✅✅ Firebase initialized successfully');
    console.log('[ChatMarker Auth] Status - auth:', !!auth, 'db:', !!db, 'currentUser:', !!currentUser);
  } catch (error) {
    console.error('[ChatMarker Auth] ❌ Error initializing Firebase:', error);
    showError('Failed to initialize authentication: ' + error.message);
  }
}

// Sign up with email and password
async function signUpWithEmail(email, password) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    console.log('[ChatMarker Auth] User signed up:', userCredential.user.email);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('[ChatMarker Auth] Sign up error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// Sign in with email and password
async function signInWithEmail(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    console.log('[ChatMarker Auth] User signed in:', userCredential.user.email);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('[ChatMarker Auth] Sign in error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// Sign out
async function signOut() {
  try {
    await auth.signOut();
    console.log('[ChatMarker Auth] User signed out');
    return { success: true };
  } catch (error) {
    console.error('[ChatMarker Auth] Sign out error:', error);
    return { success: false, error: error.message };
  }
}

// Get current user
function getCurrentUser() {
  return currentUser;
}

// Check if user is authenticated
function isAuthenticated() {
  return currentUser !== null;
}

// Get user-specific storage key
function getUserStorageKey(key) {
  if (!currentUser) {
    return key; // Fallback to non-user-specific key
  }
  return `${currentUser.uid}_${key}`;
}

// Helper function to format error messages
function getErrorMessage(error) {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    default:
      return error.message || 'An error occurred. Please try again.';
  }
}

// UI Helper functions
function showAuthScreen() {
  console.log('[ChatMarker Auth] showAuthScreen() called');
  const dashboardContainer = document.getElementById('container') || document.querySelector('.dashboard-container');
  const authContainer = document.getElementById('authContainer');

  if (dashboardContainer) dashboardContainer.style.display = 'none';
  if (authContainer) authContainer.style.display = 'flex';
}

function showMainApp() {
  console.log('[ChatMarker Auth] showMainApp() called');
  const dashboardContainer = document.getElementById('container') || document.querySelector('.dashboard-container');
  const authContainer = document.getElementById('authContainer');
  const signOutBtn = document.getElementById('signOutBtn');
  const syncUploadBtn = document.getElementById('syncUploadBtn');
  const syncDownloadBtn = document.getElementById('syncDownloadBtn');

  if (authContainer) authContainer.style.display = 'none';
  if (dashboardContainer) dashboardContainer.style.display = 'flex';
  if (signOutBtn) signOutBtn.style.display = 'block';
  if (syncUploadBtn) syncUploadBtn.style.display = 'block';
  if (syncDownloadBtn) syncDownloadBtn.style.display = 'block';

  // Load user's markers
  console.log('[ChatMarker Auth] Loading user markers...');
  if (typeof loadMarkers === 'function') {
    loadMarkers();
  }

  // Setup cloud sync now that user is authenticated
  console.log('[ChatMarker Auth] Setting up cloud sync...');
  if (typeof setupCloudSync === 'function') {
    setupCloudSync();
  } else {
    console.warn('[ChatMarker Auth] ⚠️ setupCloudSync not available yet');
  }

  console.log('[ChatMarker Auth] Main app displayed');
}

function showError(message) {
  const errorDiv = document.getElementById('authError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

function showSuccess(message) {
  const successDiv = document.getElementById('authSuccess');
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
      successDiv.style.display = 'none';
    }, 3000);
  }
}

// Initialize Firebase when script loads
console.log('[ChatMarker Auth] Script loaded, checking for Firebase SDK...');
if (typeof firebase !== 'undefined') {
  console.log('[ChatMarker Auth] Firebase SDK detected, initializing...');
  initializeFirebase();
} else {
  console.error('[ChatMarker Auth] ❌ Firebase SDK not loaded!');
}
