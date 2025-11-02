# ChatMarker

> **Mark and organize chats across messaging platforms**

A Chrome extension that lets you mark, label, add notes, and set reminders for important chat conversations on WhatsApp, Reddit, and Facebook Messenger.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/chatmarker)
[![Chrome](https://img.shields.io/badge/chrome-114%2B-green.svg)](https://www.google.com/chrome/)
[![Manifest](https://img.shields.io/badge/manifest-v3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/)

---

## 📋 Project Status

### ✅ Implemented (WhatsApp, Reddit & Facebook)

- **Chat-only marking system** - Mark entire conversations, not individual messages
- **Chat list marking** - Mark chats directly from chat list without opening them
- **Context menus** - Right-click to mark/unmark chats
- **Labels** - Color-coded tags (Urgent, Important, Completed, Follow-up, Question)
- **Notes** - Add private notes to marked chats (up to 500 characters)
- **Reminders** - Set reminders with quick options or custom date/time
- **Chat list indicators** - Visual star indicators (⭐) in chat list showing marked chats
- **Dashboard sidebar** - View all marked chats with search, filters, and statistics
- **Dark mode** - Unified dark theme across all platforms
- **Export/Import** - Backup and restore your data
- **Shadow DOM support** - Works with modern web component frameworks

### 🔧 Platform Support

| Platform | Status | Chat List Marking | Indicators | Features |
|----------|--------|-------------------|------------|----------|
| **WhatsApp Web** | ✅ **Fully Implemented** | ⭐ (open chat) | ⭐ Inline before time | Mark, labels, notes, reminders |
| **Reddit Chat** | ✅ **Fully Implemented** | ⭐ (list + open) | ⭐ Inline before time | Mark, labels, notes, reminders, shadow DOM |
| **Facebook Messenger** | ✅ **Fully Implemented** | ⭐ (list only) | ⭐ Floating overlay | Mark, labels, notes, reminders |
| **Instagram** | ✅ **Fully Implemented** | ⭐ (list only) | ⭐ Floating overlay | Mark, labels, notes, reminders |
| LinkedIn | ⏳ Planned | - | - | Coming soon |

---

## 🚀 Installation

### Load Extension in Chrome

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `chatMarker` folder
6. Extension icon should appear in your toolbar

**Requirements**: Chrome 114+ (for Side Panel API)

---

## 📖 How to Use

### 1. Mark a Chat

#### On WhatsApp:
1. Open [WhatsApp Web](https://web.whatsapp.com)
2. Open a chat conversation
3. Right-click anywhere on the page
4. Select **ChatMarker → ⭐ Mark/Unmark Chat**
5. A star indicator (⭐) appears inline before the time in chat list

#### On Reddit:
1. Open [Reddit](https://www.reddit.com) chat
2. Right-click **any chat in the chat list** (or inside an open chat)
3. Select **ChatMarker → ⭐ Mark/Unmark Chat**
4. A star indicator (⭐) appears inline before the time in chat list

#### On Facebook Messenger:
1. Open [Facebook](https://www.facebook.com)
2. Open the chat sidebar (bottom-right)
3. Right-click **any chat in the chat list**
4. Select **ChatMarker → ⭐ Mark/Unmark Chat**
5. A star indicator (⭐) appears in the chat list

#### On Instagram:
1. Open [Instagram](https://www.instagram.com/direct/inbox/)
2. Navigate to your DM inbox
3. Right-click **any chat in the chat list**
4. Select **ChatMarker → ⭐ Mark/Unmark Chat**
5. A star indicator (⭐) appears as a floating overlay in the chat list

### 2. Add Labels

- Right-click → **ChatMarker → 🏷️ Add Labels**
- Choose from: Urgent, Important, Completed, Follow-up, Question
- Color-coded badges appear on marked chats

### 3. Add Notes

- Right-click → **ChatMarker → 📝 Add/Edit Note**
- Write a private note (up to 500 characters)
- Notes are stored locally and never synced

### 4. Set Reminders

- Right-click → **ChatMarker → ⏰ Set Reminder**
- Quick options: 1 Hour, 3 Hours, Tomorrow, Next Week
- Or choose custom date and time
- Get browser notifications when reminder triggers

### 5. View Dashboard

1. Click the ChatMarker extension icon
2. Opens a sidebar with all your marked chats
3. **Search** by chat name or message content
4. **Filter** by platform, labels, or date
5. **Click** any chat to navigate to it
6. **View stats** - Total chats and active reminders

---

## 📁 Project Structure

```
chatMarker/
├── manifest.json              # Extension configuration (Manifest V3)
├── background.js              # Service worker (storage, reminders, navigation)
│
├── content-scripts/           # Platform integrations
│   ├── whatsapp.js           # ✅ WhatsApp Web (~1,100 lines)
│   ├── reddit.js             # ✅ Reddit Chat (~1,400 lines)
│   ├── messenger.js          # ✅ Facebook Messenger (~950 lines)
│   ├── instagram.js          # ✅ Instagram (~1,145 lines)
│   └── linkedin.js           # ⏳ Placeholder
│
├── popup/                     # Extension sidebar UI
│   ├── popup.html            # Dashboard layout
│   ├── popup.css             # Styles with dark mode
│   └── popup.js              # Dashboard logic (1,870 lines)
│
├── styles/                    # Platform-specific CSS
│   ├── common.css            # Shared modal/toast styles
│   ├── whatsapp.css          # WhatsApp theme
│   ├── reddit.css            # Reddit theme with Lit compatibility
│   └── messenger.css         # Facebook Messenger theme
│
├── utils/
│   └── storage.js            # Chrome storage wrapper (25+ functions)
│
├── icons/                     # Extension icons
│   └── README.md             # Icon requirements
│
└── docs/                      # Documentation
    ├── FEATURES.md           # Complete feature list (180+)
    ├── TIMELINE.md           # Development roadmap
    ├── DESIGN.md             # UI/UX specifications
    ├── TEST.md               # Testing checklist
    └── CLAUDE.md             # Developer guide for Claude Code
```

---

## 🎯 Features

### Dashboard

- **Platform tabs** - Filter by WhatsApp, Reddit, or All Chats
- **Live search** - Find chats instantly as you type
- **Label filters** - Show/hide specific label types
- **Date filters** - Today, This Week, This Month, All Time
- **Statistics** - Total marked chats and active reminders
- **Empty states** - Helpful instructions when no chats are marked

### Chat Operations

- **Mark/Unmark** - Toggle chat marking with one click
- **Multi-label support** - Add multiple labels per chat
- **Edit notes** - Update notes anytime
- **Edit reminders** - Modify or delete existing reminders
- **Batch operations** - Export all data or clear all marks

### UI/UX

- **Inline modals** - Context-aware dialogs on the page
- **Toast notifications** - Instant feedback for all actions
- **Keyboard support** - ESC to close modals
- **Responsive design** - Works on all screen sizes
- **Dark mode** - Automatic theme detection
- **Platform themes** - Native look for each platform

### Technical

- **Shadow DOM support** - Works with Reddit's Lit framework using composedPath()
- **MutationObserver** - Real-time chat list updates across all platforms
- **Chrome Storage API** - Reliable data persistence with CRUD operations
- **Context Menus** - Platform-specific menus with contexts: ['all'] for link support
- **Background Service Worker** - Reminder notifications and alarms
- **Side Panel API** - Persistent sidebar experience (Chrome 114+)
- **Event composedPath()** - Traverses shadow DOM boundaries for element detection

---

## 🧪 Testing

### Quick Test

1. Load the extension
2. Open WhatsApp Web or Reddit
3. Right-click → **ChatMarker → ⭐ Mark/Unmark Chat**
4. See indicator appear in chat list
5. Click extension icon to view dashboard

### Create Test Data

Open extension background console (`chrome://extensions/` → Service worker):

```javascript
// Create a test marker
await saveMarker({
  messageId: 'test_' + Date.now(),
  platform: 'whatsapp',
  chatId: 'test_chat_123',
  chatName: 'Test Contact',
  labels: ['important', 'urgent'],
  notes: 'This is a test note',
  timestamp: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now()
});

// View in dashboard - click extension icon!
```

For complete testing checklist, see [docs/TEST.md](docs/TEST.md)

---

## 🐛 Troubleshooting

### Extension won't load
- Check for errors on `chrome://extensions/`
- Reload the extension
- Ensure Chrome is 114+

### Sidebar doesn't open
- Right-click sidebar → Inspect → Check console
- Verify Side Panel permission in manifest
- Try reloading extension

### Content script not working
- Hard refresh the page (Ctrl+Shift+R)
- Check DevTools console for errors
- Verify you're on the correct URL

### Indicators not appearing
- **WhatsApp**: Open the chat first to mark it
- **Reddit/Facebook**: Right-click directly on chat list items
- Wait 1-2 seconds for observer to run
- Check console for `[ChatMarker]` logs
- Reload the page if indicators don't update

---

## 🔒 Privacy

- **All data stored locally** in Chrome's storage
- **No server communication** - works completely offline
- **No tracking or analytics**
- **No data collection**
- **Export your data anytime**

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [FEATURES.md](docs/FEATURES.md) | Complete feature specifications (180+ features) |
| [TIMELINE.md](docs/TIMELINE.md) | Development roadmap and progress |
| [DESIGN.md](docs/DESIGN.md) | UI/UX design specifications |
| [TEST.md](docs/TEST.md) | Comprehensive testing checklist |
| [CLAUDE.md](docs/CLAUDE.md) | Developer guide for AI assistance |

---

## 🛠️ Technical Stack

- **Chrome Extension Manifest V3**
- **Vanilla JavaScript** (no frameworks)
- **Chrome Storage API**
- **Side Panel API** (Chrome 114+)
- **Context Menus API**
- **Notifications API**
- **Alarms API** (for reminders)

---

## 🗺️ Roadmap

### ✅ Completed
- [x] Foundation & architecture
- [x] Storage system with 25+ functions
- [x] Dashboard UI with sidebar
- [x] WhatsApp Web integration (open chat marking)
- [x] Reddit Chat integration (chat list marking with shadow DOM)
- [x] Facebook Messenger integration (chat list marking)
- [x] Instagram integration (chat list marking with floating overlay)
- [x] Chat list indicators (inline and overlay styles)
- [x] Labels, notes, reminders
- [x] Unified dark mode support
- [x] Platform-specific context menus

### 🔄 In Progress
- [ ] WhatsApp chat list marking (currently marks from open chat)
- [ ] LinkedIn integration

### 📋 Planned
- [ ] Keyboard shortcuts
- [ ] Advanced filters (by date range, priority)
- [ ] Custom label creation
- [ ] Recurring reminders
- [ ] Chat statistics and analytics
- [ ] Chrome Sync support
- [ ] Firefox version

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

See [docs/CLAUDE.md](docs/CLAUDE.md) for development setup.

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- Chrome Extension documentation
- WhatsApp Web and Reddit for their platforms
- Manifest V3 migration guides

---

**Current Version**: 1.0.0
**Last Updated**: 2025-11-02
**Status**: Active Development 🚀

**Platforms**: WhatsApp ✅ | Reddit ✅ | Facebook Messenger ✅ | Instagram ✅ | LinkedIn ⏳
