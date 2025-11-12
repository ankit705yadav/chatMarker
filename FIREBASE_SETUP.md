# Firebase Setup Guide for ChatMarker

## Quick Setup Summary

ChatMarker uses **Firebase Authentication** and **Firestore Database** for cloud sync of chat markers and reminders.

## Current Project Configuration

**Firebase Project Details:**
- **Project ID:** `chatmarker-40dd8`
- **Auth Domain:** `chatmarker-40dd8.firebaseapp.com`
- **Database:** Cloud Firestore
- **Authentication:** Email/Password

**Configuration File:** `firebase-config.js`

---

## Required Firebase Services

### 1. Firebase Authentication

**Sign-in Methods Enabled:**
- ✅ Email/Password authentication

**How it works:**
- Users sign up with email and password in the side panel
- Authentication state is persisted across extension sessions
- User UID is used to isolate their data in Firestore

**Implementation:** `popup/auth.js`
- `signUpWithEmail(email, password)` - Create new account
- `signInWithEmail(email, password)` - Sign in existing user
- `signOut()` - Sign out current user
- `auth.onAuthStateChanged()` - Listen for auth state changes

---

### 2. Cloud Firestore Database

**Firestore Security Rules Required:**

The following rules **MUST** be deployed to allow authenticated users to access their data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Deploy Rules:**

**Option 1: Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `chatmarker-40dd8`
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the rules above and click **Publish**

**Option 2: Firebase CLI**
```bash
cd /home/ankit705yadav/Desktop/ritz/chatMarker
firebase deploy --only firestore:rules
```

The rules file is already in the project: `firestore.rules`

---

## Data Structure

Firestore stores data in a hierarchical structure:

```
/users
  /{userId}  ← Firebase Auth UID
    /chatMarkers
      /{chatMarkerId}
        chatMarkerId: "chat_whatsapp_1234567890"
        platform: "whatsapp" | "messenger" | "instagram" | "linkedin" | "reddit"
        chatId: "unique_chat_identifier"
        chatName: "John Doe"
        labels: ["urgent", "important"]
        notes: "Follow up tomorrow"
        createdAt: 1234567890 (timestamp)
        updatedAt: 1234567890 (timestamp)
        syncedAt: (server timestamp)

    /reminders
      /{reminderId}
        reminderId: "reminder_1234567890_abc123"
        messageId: "chat_whatsapp_1234567890"
        reminderTime: 1234567890 (timestamp)
        chatName: "John Doe"
        platform: "whatsapp"
        chatId: "unique_chat_identifier"
        active: true
        createdAt: 1234567890 (timestamp)
        syncedAt: (server timestamp)
```

**Key Points:**
- Each user's data is isolated by their Firebase Auth UID
- Chat markers track marked conversations with labels and notes
- Reminders are linked to chat markers via `messageId`
- Timestamps are stored as Unix milliseconds
- `syncedAt` is a server-generated timestamp

---

## Cloud Sync Implementation

**File:** `firestore-sync.js`

### Sync Strategy

**Full Replace (Not Merge):**
- Cloud is always the **source of truth**
- `syncToCloud()` - Replaces ALL cloud data with local data
- `syncFromCloud()` - Replaces ALL local data with cloud data
- No conflict resolution - last sync wins

### Automatic Sync Behavior

1. **On Sign In:**
   - Automatically downloads cloud data once per session
   - Replaces local storage with cloud data
   - Subsequent reloads don't auto-download again

2. **On Data Changes:**
   - Auto-uploads to cloud 3 seconds after changes (debounced)
   - Triggered when:
     - Chat marker saved/updated/deleted
     - Reminder created/deleted
     - Bulk operations (clear all, import data)

3. **Manual Sync:**
   - "Sync to Cloud" button - Uploads local → cloud
   - "Sync from Cloud" button - Downloads cloud → local

### Sync Functions

