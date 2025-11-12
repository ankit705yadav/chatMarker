# Firebase Setup Guide for ChatMarker

This guide will help you set up Firebase for ChatMarker. Firebase allows you to sync your marked chats across different devices.

---

## What is Firebase?

Firebase is a free service from Google that stores your data in the cloud. ChatMarker uses it to:
- Save your marked chats online
- Sync data between your devices (laptop, desktop, etc.)
- Keep your data private and secure

---

## Do I Need This?

**ChatMarker already works without Firebase!** But Firebase gives you:
- ✅ Secure sign-in to protect your marked chats
- ✅ Automatic sync across multiple computers
- ✅ Cloud backup - never lose your marked chats and reminders

---

## Setup Instructions

Follow these steps to enable Firebase. It takes about 10 minutes.

---

### Step 1: Create a Firebase Account

1. Go to **[Firebase Console](https://console.firebase.google.com/)**
2. Click **"Go to Console"**
3. Sign in with your Google account (it's free!)

---

### Step 2: Create a New Project

1. Click **"Create a project"** (or **"Add project"**)
2. Enter project name: `ChatMarker` (or any name you like)
3. Click **"Continue"**
4. **Disable Google Analytics** (not needed) or leave it enabled
5. Click **"Create project"**
6. Wait for project to be created (takes ~30 seconds)
7. Click **"Continue"** when done

---

### Step 3: Get Your Firebase Configuration

1. In your Firebase project, click the **⚙️ gear icon** (top left)
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon** `</>`
5. Enter app nickname: `ChatMarker Extension`
6. Click **"Register app"**
7. **Copy the configuration code** shown on screen

You'll see something like:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:123:web:abc123"
};
```

8. Open the file `firebase-config.js` in the ChatMarker extension folder
9. **Replace** the existing `firebaseConfig` with your copied configuration
10. **Save** the file

---

### Step 4: Enable Email/Password Authentication

1. In Firebase Console, click **"Authentication"** in the left sidebar
2. Click **"Get started"** button
3. Click on **"Sign-in method"** tab at the top
4. Find **"Email/Password"** in the list
5. Click on it
6. **Toggle the switch to enable** (turn it blue/green)
7. Click **"Save"**

✅ Authentication is now enabled!

---

### Step 5: Create Firestore Database

1. In Firebase Console, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"** button
3. Select **"Start in production mode"**
4. Click **"Next"**
5. Choose your location (select the closest region to you)
   - Example: `us-central` for USA, `europe-west` for Europe, `asia-south` for India
6. Click **"Enable"**
7. Wait for database to be created (~1 minute)

✅ Firestore Database is now created!

---

### Step 6: Set Up Security Rules (IMPORTANT!)

Security rules control who can access your data. **You must do this step** or ChatMarker won't work.

1. In Firestore Database page, click the **"Rules"** tab at the top
2. **Delete all existing text** in the editor
3. **Copy and paste** this code:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Click **"Publish"** button
5. Wait for confirmation message

✅ Security rules are now set!

**What these rules do:**
- Only signed-in users can access data
- Each user can only see their own marked chats and reminders
- Your data is completely private

---

### Step 7: Test ChatMarker

1. **Reload the ChatMarker extension:**
   - Go to `chrome://extensions/`
   - Find ChatMarker
   - Click the reload icon 🔄

2. **Open ChatMarker** (click the ChatMarker icon in Chrome toolbar)

3. **Create an account:**
   - Enter your email
   - Enter a password (minimum 6 characters)
   - Click "Sign Up"

4. **Test it works:**
   - Go to WhatsApp Web or Reddit
   - Right-click on a chat and select "Mark This Chat"
   - Open the ChatMarker side panel - you should see your marked chat

5. **Test cloud sync:**
   - Open Settings in the side panel
   - Click the "Sync to Cloud" button
   - You should see "✅ Synced" message

✅ If everything works, you're all set!

---

## How Cloud Sync Works

### Automatic - No Buttons to Press!

**When you open ChatMarker:**
- Your marked chats automatically download from the cloud
- You always see your latest data

**When you mark chats or set reminders:**
- Changes save to your computer instantly
- After 3 seconds, changes automatically upload to the cloud
- Look for the "✅ Synced" message in the toolbar

**Using multiple computers:**
1. Mark chats on Computer A
2. Wait 4 seconds (for auto-sync)
3. Open ChatMarker on Computer B
4. Your marked chats appear automatically!

---

## Using Multiple Devices

Want to access your marked chats from another computer?

1. Install ChatMarker extension on the other computer
2. Click the ChatMarker icon
3. Click **"Sign In"** tab
4. Enter the same email and password
5. Your marked chats and reminders will automatically download from the cloud!

---

## Cost - It's FREE!

Firebase free plan includes:
- ✅ 1 GB of cloud storage (enough for thousands of marked chats)
- ✅ 50,000 reads per day
- ✅ 20,000 writes per day

For personal use, you'll never hit these limits.

---

## Privacy & Security

### Your Data is Private

- ✅ Only YOU can see your marked chats
- ✅ Stored securely in Google's cloud servers
- ✅ Not shared with anyone
- ✅ Not used for advertising
- ✅ Firebase is used by millions of apps worldwide

### What's Stored

- Your marked chats (chat names, labels, notes)
- Your reminders (time, chat info)
- Your email address
- Sync timestamps

### Not Stored

- Your password (Firebase encrypts it)
- Your browsing history
- Your actual chat messages
- Any personal information

---

## Troubleshooting

### Error: "Missing or insufficient permissions"

**Problem:** Security rules not set up correctly

**Fix:**
1. Go to Firebase Console → Firestore Database → Rules
2. Make sure the rules from Step 6 are there
3. Click "Publish" again
4. Reload the ChatMarker extension

---

### Can't Sign In / Sign Up Not Working

**Problem:** Authentication not enabled OR password too short

**Fix:**
1. Make sure your password is at least 6 characters
2. Go to Firebase Console → Authentication → Sign-in method
3. Make sure "Email/Password" is **Enabled**
4. If not, click on it and enable it

---

### "Email already in use"

**Problem:** You already have an account

**Solution:** Click **"Sign In"** tab instead of **"Sign Up"**

---

### ChatMarker Not Connecting to Firebase

**Problem:** Configuration not copied correctly

**Fix:**
1. Go to Firebase Console → ⚙️ Project Settings
2. Scroll down to "Your apps"
3. Find your web app configuration
4. Copy the config again
5. Open `firebase-config.js` in the ChatMarker extension folder
6. Make sure the configuration matches exactly
7. Save and reload extension

---

### Sync Failed Error

**Problem:** No internet connection or Firestore not enabled

**Solution:**
1. Check your internet connection
2. Make sure you completed Step 5 (Enable Firestore)
3. Wait a minute and try again

---

### Marked Chats Not Syncing Between Computers

**Problem:** Auto-sync didn't complete

**Solution:**
1. Mark chats on Computer A
2. Wait 5 seconds (watch for "✅ Synced" message)
3. On Computer B, close and reopen ChatMarker
4. Your marked chats should appear

---

### Can't Remember Password

**Solution:** Currently there's no password reset. You'll need to:
1. Sign up with a new email address
2. Export your data from the old account (if you still have access)
3. Import it into the new account

---

## Need Help?

If you're still having issues:

1. **Check the troubleshooting section** above
2. **Check Firebase Console:** Make sure all steps are completed
3. **Check Browser Console:**
   - Right-click on ChatMarker side panel → Inspect
   - Look for red error messages in Console tab
4. **Try signing out and back in**
5. **Reload the extension** from `chrome://extensions/`

---

## Summary Checklist

Before using ChatMarker with cloud sync:

- [ ] Created Firebase account
- [ ] Created Firebase project
- [ ] Copied configuration to `firebase-config.js`
- [ ] Enabled Email/Password authentication
- [ ] Created Firestore Database
- [ ] Published security rules
- [ ] Reloaded ChatMarker extension
- [ ] Created account in ChatMarker
- [ ] Marked a test chat
- [ ] Saw "✅ Synced" message

**All checked?** You're ready to use ChatMarker with cloud sync! 🚀

---

**Firebase Documentation:** [https://firebase.google.com/docs](https://firebase.google.com/docs)
