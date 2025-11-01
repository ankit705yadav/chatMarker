# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Reference

**Project**: ChatMarker - Chrome Extension (Manifest V3) for marking messages across WhatsApp, Messenger, Instagram, LinkedIn
**Current Status**: Day 1 Complete - Foundation ready, WhatsApp integration pending
**Architecture**: Three isolated contexts (Background Worker, Sidebar UI, Content Scripts)
**Key Constraint**: Content scripts CANNOT access storage directly - must use message passing

---

## Getting Started Immediately

### 1. Load Extension
```bash
# chrome://extensions/ → Enable Developer Mode → Load Unpacked → Select chatMarker/
```

### 2. Open Developer Consoles
- **Background**: chrome://extensions/ → Click "service worker" under ChatMarker
- **Sidebar**: Click extension icon → Right-click sidebar → Inspect
- **Content Script**: Open WhatsApp Web → F12 → Console tab

### 3. Create Test Data (Background Console)
```javascript
await saveMarker({
  messageId: 'whatsapp:test1:' + Date.now(),
  platform: 'whatsapp',
  chatId: 'chat123',
  chatName: 'John Doe',
  sender: 'John Doe',
  messageText: 'Test message',
  labels: ['important'],
  timestamp: Date.now()
});

// View all: await getMarkersArray()
// Clean up: await clearAllMarkers()
```

### 4. Verify Setup
- Background console shows: `[ChatMarker] Background service worker loaded`
- Sidebar opens when clicking extension icon
- WhatsApp Web console shows: `[ChatMarker] WhatsApp content script loaded`

---

## Critical Architecture Concepts

### The Three-Context System

ChatMarker runs in **three completely isolated JavaScript environments**:

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Background    │◄────────┤   Sidebar UI     │         │ Content Scripts │
│  Service Worker │ Message │   (popup/)       │         │  (per platform) │
│                 │ Passing │                  │         │                 │
│ - Storage ops   │────────►│ - Display marks  │         │ - DOM inject    │
│ - Reminders     │         │ - User input     │         │ - Observe page  │
│ - Notifications │         │ - Settings       │         │ - Extract data  │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                                                   │
                                                                   │ Message
                                                                   │ Passing
                                                                   ▼
                                                          ┌─────────────────┐
                                                          │   Background    │
                                                          │ (for storage)   │
                                                          └─────────────────┘
```

**Key Point**: Content scripts CANNOT call storage functions directly. They MUST send messages to background worker.

### Storage Access Patterns

| Context | How to Access Storage | Example |
|---------|----------------------|---------|
| **Background** | Direct (via importScripts) | `const marker = await saveMarker(data)` |
| **Sidebar** | Direct (via script tag) | `const markers = await getMarkersArray()` |
| **Content Scripts** | Message passing only | `chrome.runtime.sendMessage({ action: 'saveMarker', data })` |

---

## Core Data Structures

### Marker Object
```javascript
{
  messageId: 'platform:chatId:sender:timestamp:contentHash',  // Composite unique ID
  platform: 'whatsapp' | 'messenger' | 'instagram' | 'linkedin',
  chatId: string,           // From URL or DOM
  chatName: string,         // Display name
  sender: string,           // Who sent it
  messageText: string,      // Message content
  labels: ['urgent', ...],  // Color-coded tags
  notes: string,            // User's private note
  priority: 'high' | 'medium' | 'low',
  starred: boolean,
  timestamp: number,        // When message was sent
  createdAt: number,        // When marked
  updatedAt: number         // Last modified
}
```

### Message ID Generation Strategy
```javascript
generateMessageId(platform, chatId, messageContent, sender, timestamp)
// Returns: 'whatsapp:chat123:John:1234567890:a3f9c2'
//          └─────┬─────┘ └──┬──┘ └──┬──┘ └────┬────┘ └─┬──┘
//           platform   chatId  sender  timestamp  content hash
```

**Why Composite IDs?**
- Messaging platforms don't provide stable message IDs
- DOM elements get recreated dynamically
- Need to track same message across page reloads
- Hash of first 100 chars ensures uniqueness

### Storage Keys
- `markers` → Object keyed by messageId
- `reminders` → Object keyed by reminderId
- `settings` → User preferences
- `labels` → Custom label definitions

---

## Message Passing Protocols

### Sidebar → Background
```javascript
const response = await chrome.runtime.sendMessage({
  action: 'saveMarker',    // or: 'deleteMarker', 'getAllMarkers', 'updateSettings'
  data: markerObject
});

