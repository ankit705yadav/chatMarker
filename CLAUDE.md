# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChatMarker is a Chrome Extension (Manifest V3) that enables marking, labeling, and setting reminders for messages across WhatsApp Web, Facebook Messenger, Instagram, and LinkedIn. This is an active development project following a 5-day implementation timeline.

**Current Status**: Day 1 Complete - Foundation & Core Infrastructure
**Next Phase**: Day 2 - WhatsApp Web integration with full marking functionality

## Development Environment

### Loading the Extension in Chrome

```bash
# Navigate to chrome://extensions/
# Enable "Developer mode"
# Click "Load unpacked" → Select the chatMarker/ directory
```

### Testing Components

**Background Service Worker Console**:
- On chrome://extensions/, click "service worker" link under ChatMarker
- Access to storage functions and extension state
- All storage.js functions available globally (imported via importScripts)

**Sidebar Console**:
- Right-click in the open sidebar → Inspect
- Separate console for popup/popup.js debugging (files kept in popup/ for organization)

**Content Script Console**:
- Open target platform (WhatsApp Web, Messenger, etc.)
- F12 DevTools → Check for content script load messages
- Each platform has isolated console context

### Creating Test Data

Open background service worker console:

```javascript
// Create test markers to populate the popup
await saveMarker({
  messageId: 'whatsapp:test1',
  platform: 'whatsapp',
  chatId: 'chat123',
  chatName: 'John Doe',
  sender: 'John Doe',
  messageText: 'Test message content here',
  labels: ['important', 'followup'],
  notes: 'Optional note text',
  timestamp: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now()
});

// View all markers
const markers = await getMarkersArray();
console.log(markers);

// Clean up
await clearAllMarkers();
```

## Architecture Overview

### Three-Context System

ChatMarker operates in three isolated JavaScript contexts that communicate via Chrome's message passing:

1. **Background Service Worker** (`background.js`)
   - Persistent extension context
   - Manages reminders via chrome.alarms API
   - Handles browser notifications
   - Routes messages between popup and content scripts
   - Performs storage operations
   - **Important**: Uses `importScripts('utils/storage.js')` to load storage functions

2. **Sidebar Context** (`popup/`)
   - Persistent UI context (side panel stays open)
   - Displays marked messages with search/filter
   - Settings management
   - Communicates with background via `chrome.runtime.sendMessage()`
   - Loads storage.js via `<script>` tag (not as module)
   - **Note**: Files kept in `popup/` directory for code organization

3. **Content Script Context** (per platform)
   - Injected into each messaging platform page
   - DOM manipulation for mark icons and labels
   - Observes page changes via MutationObserver
   - Isolated from page's JavaScript
   - Communicates with background for storage operations

### Storage Architecture

**Storage Layer** (`utils/storage.js`):
- Unified wrapper around chrome.storage.local API
- **Not a module** - loaded via importScripts or script tag
- All functions async/await based
- 25+ CRUD functions for markers, reminders, settings, labels

**Data Structures**:

```javascript
// Marker Object
{
  messageId: 'platform:chatId:sender:timestamp:hash',
  platform: 'whatsapp' | 'messenger' | 'instagram' | 'linkedin',
  chatId: string,
  chatName: string,
  sender: string,
  messageText: string,
  labels: ['urgent', 'important', ...],
  notes: string,
  priority: 'high' | 'medium' | 'low',
  starred: boolean,
  timestamp: number,
  createdAt: number,
  updatedAt: number
}

// Reminder Object
{
  reminderId: 'reminder_timestamp_random',
  messageId: string,
  reminderTime: number,
  notificationText: string,
  active: boolean,
  recurring: boolean
}
```

**Storage Keys**:
- `markers` - Object keyed by messageId
- `reminders` - Object keyed by reminderId
- `settings` - User preferences
- `labels` - Custom label definitions

### Message ID Generation

Critical for tracking messages across sessions:

```javascript
generateMessageId(platform, chatId, messageContent, sender, timestamp)
// Returns: 'platform:chatId:sender:timestamp:contentHash'
```

The hash is based on first 100 chars of message content. This composite ID allows:
- Tracking messages without stable DOM IDs
- Identifying same message across page reloads
- Deduplication

