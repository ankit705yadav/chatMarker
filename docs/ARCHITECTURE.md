# ChatMarker - Architecture Documentation

**Version**: 1.0.0
**Last Updated**: 2025-11-01

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Component Breakdown](#component-breakdown)
4. [Data Flow](#data-flow)
5. [Storage System](#storage-system)
6. [Message Passing](#message-passing)
7. [Content Script Architecture](#content-script-architecture)
8. [Platform-Specific Implementations](#platform-specific-implementations)
9. [UI Components](#ui-components)
10. [Security Considerations](#security-considerations)

---

## Overview

ChatMarker is a Chrome Extension built on **Manifest V3** that allows users to mark, label, and set reminders for chat conversations across messaging platforms. The architecture follows Chrome Extension best practices with isolated contexts communicating via message passing.

### Core Principles

1. **Privacy-First** - All data stored locally, no external communication
2. **Platform-Agnostic** - Modular content scripts for each platform
3. **Performance** - Minimal DOM manipulation, efficient storage access
4. **User Experience** - Instant feedback, smooth animations, native feel

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Browser                            │
│                                                                  │
│  ┌────────────────┐         ┌──────────────────┐                │
│  │   Background   │◄───────►│  Side Panel UI   │                │
│  │ Service Worker │ Message │   (Sidebar)      │                │
│  │                │ Passing │                  │                │
│  │ - Storage ops  │────────►│ - Display marks  │                │
│  │ - Reminders    │         │ - User input     │                │
│  │ - Navigation   │         │ - Search/Filter  │                │
│  └────────┬───────┘         └──────────────────┘                │
│           │                                                      │
│           │ Message Passing                                      │
│           │                                                      │
│  ┌────────▼──────────────────────────────────────────┐          │
│  │           Content Scripts (Per Tab)                │          │
│  │                                                    │          │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐     │          │
│  │  │ WhatsApp  │  │  Reddit   │  │ Messenger │     │          │
│  │  │  Script   │  │  Script   │  │  Script   │ ... │          │
│  │  │           │  │           │  │           │     │          │
│  │  │ -Detect   │  │ -Shadow   │  │ -Detect   │     │          │
│  │  │ -Extract  │  │  DOM      │  │ -Extract  │     │          │
│  │  │ -Inject   │  │ -Inject   │  │ -Inject   │     │          │
│  │  └───────────┘  └───────────┘  └───────────┘     │          │
│  └────────────────────────────────────────────────────┘          │
│           │                                                      │
│           │ DOM Manipulation                                     │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────┐          │
│  │        Messaging Platform Web Pages                │          │
│  │  (WhatsApp Web, Reddit, Messenger, etc.)           │          │
│  └────────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────┘

         ▲
         │
         ▼
┌────────────────┐
│ Chrome Storage │
│   (Local API)  │
│                │
│ - chatMarkers  │
│ - reminders    │
│ - settings     │
└────────────────┘
```

---

## Component Breakdown

### 1. Background Service Worker (`background.js`)

**Purpose**: Central coordinator for storage, reminders, and inter-component communication

**Key Responsibilities**:
- Load storage utility functions via `importScripts()`
- Handle message passing from content scripts and sidebar
- Manage context menus (right-click menus)
- Schedule and trigger reminders via Alarms API
- Send browser notifications
- Navigate to chats when user clicks notification or sidebar card

**File**: `/background.js` (17,070 bytes)

**Key Functions**:
```javascript
// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'saveMarker':
    case 'deleteMarker':
    case 'getAllChatMarkers':
    case 'setReminder':
    // ... handle all actions
  }
});

// Context menu handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Handle mark/unmark, labels, notes, reminders
});

// Alarm handler (for reminders)
chrome.alarms.onAlarm.addListener((alarm) => {
  // Trigger reminder notification
});
```

---

### 2. Side Panel UI (`popup/`)

**Purpose**: Dashboard interface for viewing and managing all marked chats

**Components**:
- `popup.html` - Structure and layout
- `popup.css` - Styles with CSS variables for theming
- `popup.js` - Logic, search, filters, modals

**File Sizes**:
- `popup.html`: 332 lines
- `popup.css`: ~800 lines (estimated)
- `popup.js`: 1,870 lines

**Key Features**:
- Platform tabs (All, WhatsApp, Reddit)
- Live search with debouncing
- Label and date filters
- Statistics display
- Modal dialogs (settings, stats, notes, reminders)
- Dark mode toggle
- Export/import functionality

**Data Flow**:
1. On load, fetch all markers from background
2. Display in filterable list
3. User interactions send messages to background
4. Listen for storage changes to update UI

---

### 3. Content Scripts

**Purpose**: Platform-specific integration - detect chats, inject UI, handle user actions

**Per-Platform Files**:

| Platform | File | Size | Status |
|----------|------|------|--------|
| WhatsApp | `content-scripts/whatsapp.js` | 822 lines | ✅ Implemented |
| Reddit | `content-scripts/reddit.js` | 1,153 lines | ✅ Implemented |
| Messenger | `content-scripts/messenger.js` | 8 lines | ⏳ Placeholder |
| Instagram | `content-scripts/instagram.js` | 8 lines | ⏳ Placeholder |
| LinkedIn | `content-scripts/linkedin.js` | 8 lines | ⏳ Placeholder |

**Responsibilities**:
1. Detect current chat context
2. Extract chat ID and name
3. Inject visual indicators in chat list
4. Handle context menu actions
5. Show inline modals for notes/labels/reminders
6. Display toast notifications

---

### 4. Storage Utility (`utils/storage.js`)

**Purpose**: Abstraction layer over Chrome Storage API

**File**: `/utils/storage.js`

**25+ Functions** including:
- `saveMarker()`, `getMarker()`, `deleteMarker()`
- `getAllMarkers()`, `getMarkersArray()`
- `getChatMarkers()` - Get markers by platform
- `updateMarker()`, `updateMarkerField()`
- `createReminder()`, `deleteReminder()`
- `saveSettings()`, `getSettings()`
- `exportData()`, `importData()`
- `clearAllMarkers()`, `getStorageStats()`

**Why separate file?**
- Reused by background worker (via `importScripts()`)
- Reused by sidebar (via `<script>` tag)
- NOT available in content scripts (they use message passing)

---

### 5. Platform-Specific Styles

**Files**: `styles/common.css` + per-platform CSS

| File | Purpose | Size |
|------|---------|------|
| `common.css` | Shared modal/toast styles | ~400 lines |
| `whatsapp.css` | WhatsApp-specific theming | ~100 lines |
| `reddit.css` | Reddit + Lit framework compatibility | 234 lines |

**Key Patterns**:
- CSS variables for theming
- High specificity to override platform styles
- Dark mode via body class selectors
- Animations (fadeIn, slideIn, etc.)

---

## Data Flow

### Example: Marking a Chat

```
1. User right-clicks on WhatsApp Web page
   ↓
2. Chrome shows context menu (created by background.js)
   ↓
3. User clicks "⭐ Mark/Unmark Chat"
   ↓
4. background.js contextMenu listener fires
   ↓
5. background.js sends message to content script: "getChatInfo"
   ↓
6. whatsapp.js extracts chat ID and name from DOM
   ↓
7. whatsapp.js sends message to background: "saveMarker"
   ↓
8. background.js calls saveMarker() from storage.js
   ↓
9. Chrome Storage API saves data
   ↓
10. background.js sends success response back
    ↓
11. whatsapp.js shows toast: "Chat marked!"
    ↓
12. whatsapp.js adds ⭐ indicator to chat list
    ↓
13. Sidebar (if open) receives storage change event
    ↓
14. Sidebar refreshes to show new marked chat
```

### Example: Viewing Dashboard

```
1. User clicks extension icon
   ↓
2. Chrome opens side panel (popup.html)
   ↓
3. popup.js loads
   ↓
4. popup.js sends message to background: "getAllChatMarkers"
   ↓
5. background.js calls getAllMarkers() from storage.js
   ↓
6. Chrome Storage API returns data
   ↓
7. background.js sends markers array to popup
   ↓
8. popup.js renders chat cards
   ↓
9. User types in search box
   ↓
10. popup.js filters markers client-side (no storage call)
    ↓
11. Re-render filtered results
```

---

## Storage System

### Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `chatMarkers` | Object | All marked chats, keyed by messageId |
| `reminders` | Object | All reminders, keyed by reminderId |
| `settings` | Object | User preferences |

### Chat Marker Object

```javascript
{
  messageId: 'whatsapp:chat123456:timestamp',
  platform: 'whatsapp' | 'reddit' | 'messenger' | 'instagram' | 'linkedin',
  chatId: 'unique_chat_identifier',
  chatName: 'Contact or Group Name',
  labels: ['urgent', 'important'],  // Array of label strings
  notes: 'User note text...',        // Optional
  timestamp: 1234567890000,          // When chat was marked
  createdAt: 1234567890000,
  updatedAt: 1234567890000
}
```

### Message ID Format

**Pattern**: `platform:chatId:timestamp`

**Examples**:
- `whatsapp:123456789@c.us:1698765432000`
- `reddit:reddit_chat_username:1698765432000`

**Why this format?**
- Platforms don't provide stable IDs
- Chat ID alone isn't unique (same chat marked multiple times)
- Timestamp adds uniqueness
- Platform prefix enables filtering

---

## Message Passing

Chrome extensions use **message passing** for inter-component communication.

### Content Script → Background

```javascript
// From whatsapp.js
chrome.runtime.sendMessage({
  action: 'saveMarker',
  data: {
    messageId: 'whatsapp:12345:1698765432000',
    platform: 'whatsapp',
    chatId: '12345',
    chatName: 'John Doe',
    // ... rest of marker
  }
}, (response) => {
  if (response.success) {
    showToast('Chat marked!');
  }
});
```

### Sidebar → Background

```javascript
// From popup.js
const response = await chrome.runtime.sendMessage({
  action: 'getAllChatMarkers'
});

if (response.success) {
  const markers = response.data;
  displayMarkers(markers);
}
```

### Background → Content Script

```javascript
// From background.js
chrome.tabs.sendMessage(tabId, {
  action: 'updateIndicators'
});
```

**Important**: Content scripts **CANNOT** access `storage.js` functions directly. All storage operations must go through background worker via message passing.

---

## Content Script Architecture

Every platform content script follows this pattern:

### 1. Initialization

```javascript
console.log('[ChatMarker] WhatsApp content script loaded');

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  setupObservers();
  setupContextMenus();
  loadExistingMarkers();
}
```

### 2. Chat Detection

```javascript
function getCurrentChatId() {
  // Platform-specific DOM selectors
  const headerElement = document.querySelector('[data-testid="conversation-header"]');
  if (!headerElement) return null;

  // Extract chat ID from URL, DOM attributes, or data attributes
  const chatId = extractChatId(headerElement);
  const chatName = extractChatName(headerElement);

  return { chatId, chatName };
}
```

### 3. Visual Indicators

```javascript
function setupChatListObserver() {
  const chatList = document.querySelector('#pane-side');

  const observer = new MutationObserver(() => {
    updateChatListIndicators();
  });

  observer.observe(chatList, {
    childList: true,
    subtree: true
  });
}

function updateChatListIndicators() {
  // Get all marked chats from storage
  // Find all chat list items in DOM
  // Add ⭐ indicator to marked chats
}
```

### 4. User Interactions

```javascript
// Listen for context menu actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'markChat':
      markCurrentChat();
      break;
    case 'showLabelsModal':
      showLabelsModal();
      break;
    // ... etc
  }
});
```

### 5. Inline Modals

```javascript
function showLabelsModal(currentMarker) {
  // Create modal DOM
  const modal = document.createElement('div');
  modal.className = 'chatmarker-inline-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Add Labels</h2>
      <label>
        <input type="checkbox" value="urgent" ${currentMarker.labels.includes('urgent') ? 'checked' : ''}>
        Urgent
      </label>
      <!-- ... more labels -->
      <button class="save-btn">Save</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle save
  modal.querySelector('.save-btn').addEventListener('click', () => {
    const selectedLabels = getSelectedLabels();
    updateMarkerLabels(selectedLabels);
    modal.remove();
  });
}
```

---

## Platform-Specific Implementations

### WhatsApp Web

**DOM Structure**:
- Chat header: `[data-testid="conversation-header"]`
- Chat list: `#pane-side`
- Chat list items: `div[role="listitem"]`

