# Content Scripts

Platform-specific integration scripts that run on messaging platform web pages.

---

## Overview

Each content script is responsible for:
1. Detecting the current chat context
2. Extracting chat ID and name
3. Injecting visual indicators (⭐) in chat lists
4. Handling context menu actions
5. Showing inline modals (notes, labels, reminders)
6. Displaying toast notifications

---

## Implemented Scripts

### ✅ whatsapp.js (822 lines)
**Platform**: WhatsApp Web (`web.whatsapp.com`)

**Features**:
- Chat detection via `data-testid` attributes
- Chat list indicators with MutationObserver
- Context menu integration
- Inline modals for notes/labels/reminders
- Toast notifications
- Dark mode compatibility

**Key Selectors**:
- Chat header: `[data-testid="conversation-header"]`
- Chat list: `#pane-side`
- Chat items: `div[role="listitem"]`

**Challenges**:
- Dynamic webpack class names
- Frequent DOM updates
- Solution: Use stable data attributes and MutationObserver

---

### ✅ reddit.js (1,153 lines)
**Platform**: Reddit Chat (`reddit.com`)

**Features**:
- Shadow DOM traversal
- Chat detection with Lit framework compatibility
- Overlay indicators (Lit-proof positioning)
- Context menu integration
- Inline modals
- Toast notifications
- Full dark mode support

**Key Selectors**:
- Chat header: `div[title][aria-label*="Direct chat"]`
- Chat list: `a[aria-label*="Direct chat with"]`

**Challenges**:
1. **Shadow DOM** - Standard `querySelector` doesn't work
   - Solution: Recursive `findInShadowDOM()` helper
2. **Lit Framework** - Re-renders remove inline elements
   - Solution: Absolute positioned overlays on parent elements

**Technical Achievement**:
```javascript
// Overlay positioning prevents Lit from removing indicators
function addChatListIndicator(listItem) {
  listItem.style.position = 'relative';
  const indicator = document.createElement('span');
  indicator.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
  `;
  listItem.appendChild(indicator); // On <a>, not in Lit template
}
```

---

## Placeholder Scripts

These are minimal placeholders awaiting implementation:

- ⏳ **messenger.js** - Facebook Messenger integration
- ⏳ **instagram.js** - Instagram DM integration
- ⏳ **linkedin.js** - LinkedIn messaging integration

Each is 8 lines with just a console.log.

---

## Architecture Pattern

All content scripts follow this structure:

### 1. Initialization
```javascript
console.log('[ChatMarker] Platform content script loaded');

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  detectPlatform();
  setupObservers();
  loadExistingMarkers();
}
```

### 2. Chat Detection
```javascript
function getCurrentChatInfo() {
  const chatId = extractChatId();
  const chatName = extractChatName();
  return { chatId, chatName };
}
```

### 3. Visual Indicators
```javascript
function setupChatListObserver() {
  const chatList = findChatListContainer();
  const observer = new MutationObserver(() => {
    updateChatListIndicators();
  });
  observer.observe(chatList, { childList: true, subtree: true });
}
```

### 4. Message Passing
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'markChat':
      markCurrentChat();
      break;
    // ...
  }
});
```

### 5. UI Components
```javascript
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'chatmarker-toast';
  // ...
}

function showModal(type, data) {
  const modal = document.createElement('div');
  modal.className = 'chatmarker-inline-modal';
  // ...
}
```

---

## Communication

Content scripts **CANNOT** access `storage.js` directly. All storage operations must go through the background worker:

```javascript
// ❌ Wrong - storage.js not available in content scripts
const marker = await getMarker(chatId);

// ✅ Correct - message passing
chrome.runtime.sendMessage({
  action: 'getMarker',
  chatId: chatId
}, (response) => {
  const marker = response.data;
});
```

---

## Platform-Specific CSS

Each content script loads two stylesheets:
1. `styles/common.css` - Shared modal/toast styles
2. `styles/{platform}.css` - Platform-specific theming

Example from `manifest.json`:
```json
{
  "matches": ["https://web.whatsapp.com/*"],
  "js": ["content-scripts/whatsapp.js"],
  "css": ["styles/common.css", "styles/whatsapp.css"]
}
```

---

## Development Guidelines

### Adding a New Platform

1. **Create script file**: `content-scripts/newplatform.js`
2. **Add to manifest**: Update `content_scripts` and `host_permissions`
3. **Research DOM structure**: Find stable selectors
4. **Implement detection**: Write `getCurrentChatInfo()`
5. **Add indicators**: Implement `addChatListIndicator()`
6. **Handle actions**: Listen for context menu messages
7. **Create styles**: Add `styles/newplatform.css`
8. **Test thoroughly**: All features on new platform

### Testing Content Scripts

1. Load extension in Chrome
2. Open platform page (e.g., WhatsApp Web)
3. Open DevTools (F12)
4. Check console for `[ChatMarker]` logs
5. Right-click → ChatMarker menu should appear
6. Test all operations:
   - Mark/unmark chat
   - Add labels
   - Add note
   - Set reminder
   - Check indicators in chat list

### Debugging

**Common Issues**:

1. **Script not loading**
   - Check `matches` pattern in manifest
   - Verify `host_permissions`
   - Hard refresh page (Ctrl+Shift+R)

2. **Selectors not working**
   - Inspect DOM carefully
   - Platform may have updated structure
   - Try multiple fallback selectors

3. **Indicators not appearing**
   - Check console for errors
   - Verify observer is running
   - Check if markers exist in storage
   - For Reddit: Ensure overlay positioning

4. **Modals not showing**
   - Check z-index (must be > platform's)
   - Verify CSS is loaded
   - Check for conflicting styles

---

## Performance Considerations

### Throttle MutationObserver

```javascript
let updateTimeout;
const observer = new MutationObserver(() => {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    updateChatListIndicators();
  }, 500); // Batch updates
});
```

### Efficient Marker Lookup

```javascript
// ❌ Bad: O(n) for each chat item
chatItems.forEach(item => {
  const chatId = extractChatId(item);
  markers.forEach(marker => {
    if (marker.chatId === chatId) addIndicator(item);
  });
});

// ✅ Good: O(n) total with Map
const markerMap = new Map(markers.map(m => [m.chatId, m]));
chatItems.forEach(item => {
  const chatId = extractChatId(item);
  if (markerMap.has(chatId)) addIndicator(item);
});
```

---

## Security

- **No eval()** - Manifest V3 prohibits it
- **Sanitize user input** - Use `textContent`, not `innerHTML`
- **No inline scripts** - CSP violations
- **Isolated context** - Can't access page JS variables

---

## File Sizes

| File | Lines | Bytes | Status |
|------|-------|-------|--------|
| whatsapp.js | 822 | ~35 KB | ✅ Complete |
| reddit.js | 1,153 | ~48 KB | ✅ Complete |
| messenger.js | 8 | ~200 B | ⏳ Placeholder |
| instagram.js | 8 | ~200 B | ⏳ Placeholder |
| linkedin.js | 8 | ~200 B | ⏳ Placeholder |

---

## Next Steps

1. Implement Messenger integration
2. Implement Instagram integration
3. Implement LinkedIn integration
4. Add unit tests
5. Refactor common code into shared utilities

---

*Last Updated: 2025-11-01*