if (response.success) {
  // Handle success
}
```

### Content Script → Background
```javascript
chrome.runtime.sendMessage({
  action: 'saveMarker',
  data: markerData
}, (response) => {
  if (response.success) {
    console.log('Marker saved:', response.marker);
  }
});
```

### Background Message Handler
Listens for actions in `background.js`:
- `saveMarker`, `deleteMarker`, `getMarker`, `getAllMarkers`
- `createReminder`, `deleteReminder`
- `updateSettings`
- `navigateToMessage`

---

## Content Script Implementation Pattern

### Standard Flow for Platform Integration

**1. Define Selectors** (platform-specific, will change frequently)
```javascript
const SELECTORS = {
  chatContainer: 'div[data-tab="6"]',           // Main chat area
  messageList: 'div.message-list',              // Scrollable message container
  message: 'div[class*="message-"]',            // Individual message element
  messageText: 'span.selectable-text',          // Text content
  sender: 'span[class*="author"]',              // Sender name
  timestamp: 'span[data-testid="msg-time"]'    // Timestamp
};
```

**2. Set Up MutationObserver** (watch for new messages)
```javascript
const observer = new MutationObserver((mutations) => {
  // Detect new messages added to DOM
  // Apply marks to new messages
  // Re-inject icons if page structure changes
});

observer.observe(chatContainer, {
  childList: true,
  subtree: true
});
```

**3. Process Each Message**
```javascript
async function enhanceMessage(messageElement) {
  // 1. Extract data from DOM
  const messageData = extractMessageData(messageElement);

  // 2. Generate unique ID
  const messageId = generateMessageId(
    'whatsapp',
    messageData.chatId,
    messageData.text,
    messageData.sender,
    messageData.timestamp
  );

  // 3. Check if already marked (via background)
  const isMarked = await checkIfMarked(messageId);

  // 4. Inject mark icon
  if (isMarked) {
    injectMarkIcon(messageElement, true);
    injectLabels(messageElement, isMarked.labels);
  } else {
    injectMarkIcon(messageElement, false); // Show on hover
  }

  // 5. Add event listeners
  attachMarkToggleListener(messageElement, messageId);
}
```

**4. Icon Injection**
```javascript
function injectMarkIcon(messageElement, isMarked) {
  const icon = document.createElement('span');
  icon.className = 'chatmarker-icon' + (isMarked ? ' marked' : '');
  icon.textContent = '⭐';
  icon.style.position = 'absolute';
  icon.style.top = '4px';
  icon.style.right = '4px';

  messageElement.style.position = 'relative';
  messageElement.appendChild(icon);
}
```

### Platform Challenges

| Platform | Challenge | Solution |
|----------|-----------|----------|
| **WhatsApp** | Dynamic class names (webpack hashing) | Use data attributes, aria labels where possible |
| **Messenger** | React virtual DOM, frequent rerenders | Re-apply marks on mutations, use stable selectors |
| **Instagram** | Limited web interface vs mobile | Adapt to simpler structure, check DOM carefully |
| **LinkedIn** | Multiple message views (feed vs inbox) | Detect context, use different selectors per view |

---

## File Organization & Load Order

### Background Service Worker
```javascript
// background.js (line 1)
importScripts('utils/storage.js');  // MUST be first
// Now all storage functions available globally
```

### Sidebar HTML
```html
<!-- popup/popup.html -->
<script src="../utils/storage.js"></script>  <!-- MUST load first -->
<script src="popup.js"></script>              <!-- Then UI logic -->
```

### Content Scripts (manifest.json)
```json
{
  "js": ["content-scripts/whatsapp.js"],
  "css": ["styles/common.css", "styles/whatsapp.css"]
  // common.css loads first for base styles
}
```

**Why This Matters**: `storage.js` is NOT a module. It defines global functions. Loading order is critical.

---

## Styling Architecture

### CSS Variable System
All design tokens in `popup/popup.css`:
```css
:root {
  /* Colors */
  --color-primary: #6366F1;
  --color-urgent: #EF4444;
  --color-important: #F59E0B;

  /* Spacing */
  --space-base: 16px;

  /* Radius */
  --radius-md: 6px;
}