```javascript
// Upload all local data to cloud (replaces cloud data)
await syncToCloud();

// Download all cloud data to local (replaces local data)
await syncFromCloud();

// Trigger auto-upload after changes (3 second debounce)
triggerAutoSync();
```

**Storage Integration:**
- Uses `chrome.storage.local` for local persistence
- Uses `chrome.storage.session` to track initial sync per session
- Sync is triggered via `triggerAutoSync()` called from storage functions

---

## Common Issues & Solutions

### Error: "Missing or insufficient permissions"

**Cause:** Firestore security rules not deployed

**Fix:** Deploy the security rules (see section above)

**Verify:**
```
[ChatMarker Sync] ⬇️ Downloaded X chat markers and Y reminders from cloud
[ChatMarker Sync] ✅ Synced data from cloud to local
```

---

### Error: "Firestore not initialized or user not signed in"

**Cause:** Trying to sync before authentication completes

**Fix:** Ensure user is signed in before syncing:
```javascript
if (currentUser) {
  await syncToCloud();
}
```

**Check Auth State:**
Look for this log:
```
[ChatMarker Auth] User signed in: your@email.com UID: xxx
```

---

### Cloud Sync Not Working

**Checklist:**
1. ✅ Firebase Authentication enabled (Email/Password)
2. ✅ Firestore Database created (not Realtime Database)
3. ✅ Security rules deployed
4. ✅ User signed in (check console for auth logs)
5. ✅ Network connection active

**Debug Logs:**
Open browser console and look for:
```
[ChatMarker Sync] ⬆️ Uploading X chat markers and Y reminders to cloud...
[ChatMarker Sync] ✅ Sync to cloud complete
```

---

### Data Loss Warning

⚠️ **Important:** Because sync uses a "full replace" strategy:

- If you sign in on Device A with data
- Then sign in on Device B (empty)
- Device B downloads empty cloud data and clears local storage
- Then you make changes on Device B and sync
- Device B uploads its data (even if empty), replacing Device A's cloud data

**Best Practice:**
- Always "Sync from Cloud" before making changes on a new device
- Use "Export Data" to create backups before testing

---

## Security Features

**Firestore Rules Ensure:**
- ✅ Only authenticated users can access data
- ✅ Users can ONLY access their own data (isolated by UID)
- ✅ Anonymous users cannot read or write anything
- ✅ Users cannot access other users' data

**API Key Security:**
- Firebase Web API keys are safe to commit (they identify your project, not authenticate users)
- Actual security is enforced by Firestore rules, not the API key
- Users must authenticate to access data

---

## Testing Setup

**Verify Firebase Integration:**

1. **Sign Up/In:**
   - Open extension side panel
   - Create account or sign in
   - Check console for: `[ChatMarker Auth] User signed in: email@example.com`

2. **Test Sync:**
   - Mark a chat on WhatsApp/Reddit
   - Open side panel
   - Should auto-upload after 3 seconds
   - Check console: `[ChatMarker Sync] ⬆️ Uploading...`

3. **Test Cloud Download:**
   - Clear extension data (chrome://extensions → Remove)
   - Reinstall extension
   - Sign in with same account
   - Should auto-download marked chats
   - Check console: `[ChatMarker Sync] ⬇️ Downloaded X chat markers...`

**Console Commands for Testing:**
```javascript
// Manual upload
await syncToCloud();

// Manual download
await syncFromCloud();

// Check current user
console.log(currentUser);

// Export data for backup
const backup = await exportData();
console.log(backup);
```

---

## File Structure

```
chatMarker/
├── firebase-config.js          # Firebase project configuration
├── firestore.rules             # Firestore security rules
├── firestore-sync.js           # Cloud sync logic
├── popup/
│   └── auth.js                 # Authentication functions
├── utils/
│   └── storage.js              # Local storage + triggers sync
└── lib/
    ├── firebase-app-compat.js     # Firebase SDK
    ├── firebase-auth-compat.js    # Auth SDK
    └── firebase-firestore-compat.js # Firestore SDK
```

---

## Support

For Firebase-specific issues:
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