### Message Passing Patterns

**Popup → Background**:
```javascript
const response = await chrome.runtime.sendMessage({
  action: 'saveMarker',
  data: markerObject
});
```

**Content Script → Background**:
```javascript
chrome.runtime.sendMessage({
  action: 'createReminder',
  data: reminderObject
}, (response) => {
  if (response.success) { /* ... */ }
});
```

**Background message handler** in background.js listens for these actions:
- `saveMarker`, `deleteMarker`, `getMarker`, `getAllMarkers`
- `createReminder`, `deleteReminder`
- `updateSettings`
- `navigateToMessage`

## Content Script Implementation Strategy

### Platform DOM Challenges

Each platform (WhatsApp, Messenger, Instagram, LinkedIn) has:
- Dynamic, frequently-changing class names
- React/Virtual DOM rendering
- Dynamic message loading (virtual scrolling)
- No stable message IDs

### Standard Content Script Pattern

When implementing platform content scripts (currently placeholders):

1. **Selectors Configuration**
```javascript
const SELECTORS = {
  chatContainer: 'div[data-tab="6"]',  // Platform-specific
  messageList: 'div.message-list',
  message: 'div[class*="message-"]',
  messageText: 'span.selectable-text',
  sender: 'span[class*="author"]',
  timestamp: 'span[data-testid="msg-time"]'
};
```

2. **MutationObserver Setup**
```javascript
const observer = new MutationObserver((mutations) => {
  // Detect new messages
  // Apply marks to new messages
  // Re-inject icons if needed
});

observer.observe(chatContainer, {
  childList: true,
  subtree: true
});
```

3. **Message Enhancement Flow**
   - Extract message data from DOM
   - Generate messageId
   - Check storage for existing mark
   - Inject mark icon (if marked)
   - Inject labels and reminder badges
   - Add event listeners for mark/unmark

4. **Icon Injection**
   - Position: absolute within message container
   - CSS classes from styles/common.css
   - Show on hover if unmarked
   - Always visible if marked

### Platform-Specific Files

- `content-scripts/whatsapp.js` + `styles/whatsapp.css` - Day 2 implementation
- `content-scripts/messenger.js` + `styles/messenger.css` - Day 3
- `content-scripts/instagram.js` + `styles/instagram.css` - Day 3
- `content-scripts/linkedin.js` + `styles/linkedin.css` - Day 3

Common styles in `styles/common.css` - mark icons, labels, badges, animations

## CSS Architecture

### Variable System

All colors, spacing, shadows defined as CSS variables in `popup/popup.css`:
```css
:root {
  --color-primary: #6366F1;
  --space-base: 16px;
  --radius-md: 6px;
  /* ... */
}

body.dark-mode {
  --color-background: #0F172A;
  /* ... overrides */
}
```

### Label Colors

Consistent across popup and content scripts:
- `urgent`: #EF4444 (red)
- `important`: #F59E0B (yellow)
- `completed`: #10B981 (green)
- `followup`: #3B82F6 (blue)
- `question`: #8B5CF6 (purple)

Applied via `.label-badge.{labelId}` classes

### Dark Mode

Toggle via `document.body.classList.toggle('dark-mode')`. All colors switch via CSS variable overrides. Settings persist theme choice in storage.

## Key Implementation Notes

### Storage Function Usage

**In background.js**:
```javascript
// Direct function calls (imported via importScripts)
const marker = await saveMarker(data);
const allMarkers = await getAllMarkers();
```

**In popup.js**:
```javascript
// Also direct (loaded via script tag in popup.html)
const markers = await getMarkersArray();
await deleteMarker(messageId);
```

**In content scripts**:
```javascript
// Must go through background worker
chrome.runtime.sendMessage({
  action: 'saveMarker',
  data: markerData
}, (response) => {
  // Handle response
});
```

### Reminder System

**Creating Reminders**:
1. Save reminder to storage via `saveReminder()`
2. Create Chrome alarm: `chrome.alarms.create(reminderId, { when: timestamp })`
3. Background listens for alarm
4. Shows notification via chrome.notifications API
5. Clicking notification navigates to message