body.dark-mode {
  --color-background: #0F172A;
  --color-text-primary: #F1F5F9;
  /* Override light mode values */
}
```

### Label Colors (Consistent Everywhere)
```css
.label-badge.urgent { background: #EF4444; }      /* Red */
.label-badge.important { background: #F59E0B; }   /* Yellow */
.label-badge.completed { background: #10B981; }   /* Green */
.label-badge.followup { background: #3B82F6; }    /* Blue */
.label-badge.question { background: #8B5CF6; }    /* Purple */
```

### Dark Mode Toggle
```javascript
document.body.classList.toggle('dark-mode');
// All CSS variables automatically switch via :root overrides
```

---

## Debugging Guide

### Common Issues & Solutions

**❌ "saveMarker is not defined" in Background Console**
- ✅ Check `importScripts('utils/storage.js')` is at top of background.js
- ✅ Verify file path is correct (no typos)
- ✅ Reload extension completely

**❌ "saveMarker is not defined" in Content Script**
- ✅ You CANNOT call storage functions directly from content scripts
- ✅ Use message passing: `chrome.runtime.sendMessage({ action: 'saveMarker', data })`

**❌ Content Script Not Loading**
- ✅ Check manifest.json `host_permissions` includes the URL
- ✅ Verify `matches` pattern in content_scripts section
- ✅ Hard refresh page (Ctrl+Shift+R)
- ✅ Check DevTools Console for injection errors

**❌ Sidebar Blank/Broken**
- ✅ Right-click in sidebar → Inspect → Check Console tab
- ✅ Verify script load order in popup.html (storage.js first)
- ✅ Check for JavaScript errors

**❌ Marks Not Persisting**
- ✅ Using `chrome.storage.local` (not sessionStorage or localStorage)
- ✅ Check Chrome storage quota: `const stats = await getStorageStats()`
- ✅ Verify async/await used correctly (missing await?)

**❌ Service Worker Shows "Inactive"**
- ✅ This is normal! Service workers sleep when idle
- ✅ Click "service worker" text to activate
- ✅ Using extension (opening sidebar) auto-activates it

### Reload Strategies

| Change Type | How to Reload |
|-------------|---------------|
| JavaScript/HTML | chrome://extensions/ → Reload icon |
| CSS only (sidebar) | Close and reopen sidebar |
| CSS only (content) | Hard refresh page (Ctrl+Shift+R) |
| manifest.json | Reload extension (sometimes remove & re-add) |

---

## Common Pitfalls (Must Read!)

1. **Forgetting async/await**: All storage functions return Promises. Missing `await` causes silent failures.

2. **Wrong message passing pattern**: Content scripts CANNOT access storage. Always go through background worker.

3. **CSS specificity conflicts**: Messaging platforms use high-specificity selectors. Use `!important` or very specific selectors for marks.

4. **Service worker lifecycle**: Background script can restart anytime. Never rely on in-memory state. Always persist to storage.

5. **Sidebar state**: While sidebar persists longer than popups, don't cache data. Always read from storage on load.

6. **MutationObserver performance**: Platforms generate many DOM mutations. Throttle/debounce callbacks to avoid lag:
   ```javascript
   let timeout;
   const observer = new MutationObserver(() => {
     clearTimeout(timeout);
     timeout = setTimeout(processMessages, 300);
   });
   ```

7. **Message ID collisions**: Two messages with identical first 100 chars and same timestamp = same ID. Add additional entropy if needed.

---

## Testing Workflow

### Manual Testing Checklist
1. **Load extension** → chrome://extensions/ → Load unpacked
2. **Create test data** → Background console → Run test marker code
3. **Verify sidebar** → Click icon → See marks display
4. **Test on platform** → Open WhatsApp Web → Check content script loads
5. **Check consoles** → All three contexts should have no errors

### After Implementing Content Scripts
1. Open WhatsApp Web
2. Right-click message → Context menu appears (if implemented)
3. Mark message → Icon appears on message
4. Open sidebar → Marked message appears in list
5. Click in sidebar → Navigates to message
6. Reload page → Marks persist

---

## Project Timeline Reference

- **Day 1** ✅ Foundation (manifest, storage, background, sidebar UI)
- **Day 2** 🔄 WhatsApp Web marking (current focus)
- **Day 3** ⏳ Messenger/Instagram/LinkedIn + labels/notes
- **Day 4** ⏳ Reminders, keyboard shortcuts, UX polish
- **Day 5** ⏳ Testing, bug fixes, advanced features

See **TIMELINE.md** for detailed task breakdown with time estimates.

---

## Additional Documentation

- **FEATURES.md**: 180+ features across 4 categories (Essential, Core, UX, Smart)
- **DESIGN.md**: Visual specs, wireframes, colors, component dimensions
- **README.md**: Installation, testing procedures, troubleshooting
- **TEST.md**: 60+ manual test cases for all implemented features

---

## Design System Cheat Sheet

```
Spacing:   xs(4px)  sm(8px)  md(12px)  base(16px)  lg(24px)  xl(32px)
Radius:    sm(4px)  md(6px)  lg(8px)
Colors:    Primary(#6366F1)  Text-Light(#111827)  Text-Dark(#F1F5F9)
Animation: fast(150ms)  base(250ms)
```

For complete design system, see **DESIGN.md**.

---

## Extension Metadata

**Name**: ChatMarker
**Version**: 1.0.0
**Manifest**: V3
**Permissions**: storage, notifications, alarms, activeTab, scripting, sidePanel
**Min Chrome**: 114+ (for Side Panel API)
**Status**: Active Development (Day 1 Complete)

---

*Last Updated: 2025-10-30*
*Optimized for: Claude Code productivity*
