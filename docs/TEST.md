# ChatMarker - Testing Guide

This document provides comprehensive testing instructions for all implemented features.

**Current Version**: 1.0.0 (4 Platforms Implemented)
**Last Updated**: 2025-11-02

---

## Table of Contents

1. [Extension Installation](#extension-installation)
2. [Background Service Worker](#background-service-worker)
3. [Storage System](#storage-system)
4. [Popup UI](#popup-ui)
5. [Settings Modal](#settings-modal)
6. [Note Editor Modal](#note-editor-modal)
7. [Dark Mode](#dark-mode)
8. [Search and Filters](#search-and-filters)
9. [Export and Import](#export-and-import)
10. [Content Scripts](#content-scripts)
11. [Troubleshooting](#troubleshooting)

---

## Extension Installation

### Test 1.1: Load Extension in Chrome

**Steps**:
1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Toggle **"Developer mode"** ON (top-right corner)
4. Click **"Load unpacked"** button
5. Navigate to and select the `chatMarker/` directory
6. Click "Select Folder"

**Expected Results**:
- ✅ ChatMarker appears in extension list
- ✅ Extension card shows no errors
- ✅ Version displays as "1.0.0"
- ✅ Default Chrome icon appears (puzzle piece - normal, icons not yet added)
- ✅ "Service worker" shows as "Active"
- ✅ Permissions listed: storage, notifications, alarms, activeTab, scripting

**How to Verify**:
- Check extension card background is white (no red error background)
- Click "Errors" button - should show 0 errors
- Extension icon visible in toolbar (right of address bar)

**If Failed**: See [Troubleshooting](#troubleshooting) section

---

## Background Service Worker

### Test 2.1: Service Worker Loads Successfully

**Steps**:
1. On `chrome://extensions/`, find ChatMarker
2. Click the **"service worker"** link (blue text)
3. A DevTools console window opens

**Expected Results**:
- ✅ Console opens showing background script output
- ✅ Message appears: `[ChatMarker] Background service worker loaded`
- ✅ Message appears: `[ChatMarker] Extension installed/updated: install` (first load) or `update` (reload)
- ✅ No error messages in console

**How to Verify**:
- Console shows initialization messages
- No red error text
- Service worker status on extension page shows "Active"

### Test 2.2: Storage Functions Available

**Steps**:
1. In the service worker console, type and run each command:

```javascript
// Test 1: Check storage functions exist
typeof saveMarker
typeof getMarker
typeof getAllMarkers
```

**Expected Results**:
- ✅ Each returns `"function"`
- ✅ No "undefined" or errors

**Steps** (continued):
```javascript
// Test 2: Check storage is initialized
const settings = await getSettings();
console.log('Settings:', settings);

const labels = await getLabels();
console.log('Labels:', labels);
```

**Expected Results**:
- ✅ Settings object displays with default values (theme: 'auto', markIcon: 'star', etc.)
- ✅ Labels array displays with 5 default labels (urgent, important, completed, followup, question)
- ✅ No errors

### Test 2.3: Message Listener Registered

**Steps**:
1. In service worker console, run:

```javascript
// Send a test message to background
chrome.runtime.sendMessage({ action: 'getAllMarkers' }, (response) => {
  console.log('Response:', response);
});
```

**Expected Results**:
- ✅ Response object appears: `{ success: true, markers: [] }`
- ✅ markers is an empty array (no marks created yet)

---

## Storage System

### Test 3.1: Create a Test Marker

**Steps**:
1. Open service worker console
2. Run this code:

```javascript
// Create a test marker
const testMarker = await saveMarker({
  messageId: 'test:chat123:sender:' + Date.now() + ':abc',
  platform: 'whatsapp',
  chatId: 'chat123',
  chatName: 'Test Chat',
  sender: 'John Doe',
  messageText: 'This is a test message to verify storage works!',
  labels: ['important', 'followup'],
  notes: 'This is a test note',
  priority: 'high',
  starred: true,
  timestamp: Date.now()
});

console.log('Marker created:', testMarker);
```

**Expected Results**:
- ✅ Marker object displays in console
- ✅ Contains all fields provided
- ✅ Has `createdAt` and `updatedAt` timestamps added automatically
- ✅ No errors

### Test 3.2: Retrieve the Test Marker

**Steps**:
```javascript
// Get the marker by ID (use the messageId from above)
const marker = await getMarker(testMarker.messageId);
console.log('Retrieved marker:', marker);
```

**Expected Results**:
- ✅ Same marker object returned
- ✅ All fields match what was saved

### Test 3.3: Get All Markers

**Steps**:
```javascript
const allMarkers = await getMarkersArray();
console.log('All markers:', allMarkers);
console.log('Total count:', allMarkers.length);
```

**Expected Results**:
- ✅ Array with 1 marker
- ✅ Marker is the test marker created above

### Test 3.4: Update Marker

**Steps**:
```javascript
// Update the marker
const updated = await updateMarker(testMarker.messageId, {
  notes: 'Updated note text',
  labels: ['urgent', 'completed']
});

console.log('Updated marker:', updated);
```

**Expected Results**:
- ✅ Returns updated marker
- ✅ notes field changed to "Updated note text"
- ✅ labels changed to ['urgent', 'completed']
- ✅ updatedAt timestamp is newer than createdAt

### Test 3.5: Search Markers

**Steps**:
```javascript
// Search for "test"
const results = await searchMarkers('test');
console.log('Search results:', results);

// Search for non-existent text
const noResults = await searchMarkers('xyz123notfound');
console.log('No results:', noResults);
```

**Expected Results**:
- ✅ First search returns array with 1 marker (our test marker)
- ✅ Second search returns empty array
- ✅ No errors

### Test 3.6: Filter Markers

**Steps**:
```javascript
// Filter by platform
const whatsappMarkers = await filterMarkers({ platform: 'whatsapp' });
console.log('WhatsApp markers:', whatsappMarkers);

// Filter by label
const urgentMarkers = await filterMarkers({ labels: ['urgent'] });
console.log('Urgent markers:', urgentMarkers);
```

**Expected Results**:
- ✅ WhatsApp filter returns our test marker
- ✅ Urgent filter returns our test marker (we labeled it urgent in update)
- ✅ Results are arrays

### Test 3.7: Delete Marker

**Steps**:
```javascript
// Delete the test marker
const deleted = await deleteMarker(testMarker.messageId);
console.log('Deleted:', deleted);

// Verify it's gone
const allAfterDelete = await getMarkersArray();
console.log('Markers after delete:', allAfterDelete);
```

**Expected Results**:
- ✅ deleteMarker returns `true`
- ✅ getMarkersArray returns empty array `[]`
- ✅ Test marker is gone

### Test 3.8: Storage Statistics

**Steps**:
```javascript
const stats = await getStorageStats();
console.log('Storage stats:', stats);
```

**Expected Results**:
- ✅ Object with properties: markerCount, reminderCount, activeReminderCount, bytesInUse, bytesAvailable
- ✅ markerCount is 0 (we deleted the test marker)
- ✅ All values are numbers

---

## Popup UI

### Test 4.1: Open Popup

**Steps**:
1. Click the ChatMarker extension icon in toolbar
2. Popup window opens

**Expected Results**:
- ✅ Popup opens (400px × 600px)
- ✅ Header displays with "⭐ ChatMarker" logo
- ✅ Settings icon (⚙️) visible in top-right
- ✅ Dark mode toggle (🌙) visible in top-right
- ✅ Search bar present with placeholder "Search messages..."
- ✅ Three filter dropdowns visible: "All Platforms", "All Labels", "All Time"
- ✅ Empty state message shows:
  - Star icon
  - "No marked messages yet"
  - Instructions text
  - "View Tutorial" button
- ✅ Footer shows "No marked messages"
- ✅ "Export Data" button in footer

**How to Verify**:
- Popup is well-formatted with no layout issues
- All text is readable
- No console errors (right-click popup → Inspect → Console tab)

### Test 4.2: Popup with Test Data

**Steps**:
1. Close popup (if open)
2. Open service worker console
3. Create multiple test markers:

```javascript
// Create test data
const testMarkers = [
  {
    messageId: 'whatsapp:test1:' + Date.now(),
    platform: 'whatsapp',
    chatId: 'chat1',
    chatName: 'John Doe',
    sender: 'John Doe',
    messageText: 'Let\'s schedule the meeting for tomorrow at 2pm. Please confirm your availability.',
    labels: ['important', 'followup'],
    notes: 'Need to check calendar first',
    timestamp: Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
  },
  {
    messageId: 'messenger:test2:' + Date.now(),
    platform: 'messenger',
    chatId: 'chat2',
    chatName: 'Project Team',
    sender: 'Sarah Smith',
    messageText: 'Can you send me the updated files? The deadline is approaching.',
    labels: ['urgent'],
    timestamp: Date.now() - 5 * 60 * 60 * 1000 // 5 hours ago
  },
  {
    messageId: 'instagram:test3:' + Date.now(),
    platform: 'instagram',
    chatId: 'chat3',
    chatName: 'Alex Chen',
    sender: 'Alex Chen',
    messageText: 'Great idea! Let\'s do it this weekend. Saturday works best for me.',
    labels: ['completed'],
    notes: 'Confirmed for Saturday 3pm',
    timestamp: Date.now() - 24 * 60 * 60 * 1000 // 1 day ago
  },
  {
    messageId: 'linkedin:test4:' + Date.now(),
    platform: 'linkedin',
    chatId: 'chat4',
    chatName: 'Mike Johnson',
    sender: 'Mike Johnson',
    messageText: 'Very interested in the Senior Developer position. I have 5 years of experience with React and Node.js.',
    labels: ['question'],
    timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 // 3 days ago
  }
];

// Save all test markers
for (const marker of testMarkers) {
  await saveMarker(marker);
}

console.log('✅ Test data created! Open the popup now.');
```

4. Now click the extension icon to open popup

**Expected Results**:
- ✅ Empty state is gone
- ✅ **4 message cards** display
- ✅ Each card shows:
  - Platform icon (🟢 WhatsApp, 🔵 Messenger, 📷 Instagram, 💼 LinkedIn)
  - Sender name (bold)
  - Time ago (e.g., "2h ago", "5h ago", "1d ago", "3d ago")
  - Message text (2 lines max, truncated if longer)
  - Label badges with correct colors
  - Note icon (📝) if note exists
  - Action buttons on hover (📝 Edit Note, 🗑️ Delete)
- ✅ Footer shows "4 marked messages"
- ✅ Cards are sorted newest first

**How to Verify**:
- Hover over a card - it should highlight with blue border
- Hover over a card - action buttons (📝 🗑️) fade in on right side
- Labels have correct colors:
  - Urgent = red
  - Important = yellow/orange
  - Completed = green
  - Follow-up = blue
  - Question = purple

### Test 4.3: Card Hover States

**Steps**:
1. With popup open and test data loaded
2. Hover mouse over each message card
3. Move mouse away

**Expected Results**:
- ✅ On hover: Card border turns blue (#6366F1)
- ✅ On hover: Subtle shadow appears
- ✅ On hover: Action buttons (📝 🗑️) fade in
- ✅ Off hover: Border returns to gray
- ✅ Off hover: Shadow disappears
- ✅ Off hover: Action buttons fade out
- ✅ Smooth transitions (no jarring changes)

### Test 4.4: Message Card Click (Navigate)

**Steps**:
1. With popup open
2. Click anywhere on a message card (not on action buttons)

**Expected Results**:
- ✅ Popup attempts to close
- ✅ No errors in console

**Note**: Navigation won't work yet because content scripts are placeholders. This will be fully functional in Day 2. For now, just verify no errors occur.

---

## Settings Modal

### Test 5.1: Open Settings Modal

**Steps**:
1. Open popup
2. Click the **settings icon (⚙️)** in top-right

**Expected Results**:
- ✅ Modal overlay appears (darkened background)
- ✅ Modal window opens centered
- ✅ Title: "Settings"
- ✅ Close button (✕) in top-right
- ✅ Three sections visible:
  - **General** section
  - **Data** section
  - **About** section
- ✅ "Save Settings" button at bottom

### Test 5.2: Settings Form Elements

**Steps**:
1. With settings modal open
2. Inspect each form element

**Expected Results**:

**General Section**:
- ✅ Theme dropdown present with options:
  - Auto (System Default)
  - Light
  - Dark
- ✅ "Enable notification sound" checkbox (checked by default)
- ✅ "Compact mode (show more items)" checkbox (unchecked by default)

**Data Section**:
- ✅ "Export All Data" button
- ✅ "Import Data" button
- ✅ "Clear All Marks" button (red/danger styling)

**About Section**:
- ✅ Shows "ChatMarker v1.0.0"
- ✅ Description text present

### Test 5.3: Close Settings Modal

**Steps**:
1. Open settings modal
2. **Method 1**: Click the (✕) close button
3. Reopen settings
4. **Method 2**: Click outside modal (on dark overlay)
5. Reopen settings
6. **Method 3**: Click "Save Settings" button

**Expected Results**:
- ✅ All three methods close the modal
- ✅ Smooth fade-out animation
- ✅ Modal completely disappears
- ✅ Popup main view visible again

### Test 5.4: Change Theme Setting

**Steps**:
1. Open settings modal
2. Change theme dropdown to "Dark"
3. Click "Save Settings"
4. Observe popup
5. Reopen settings modal

**Expected Results**:
- ✅ Toast notification appears: "Settings saved"
- ✅ Popup switches to dark mode
- ✅ When reopening settings, theme dropdown still shows "Dark"
- ✅ Setting persists after closing and reopening popup

### Test 5.5: Toggle Checkboxes

**Steps**:
1. Open settings
2. Uncheck "Enable notification sound"
3. Check "Compact mode"
4. Click "Save Settings"
5. Reopen settings

**Expected Results**:
- ✅ Toast shows "Settings saved"
- ✅ Checkboxes maintain state when reopening
- ✅ Settings persist across popup close/open

---

## Note Editor Modal

### Test 6.1: Open Note Editor

**Prerequisites**: Create test data first (see Test 4.2)

**Steps**:
1. Open popup with test markers
2. Hover over a message card
3. Click the **📝 (note) button**

**Expected Results**:
- ✅ Note editor modal opens
- ✅ Title: "Add Note"
- ✅ Close button (✕) visible
- ✅ Message preview section shows:
  - "Message:" label
  - The message text from the card
- ✅ "Your Note:" label
- ✅ Text area for note (empty or shows existing note)
- ✅ Character counter shows "0 / 500"
- ✅ "Cancel" and "Save Note" buttons at bottom

### Test 6.2: Add New Note

**Steps**:
1. Open note editor for a message without a note
2. Type in text area: "This is my test note for verification"
3. Observe character counter
4. Click "Save Note"

**Expected Results**:
- ✅ Character counter updates as you type (e.g., "42 / 500")
- ✅ Toast notification: "Note saved"
- ✅ Modal closes
- ✅ Message card now shows 📝 icon next to labels
- ✅ Note persists (close and reopen popup - 📝 icon still there)

### Test 6.3: Edit Existing Note

**Steps**:
1. Open note editor for message that has a note (📝 icon visible)
2. Note text area should be pre-filled
3. Modify the text
4. Click "Save Note"

**Expected Results**:
- ✅ Existing note text loads in text area
- ✅ Can edit the text
- ✅ Saves successfully
- ✅ Toast: "Note saved"

### Test 6.4: Character Limit

**Steps**:
1. Open note editor
2. Paste or type exactly 500 characters
3. Try to type more

**Expected Results**:
- ✅ Can type up to 500 characters
- ✅ Cannot type beyond 500 (text area blocks input)
- ✅ Counter shows "500 / 500"
- ✅ Counter text turns red when at limit

### Test 6.5: Cancel Note Editing

**Steps**:
1. Open note editor
2. Type some text
3. Click "Cancel" button
4. Reopen note editor

**Expected Results**:
- ✅ Modal closes without saving
- ✅ Changes discarded
- ✅ Reopening shows original note (or empty if no note existed)

---

## Dark Mode

### Test 7.1: Toggle Dark Mode (Quick Toggle)

**Steps**:
1. Open popup (default is light mode)
2. Click the **🌙 moon icon** in top-right
3. Observe changes
4. Click again (icon should now be ☀️ sun)

**Expected Results**:

**Dark Mode Activated**:
- ✅ Icon changes from 🌙 to ☀️
- ✅ Background changes from white to dark blue (#0F172A)
- ✅ Text changes from dark to light
- ✅ All cards have dark backgrounds
- ✅ Borders become lighter
- ✅ Labels remain colorful (same colors work in both modes)
- ✅ Smooth transition animation

**Light Mode Restored**:
- ✅ Icon changes from ☀️ to 🌙
- ✅ Colors revert to light theme
- ✅ Smooth transition

### Test 7.2: Dark Mode Persistence

**Steps**:
1. Toggle dark mode ON
2. Close popup
3. Reopen popup

**Expected Results**:
- ✅ Popup opens in dark mode
- ✅ Sun icon (☀️) shows (indicating dark mode is active)
- ✅ Dark mode persists across sessions

### Test 7.3: Dark Mode in Settings Modal

**Steps**:
1. Enable dark mode
2. Open settings modal

**Expected Results**:
- ✅ Settings modal also has dark theme
- ✅ Modal background is dark
- ✅ Text is light-colored
- ✅ Form elements have dark backgrounds

### Test 7.4: Theme Setting vs Quick Toggle

**Steps**:
1. Open settings
2. Set theme to "Light"
3. Save
4. Click moon icon to toggle dark mode
5. Reopen popup
6. Check what mode is active

**Expected Results**:
- ✅ Quick toggle overrides settings temporarily
- ✅ Persistence works for quick toggle
- ✅ Settings preference can still be changed

---

## Search and Filters

### Test 8.1: Search Functionality

**Prerequisites**: Create test data (see Test 4.2)

**Steps**:
1. Open popup with test markers
2. Click in search box
3. Type: "meeting"
4. Observe results

**Expected Results**:
- ✅ Results filter in real-time (as you type)
- ✅ Only messages containing "meeting" show
- ✅ Other messages hidden
- ✅ Footer updates: "Showing 1 of 4"
- ✅ Clear button (✕) appears in search box

### Test 8.2: Search Highlights

**Steps**:
1. Search for "meeting"
2. Check if search term is highlighted

**Expected Results**:
- ✅ Matching text may be highlighted (feature to verify)
- ✅ Results clearly show matched messages

### Test 8.3: Clear Search

**Steps**:
1. With active search
2. Click the **✕ (clear)** button in search box
3. OR: Delete all text manually

**Expected Results**:
- ✅ Search clears
- ✅ All messages return
- ✅ Clear button disappears
- ✅ Footer shows "4 marked messages"

### Test 8.4: No Results State

**Steps**:
1. Search for: "xyznotfound12345"
2. Observe display

**Expected Results**:
- ✅ No message cards show
- ✅ "No results found" state displays
- ✅ Icon: 🔍
- ✅ Message: "No results found"
- ✅ Suggestion: "Try adjusting your search or filters"
- ✅ Footer shows "0 of 4 marked messages"

### Test 8.5: Platform Filter

**Steps**:
1. Clear any search
2. Click "All Platforms" dropdown
3. Select "WhatsApp"

**Expected Results**:
- ✅ Only WhatsApp messages show (🟢 icon)
- ✅ Other platforms hidden
- ✅ Footer updates count
- ✅ Dropdown shows "WhatsApp" as selected

### Test 8.6: Label Filter

**Steps**:
1. Clear filters
2. Click "All Labels" dropdown
3. Select "Urgent"

**Expected Results**:
- ✅ Only messages with "Urgent" label show
- ✅ Other messages hidden
- ✅ Footer updates count

### Test 8.7: Date Filter

**Steps**:
1. Clear filters
2. Click "All Time" dropdown
3. Select "Today"

**Expected Results**:
- ✅ Only messages from today show
- ✅ Older messages hidden

Try other date options:
- ✅ "Last 7 Days" - shows messages from past week
- ✅ "Last 30 Days" - shows messages from past month

### Test 8.8: Combined Filters

**Steps**:
1. Set platform: "WhatsApp"
2. Set label: "Important"
3. Type search: "meeting"

**Expected Results**:
- ✅ Only messages matching ALL criteria show
- ✅ (WhatsApp AND Important label AND contains "meeting")
- ✅ Very specific filtering works
- ✅ Footer accurately reflects filtered count

### Test 8.9: Reset All Filters

**Steps**:
1. With multiple filters active
2. Change all dropdowns back to "All..."
3. Clear search

**Expected Results**:
- ✅ All messages return
- ✅ Full list visible
- ✅ Footer shows total count

---

## Export and Import

### Test 9.1: Export All Data

**Prerequisites**: Have test markers created

**Steps**:
1. Open popup
2. Click "Export Data" button in footer
3. OR: Open settings → Click "Export All Data"

**Expected Results**:
- ✅ File download prompt appears
- ✅ Filename: `chatmarker-export-YYYY-MM-DD.json`
- ✅ File saves to Downloads folder
- ✅ Toast notification: "Data exported"

### Test 9.2: Verify Export File Content

**Steps**:
1. Open the exported JSON file in a text editor
2. Inspect structure

**Expected Results**:
- ✅ Valid JSON format
- ✅ Contains:
  - `version` field
  - `exportedAt` timestamp
  - `markers` object with all markers
  - `reminders` object (empty for now)
  - `settings` object
  - `labels` array
- ✅ All test marker data preserved
- ✅ No sensitive personal data (everything is test data)

### Test 9.3: Clear All Data

**Steps**:
1. Open settings modal
2. Click "Clear All Marks" button (red/danger)
3. Confirm first prompt
4. Confirm second prompt ("Really delete everything?")

**Expected Results**:
- ✅ Two confirmation dialogs appear
- ✅ After confirming both: Toast "All marks cleared"
- ✅ Popup shows empty state
- ✅ Footer shows "No marked messages"
- ✅ All markers deleted from storage

**Verify in background console**:
```javascript
const markers = await getMarkersArray();
console.log('Markers after clear:', markers); // Should be []
```

### Test 9.4: Import Data

**Steps**:
1. With empty markers (just cleared)
2. Open settings modal
3. Click "Import Data" button
4. File picker opens
5. Select the exported JSON file from Test 9.1
6. Choose the file

**Expected Results**:
- ✅ File picker opens
- ✅ After selecting file: Toast "Data imported"
- ✅ Settings modal closes
- ✅ Popup refreshes showing restored markers
- ✅ All markers restored with correct data
- ✅ Labels, settings also restored

### Test 9.5: Import Invalid File

**Steps**:
1. Create a text file with invalid JSON: `invalid.json`
2. Try to import it

**Expected Results**:
- ✅ Error toast: "Error importing data"
- ✅ No data corrupted
- ✅ Console shows error message
- ✅ Graceful failure (no crash)

---

## Content Scripts

### Test 10.1: WhatsApp Web Script Injection

**Steps**:
1. Open new tab
2. Navigate to https://web.whatsapp.com
3. Open DevTools (F12)
4. Check Console tab

**Expected Results**:
- ✅ Message appears: `[ChatMarker] WhatsApp content script loaded`
- ✅ No errors
- ✅ Script injects on page load

**Note**: Marking functionality not yet implemented (Day 2)

### Test 10.2: Messenger Script Injection

**Steps**:
1. Navigate to https://www.messenger.com
2. Open DevTools Console

**Expected Results**:
- ✅ Message: `[ChatMarker] Messenger content script loaded`
- ✅ No errors

### Test 10.3: Instagram Script Injection

**Steps**:
1. Navigate to https://www.instagram.com
2. Open DevTools Console

**Expected Results**:
- ✅ Message: `[ChatMarker] Instagram content script loaded`
- ✅ No errors

### Test 10.4: LinkedIn Script Injection

**Steps**:
1. Navigate to https://www.linkedin.com/messaging
2. Open DevTools Console

**Expected Results**:
- ✅ Message: `[ChatMarker] LinkedIn content script loaded`
- ✅ No errors

### Test 10.5: Script Isolation

**Steps**:
1. On any platform (e.g., WhatsApp Web)
2. In DevTools Console, try:

```javascript
// Try to access ChatMarker functions
typeof saveMarker
```

**Expected Results**:
- ✅ Returns `undefined`
- ✅ Content scripts are isolated from page context
- ✅ Page's JavaScript cannot access extension functions (security)

---

## Troubleshooting

### Extension Won't Load

**Symptoms**: Error on chrome://extensions/

**Solutions**:
1. Check `manifest.json` for syntax errors
   ```bash
   python3 -m json.tool manifest.json
   ```
2. Verify all files referenced in manifest exist
3. Try removing and re-adding extension
4. Check Chrome console for error details

### Popup Doesn't Open

**Symptoms**: Clicking icon does nothing

**Solutions**:
1. Check for JavaScript errors:
   - Right-click extension icon → Inspect popup
   - Check Console tab
2. Verify `popup/popup.html` path is correct
3. Reload extension
4. Check if service worker is active

### Service Worker Inactive

**Symptoms**: Shows "Inactive" on extension page

**Solutions**:
1. Click the "service worker" text - it activates
2. Reload extension
3. Check for errors in service worker console

### Console Shows "saveMarker is not defined"

**Symptoms**: Error when trying to use storage functions

**Solutions**:
1. **In background console**: Check if `importScripts('utils/storage.js')` is present in background.js
2. **In popup console**: Check if `<script src="../utils/storage.js">` loads before popup.js
3. Reload extension

### Dark Mode Not Persisting

**Symptoms**: Reverts to light mode on popup reopen

**Solutions**:
1. Check browser storage:
   ```javascript
   const settings = await getSettings();
   console.log(settings.theme);
   ```
2. Ensure `updateSettings()` is called when toggling
3. Check for errors in popup console

### Data Not Persisting

**Symptoms**: Markers disappear after closing popup

**Solutions**:
1. Verify Chrome storage permissions in manifest
2. Check storage quota:
   ```javascript
   const stats = await getStorageStats();
   console.log('Bytes in use:', stats.bytesInUse);
   ```
3. Look for errors when saving
4. Ensure using `chrome.storage.local` (not sessionStorage)

### Filters Not Working

**Symptoms**: Selecting filter shows wrong results

**Solutions**:
1. Open popup console (right-click → Inspect)
2. Check for JavaScript errors in `popup.js`
3. Verify test data has correct field names
4. Try clearing filters and reapplying

---

## Test Data Cleanup

After testing, clean up test data:

**Option 1: Use UI**
1. Open settings
2. Click "Clear All Marks"
3. Confirm both prompts

**Option 2: Use Console**
```javascript
// In background service worker console
await clearAllMarkers();
console.log('✅ All test data cleared');
```

**Verify Clean State**:
```javascript
const stats = await getStorageStats();
console.log('Marker count:', stats.markerCount); // Should be 0
```

---

## Testing Checklist Summary

### Day 1 Features (Foundation)

**Core Functionality**:
- [ ] Extension loads without errors
- [ ] Service worker active and initialized
- [ ] Storage system operational (CRUD operations)
- [ ] Message ID generation works

**Popup UI**:
- [ ] Popup opens with correct dimensions
- [ ] Empty state displays properly
- [ ] Message cards display with test data
- [ ] Card hover states work
- [ ] All icons and labels render correctly

**Settings**:
- [ ] Settings modal opens/closes
- [ ] Theme selection works
- [ ] Settings persist
- [ ] Dark mode toggle functional

**Note Editor**:
- [ ] Note modal opens/closes
- [ ] Can add new notes
- [ ] Can edit existing notes
- [ ] Character limit enforced

**Search & Filters**:
- [ ] Real-time search works
- [ ] Platform filter works
- [ ] Label filter works
- [ ] Date filter works
- [ ] Combined filters work
- [ ] No results state shows

**Export/Import**:
- [ ] Export creates valid JSON file
- [ ] Clear all data works (with confirmations)
- [ ] Import restores data
- [ ] Invalid import handled gracefully

**Content Scripts**:
- [ ] WhatsApp script loads
- [ ] Messenger script loads
- [ ] Instagram script loads
- [ ] LinkedIn script loads
- [ ] Scripts are isolated

### Total Tests: 60+ Individual Test Cases

---

## Platform Integration Testing

### Instagram Integration Tests

#### Test 11.1: Instagram Chat Detection
**Steps**:
1. Navigate to https://www.instagram.com/direct/inbox/
2. Log in to Instagram (if needed)
3. Open DevTools Console
4. Observe chat list loads

**Expected Results**:
- ✅ Content script loads: `[ChatMarker] Instagram content script initialized`
- ✅ No errors in console
- ✅ Chat items are detected

#### Test 11.2: Mark Instagram Chat from Chat List
**Steps**:
1. On Instagram DM inbox
2. Right-click on **any chat in the chat list**
3. Select **ChatMarker → ⭐ Mark/Unmark Chat**

**Expected Results**:
- ✅ Context menu appears with ChatMarker submenu
- ✅ Toast notification: "Chat marked successfully"
- ✅ Star indicator (⭐) appears as floating overlay (top-right of chat item)
- ✅ Console shows: `[ChatMarker] Chat marked successfully`

#### Test 11.3: Instagram Chat Name Extraction
**Steps**:
1. Right-click on a chat with known contact name
2. Mark the chat
3. Open ChatMarker sidebar

**Expected Results**:
- ✅ Chat appears in sidebar with correct name
- ✅ Platform shows as "Instagram"
- ✅ Chat name matches the contact's display name

#### Test 11.4: Instagram Indicator Persistence
**Steps**:
1. Mark a chat on Instagram
2. Verify star appears
3. Scroll away from chat
4. Scroll back to marked chat

**Expected Results**:
- ✅ Star indicator still visible
- ✅ Position remains top-right overlay
- ✅ No duplicate indicators

#### Test 11.5: Instagram Labels
**Steps**:
1. Right-click on marked Instagram chat
2. Select **ChatMarker → 🏷️ Add Label → 🔴 Urgent**
3. Verify modal appears
4. Select "Urgent" label
5. Save

**Expected Results**:
- ✅ Label modal opens with dark theme
- ✅ Label is saved
- ✅ Toast notification appears
- ✅ Label appears in sidebar chat card

#### Test 11.6: Instagram Notes
**Steps**:
1. Right-click on Instagram chat
2. Select **ChatMarker → 📝 Add/Edit Note**
3. Type note: "Follow up about collaboration"
4. Click "Save Note"

**Expected Results**:
- ✅ Note modal opens with dark theme
- ✅ Note is saved successfully
- ✅ Character counter shows (0/500)
- ✅ Note appears in sidebar
- ✅ Note persists after page reload

#### Test 11.7: Instagram Reminders
**Steps**:
1. Right-click on Instagram chat
2. Select **ChatMarker → ⏰ Set/Edit Reminder**
3. Click "1 Hour" quick option
4. Click "Set Reminder"

**Expected Results**:
- ✅ Reminder modal opens
- ✅ Reminder is created
- ✅ Toast notification appears
- ✅ Reminder appears in sidebar
- ✅ Badge shows reminder count

#### Test 11.8: Instagram Context Menu (All Contexts)
**Steps**:
1. Right-click on different areas:
   - Chat list item
   - Chat list background
   - Empty space in DM page

**Expected Results**:
- ✅ Context menu appears in all locations
- ✅ All submenu items accessible
- ✅ No duplicate "ChatMarker" entries

#### Test 11.9: Instagram Page Reload Persistence
**Steps**:
1. Mark several Instagram chats
2. Add labels and notes
3. Hard reload page (Ctrl+Shift+R)

**Expected Results**:
- ✅ All marks persist
- ✅ Indicators reappear after page loads
- ✅ Labels and notes intact in sidebar
- ✅ No errors in console

#### Test 11.10: Instagram Sidebar Navigation
**Steps**:
1. Mark Instagram chat
2. Open ChatMarker sidebar
3. Click on Instagram chat card

**Expected Results**:
- ✅ Instagram tab opens/focuses
- ✅ Navigates to /direct/inbox/
- ✅ Correct chat is highlighted (if possible)

---

## Next Testing Phase

After LinkedIn integration is implemented, test:
- Message detection and marking
- Mark icon injection
- Right-click context menu
- Mark/unmark toggle
- Mark persistence across page reloads
- Navigation from popup to message
- Label and note UI

---

**Testing Version**: 1.0 (4 Platforms Implemented)
**Last Updated**: 2025-11-02
**Status**: WhatsApp, Reddit, Facebook, Instagram Integration Complete ✅