**Challenges**:
- Dynamic class names (webpack hashing)
- Frequent DOM updates
- Need to use data-testid attributes

**Solution**:
- Use stable data-testid selectors
- MutationObserver for chat list changes
- Store markers by chat ID, not DOM reference

---

### Reddit Chat

**DOM Structure**:
- Uses **Shadow DOM** with Lit framework
- Chat header: `div[title][aria-label*="Direct chat"]`
- Chat list: `a[aria-label*="Direct chat with"]`

**Challenges**:
1. **Shadow DOM** - `querySelector` doesn't work across shadow roots
2. **Lit Framework** - Re-renders remove inline elements
3. **Dynamic content** - Chat list constantly updates

**Solutions**:

#### 1. Shadow DOM Traversal

```javascript
function findInShadowDOM(selector, root = document) {
  // Try direct query first
  let result = root.querySelector(selector);
  if (result) return result;

  // Recursively search shadow roots
  const allElements = root.querySelectorAll('*');
  for (const element of allElements) {
    if (element.shadowRoot) {
      result = findInShadowDOM(selector, element.shadowRoot);
      if (result) return result;
    }
  }
  return null;
}
```

#### 2. Overlay Indicators (Lit-proof)

```javascript
function addChatListIndicator(listItem, chatMarker) {
  // Position indicator as absolute overlay
  // NOT inside Lit-managed elements
  listItem.style.position = 'relative';

  const indicator = document.createElement('span');
  indicator.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
  `;
  indicator.textContent = '⭐';

  // Append to <a> element, not inside Lit template
  listItem.appendChild(indicator);
}
```

This prevents Lit from removing our indicators during re-renders.

---

## UI Components

### Modal System

All modals follow this pattern:

```javascript
function createModal(title, content, onSave) {
  const modal = document.createElement('div');
  modal.className = 'chatmarker-inline-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-dialog">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="close-btn">✕</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      <div class="modal-footer">
        <button class="cancel-btn">Cancel</button>
        <button class="save-btn">Save</button>
      </div>
    </div>
  `;

  // Event listeners
  modal.querySelector('.close-btn').onclick = () => modal.remove();
  modal.querySelector('.cancel-btn').onclick = () => modal.remove();
  modal.querySelector('.save-btn').onclick = () => {
    onSave();
    modal.remove();
  };

  // ESC key support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.remove();
  });

  return modal;
}
```

### Toast Notifications

```javascript
function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'chatmarker-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1F2937;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
```

---

## Security Considerations

### Content Security Policy

Manifest V3 enforces strict CSP:
- No inline scripts
- No `eval()` or `new Function()`
- No remote script loading

**Our Approach**:
- All scripts are local files
- Dynamic content via `createElement` and `textContent` (not `innerHTML` for user data)
- No external API calls

### Data Privacy

- **No network requests** - Everything is local
- **No analytics** - No tracking code
- **No third-party scripts** - Pure vanilla JS
- **User consent** - Export data anytime

### Input Sanitization

User notes and labels are sanitized:

```javascript
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input; // Auto-escapes HTML
  return div.innerHTML;
}
```

### Permissions

Manifest declares minimal permissions:
- `storage` - For Chrome Storage API
- `notifications` - For reminders
- `alarms` - For scheduling
- `activeTab` - For current tab access
- `contextMenus` - For right-click menus
- `sidePanel` - For sidebar UI
- `scripting` - For content scripts
- `host_permissions` - Only for supported messaging platforms

**No broad permissions** like `<all_urls>` or `webRequest`.

---

## Performance Optimizations

### 1. Debouncing Search

```javascript
let searchTimeout;
function handleSearch(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    performSearch(query);
  }, 300); // Wait 300ms after user stops typing
}
```

### 2. MutationObserver Throttling

```javascript
let updateTimeout;
const observer = new MutationObserver(() => {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    updateIndicators();
  }, 500); // Batch DOM updates
});
```

### 3. Efficient Storage Access

```javascript
// ❌ Bad: Multiple storage reads
for (const chatId of chatIds) {
  const marker = await getMarker(chatId);
  // ...
}

// ✅ Good: Single bulk read
const allMarkers = await getAllMarkers();
const neededMarkers = chatIds.map(id => allMarkers[id]);
```

### 4. DOM Batching

```javascript
// ❌ Bad: Trigger reflow for each indicator
chatItems.forEach(item => {
  item.appendChild(createIndicator());
});

// ✅ Good: Build document fragment first
const fragment = document.createDocumentFragment();
chatItems.forEach(item => {
  const indicator = createIndicator();
  fragment.appendChild(indicator);
});
document.body.appendChild(fragment);
```

---

## Future Architecture Improvements

1. **TypeScript Migration** - Type safety for large codebase
2. **Module System** - Convert to ES modules instead of script tags
3. **Unit Testing** - Jest for storage utils and pure functions
4. **Build System** - Webpack/Rollup for bundling and minification
5. **State Management** - Centralized state (like Redux) for sidebar
6. **Web Components** - Encapsulate modals as custom elements
7. **Service Worker Optimization** - Better lifecycle management
8. **Lazy Loading** - Load content scripts only when needed

---

## Debugging Guide

### Common Issues

**1. "Function not defined" in content script**
- ❌ Content scripts can't access storage.js functions directly
- ✅ Use message passing to background worker

**2. Indicators disappear on Reddit**
- ❌ Placing indicators inside Lit-managed elements
- ✅ Use absolute positioning on parent `<a>` element

**3. Storage changes not reflecting in sidebar**
- ❌ Not listening for storage change events
- ✅ Add `chrome.storage.onChanged` listener

**4. Service worker shows "inactive"**
- ✅ This is normal - service workers sleep when idle
- ✅ Click "service worker" link to activate for debugging

### Developer Tools

1. **Background Console**: `chrome://extensions/` → Service worker
2. **Sidebar Console**: Right-click sidebar → Inspect
3. **Content Script Console**: F12 on messaging platform page
4. **Storage Inspector**: DevTools → Application → Storage → Extensions

---

*Last Updated: 2025-11-01*
*Version: 1.0.0*