**Snooze Function**:
- Updates reminder time
- Recreates alarm
- Keeps reminder active

### Navigation to Messages

When user clicks marked message in popup or notification:
1. Background receives `navigateToMessage` action
2. Queries for existing tab with platform URL
3. If found: activates tab, sends message to content script to scroll
4. If not found: creates new tab
5. Content script listens for `scrollToMessage` and highlights target

## Development Workflow

### Reloading After Changes

**JavaScript/HTML changes**:
- Go to chrome://extensions/
- Click reload icon on ChatMarker card
- If popup is open, close and reopen it

**CSS-only changes**:
- Popup CSS: Just close/reopen popup
- Content script CSS: Hard refresh page (Ctrl+Shift+R)

**Manifest changes**:
- Must reload extension
- Sometimes requires removing and re-adding

### Debugging Tips

**"Function not defined" errors in background console**:
- Check `importScripts('utils/storage.js')` is present
- Verify file path is correct

**Content script not loading**:
- Check manifest.json host_permissions match URL
- Verify matches pattern includes current URL
- Check browser console for injection errors

**Popup blank/broken**:
- Right-click icon → Inspect
- Check console for errors
- Verify all script paths in popup.html

**Storage not persisting**:
- Use chrome.storage.local (not sync) for large data
- Check Chrome storage quota not exceeded
- Verify async/await usage

## File Load Order & Dependencies

**Background Service Worker**:
```javascript
importScripts('utils/storage.js');
// Then all storage functions available
```

**Popup HTML**:
```html
<script src="../utils/storage.js"></script>
<script src="popup.js"></script>
<!-- storage.js MUST load before popup.js -->
```

**Content Scripts** (in manifest.json):
```json
"js": ["content-scripts/whatsapp.js"],
"css": ["styles/common.css", "styles/whatsapp.css"]
<!-- common.css loads first for base styles -->
```

## Project Timeline Context

**Day 1** (Complete): Foundation - manifest, storage, background, popup UI
**Day 2** (Next): WhatsApp Web - full marking functionality end-to-end
**Day 3**: Extend to Messenger/Instagram/LinkedIn + labels & notes UI
**Day 4**: Reminders system, keyboard shortcuts, UX polish
**Day 5**: Testing, bug fixes, advanced features

When implementing new features, follow the day's plan in TIMELINE.md. Code is structured to build incrementally.

## Reference Documentation

- **FEATURES.md**: Complete feature specifications (180+ features categorized)
- **TIMELINE.md**: Detailed day-by-day implementation plan with time estimates
- **DESIGN.md**: Visual design specs, wireframes, color schemes, component specs
- **README.md**: Installation, testing procedures, troubleshooting

## Testing Considerations

Manual testing required (no automated test framework yet):
1. Load extension in Chrome
2. Create test data via background console
3. Verify popup displays correctly
4. Test on actual platform websites
5. Check all three contexts' consoles for errors

After Day 2, test marking workflow:
1. Open WhatsApp Web
2. Right-click message → verify context menu (if implemented)
3. Mark message → verify icon appears
4. Check popup shows marked message
5. Click in popup → verify navigation works
6. Reload page → verify marks persist

## Common Pitfalls

1. **Forgetting async/await**: All storage functions return Promises
2. **Wrong message passing pattern**: Content scripts can't access storage directly
3. **CSS specificity conflicts**: Platform websites have high-specificity selectors
4. **Service worker lifecycle**: Background context can restart; don't rely on in-memory state
5. **Sidebar state management**: While sidebar persists longer than popup, don't rely on in-memory state; always read from storage
6. **MutationObserver performance**: Throttle/debounce callbacks to avoid lag on busy pages

## Design System Quick Reference

**Spacing**: 4px (xs), 8px (sm), 12px (md), 16px (base), 24px (lg)
**Colors**: Primary #6366F1, Text #111827 (light) / #F1F5F9 (dark)
**Border Radius**: 4px (sm), 6px (md), 8px (lg)
**Transitions**: 150ms (fast), 250ms (base)

Follow DESIGN.md for detailed specifications including typography, shadows, component dimensions.
