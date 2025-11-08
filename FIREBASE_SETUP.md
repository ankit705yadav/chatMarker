# Firebase Setup Guide for ChatMarker

## Error: "Missing or insufficient permissions"

This error occurs because Firestore security rules need to be configured to allow authenticated users to access their data.

## Quick Fix - Update Firestore Security Rules

### Option 1: Using Firebase Console (Recommended)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `chatmarker-40dd8`

2. **Navigate to Firestore Rules**
   - Click on "Firestore Database" in the left sidebar
   - Click on the "Rules" tab at the top

3. **Replace the existing rules with:**

```
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

4. **Publish the rules**
   - Click the "Publish" button
   - Wait for confirmation (usually takes a few seconds)

5. **Test the extension**
   - Reload the ChatMarker extension
   - Sign in again
   - The sync should now work!

---

### Option 2: Using Firebase CLI

If you have Firebase CLI installed:

```bash
cd /home/ankit705yadav/Desktop/ritz/chatMarker
firebase deploy --only firestore:rules
```

---

## What These Rules Do

- **`request.auth != null`** - Ensures the user is authenticated
- **`request.auth.uid == userId`** - Ensures users can only access their own data
- **`{document=**}`** - Applies to all documents in subcollections (chatMarkers and reminders)

## Data Structure

Your Firestore database will have this structure:

```
/users
  /{userId}
    /chatMarkers
      /{chatMarkerId}
        - chatMarkerId: "chat_whatsapp_123..."
        - platform: "whatsapp"
        - chatName: "John Doe"
        - labels: ["urgent", "important"]
        - notes: "Follow up tomorrow"
        - createdAt: 1234567890
        - syncedAt: (server timestamp)
    /reminders
      /{reminderId}
        - reminderId: "reminder_123..."
        - messageId: "chat_whatsapp_123..."
        - reminderTime: 1234567890
        - active: true
        - syncedAt: (server timestamp)
```

## Verification

After updating the rules, you should see these logs without errors:

```
[ChatMarker Sync] ⬇️ Downloading from cloud...
[ChatMarker Sync] Downloaded X chat markers and Y reminders from cloud
[ChatMarker Sync] ✅ Synced data from cloud to local
```

## Security

These rules ensure:
- ✅ Only authenticated users can access data
- ✅ Users can only access their own data (isolated by UID)
- ✅ Anonymous users cannot read or write anything
- ✅ Users cannot access other users' data

## Troubleshooting

If you still see permission errors:

1. **Check Authentication is enabled:**
   - Firebase Console → Authentication → Sign-in method
   - Ensure "Email/Password" is enabled

2. **Verify user is signed in:**
   - Open browser console
   - Look for: `[ChatMarker Auth] User signed in: your@email.com UID: xxx`

3. **Check Firestore is created:**
   - Firebase Console → Firestore Database
   - Should show "Cloud Firestore" (not "Realtime Database")

4. **Wait a few minutes:**
   - Sometimes rule updates take a moment to propagate

## Current Configuration

Your Firebase project:
- **Project ID:** chatmarker-40dd8
- **Auth Domain:** chatmarker-40dd8.firebaseapp.com
- **User UID:** AzZDuNzrO6VcY8RSL8t86jLRnsm2
- **Email:** ankit886yadav@gmail.com
