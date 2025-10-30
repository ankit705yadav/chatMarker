# ChatMarker - Chrome Extension

Mark, label, and set reminders for messages across WhatsApp Web, Messenger, Instagram, and LinkedIn.

## 📋 Project Status

### Day 1: ✅ Foundation Complete

- [x] Project structure
- [x] Manifest V3 configuration
- [x] Storage system (utils/storage.js)
- [x] Background service worker
- [x] Popup UI (HTML, CSS, JS)
- [x] Placeholder content scripts

### Coming Next

- **Day 2**: WhatsApp Web integration (full marking functionality)
- **Day 3**: Multi-platform support + Labels & Notes
- **Day 4**: UX enhancements + Reminders
- **Day 5**: Testing & Polish

## 🚀 Installation & Testing

### 1. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `chatMarker` folder
5. The extension should now appear in your extensions list

### 2. Verify Installation

You should see:
- ✅ ChatMarker extension icon in toolbar
- ✅ No errors in the extension card
- ✅ "Service worker" status showing as active

### 3. Test the Sidebar

1. Click the ChatMarker extension icon
2. A sidebar opens on the right side of the browser
3. You should see the sidebar with:
   - Header with logo and settings icon
   - Search bar
   - Filter dropdowns
   - Empty state message (since no marks exist yet)
4. Try clicking the settings icon (⚙️)
5. Try toggling dark mode (🌙)

**Note**: ChatMarker uses Chrome's Side Panel API (requires Chrome 114+)

### 4. Test Background Script

1. On the extension page, click "service worker" link
2. This opens the background script console
3. You should see: `[ChatMarker] Background service worker loaded`
4. No errors should appear

### 5. Test Content Scripts

1. Open [WhatsApp Web](https://web.whatsapp.com)
2. Open Chrome DevTools (F12)
3. Check Console - you should see: `[ChatMarker] WhatsApp content script loaded`
4. Repeat for:
   - [Messenger](https://www.messenger.com)
   - [Instagram](https://www.instagram.com)
   - [LinkedIn](https://www.linkedin.com/messaging/)

## 📁 Project Structure

```
chatMarker/
├── manifest.json                 # Extension configuration
├── background.js                 # Service worker (reminders, notifications)
├── content-scripts/
│   ├── whatsapp.js              # WhatsApp Web integration (Day 2)
│   ├── messenger.js             # Messenger integration (Day 3)
│   ├── instagram.js             # Instagram integration (Day 3)
│   └── linkedin.js              # LinkedIn integration (Day 3)
├── popup/
│   ├── popup.html               # Extension popup UI
│   ├── popup.css                # Popup styles
│   └── popup.js                 # Popup logic
├── utils/
│   └── storage.js               # Storage wrapper functions
├── styles/
│   ├── common.css               # Shared styles for all platforms
│   ├── whatsapp.css             # WhatsApp-specific styles
│   ├── messenger.css            # Messenger-specific styles
│   ├── instagram.css            # Instagram-specific styles
│   └── linkedin.css             # LinkedIn-specific styles
├── icons/
│   └── README.md                # Icon placeholder instructions
├── FEATURES.md                  # Complete feature specification
├── TIMELINE.md                  # 5-day development plan
├── DESIGN.md                    # Design specifications
└── README.md                    # This file
```

## 🧪 Testing Checklist (Day 1)

### Extension Load
- [ ] Extension appears in chrome://extensions
- [ ] No errors on extension card
- [ ] Service worker is active
- [ ] All required permissions granted

### Sidebar
- [ ] Sidebar opens when clicking extension icon
- [ ] Sidebar is full height and responsive width
- [ ] Header displays correctly with logo
- [ ] Settings icon clickable
- [ ] Dark mode toggle works
- [ ] Search bar is functional
- [ ] Filters display correctly
- [ ] Empty state message shows
- [ ] No console errors

### Settings Modal
- [ ] Opens when clicking settings icon
- [ ] Theme dropdown functional
- [ ] Checkboxes toggle correctly
- [ ] Close button works
- [ ] Backdrop click closes modal
- [ ] Settings save (though no data to test yet)

### Storage System
Open the extension background console and test:

```javascript
// Test saving a marker
await saveMarker({
  messageId: 'test123',
  platform: 'whatsapp',
  chatId: 'chat456',
  sender: 'Test User',
  messageText: 'This is a test message',
  labels: ['important'],
  timestamp: Date.now()
});

// Test retrieving
const marker = await getMarker('test123');
console.log(marker);

// Test getting all markers
const allMarkers = await getMarkersArray();
console.log(allMarkers);

// Now click the extension icon - the popup should display this test marker!

// Clean up
await deleteMarker('test123');
```

### Background Script
- [ ] Service worker loads without errors
- [ ] Initialization message in console
- [ ] Message listener registered
- [ ] Can receive messages from popup

### Content Scripts
- [ ] WhatsApp: Script loads on web.whatsapp.com
- [ ] Messenger: Script loads on messenger.com
- [ ] Instagram: Script loads on instagram.com
- [ ] LinkedIn: Script loads on linkedin.com/messaging
- [ ] All scripts log initialization message
- [ ] No console errors on any platform

## 🐛 Known Issues / Limitations (Day 1)

1. **No marking functionality yet** - Content scripts are placeholders (Day 2)
2. **No icon files** - Extension uses default Chrome icon (create manually or wait)
3. **Export/Import not fully tested** - Works with test data only
4. **No actual marks** - Can only test with manually created test data

## 🔧 Troubleshooting

### Extension Won't Load
- Check for syntax errors in manifest.json
- Ensure all files referenced in manifest exist
- Check browser console for errors

### Sidebar Doesn't Open
- Reload the extension
- Check for JavaScript errors in sidebar console (right-click in sidebar → Inspect)
- Verify Chrome version is 114+ (required for Side Panel API)
- Check that sidePanel permission is in manifest.json

### Service Worker Inactive
- Click "service worker" link to activate
- Check for errors in service worker console
- Try reloading the extension

### Content Scripts Not Loading
- Check host_permissions in manifest
- Ensure you're on the correct URL
- Try hard refresh (Ctrl+Shift+R)
- Check DevTools console for script errors

## 📝 Development Notes

### Adding Test Data

To test the popup with sample data, open the background service worker console and run:

```javascript
// Create some test markers
const testMarkers = [
  {
    messageId: 'whatsapp:test1',
    platform: 'whatsapp',
    chatId: 'chat1',
    chatName: 'John Doe',
    sender: 'John Doe',
    messageText: 'Let\'s schedule the meeting for tomorrow at 2pm',
    labels: ['important', 'followup'],
    notes: 'Need to check my calendar first',
    timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
    updatedAt: Date.now()
  },
  {
    messageId: 'messenger:test2',
    platform: 'messenger',
    chatId: 'chat2',
    chatName: 'Project Team',
    sender: 'Sarah Smith',
    messageText: 'Can you send me the updated files?',
    labels: ['urgent'],
    timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
    createdAt: Date.now() - 5 * 60 * 60 * 1000,
    updatedAt: Date.now()
  },
  {
    messageId: 'instagram:test3',
    platform: 'instagram',
    chatId: 'chat3',
    chatName: 'Alex Chen',
    sender: 'Alex Chen',
    messageText: 'Great idea! Let\'s do it this weekend.',
    labels: ['completed'],
    notes: 'Confirmed for Saturday 3pm',
    timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
    updatedAt: Date.now()
  }
];

// Save them
for (const marker of testMarkers) {
  await saveMarker(marker);
}

console.log('Test data created! Open the sidebar to see it.');
```

### Clearing Test Data

```javascript
await clearAllMarkers();
console.log('All test data cleared');
```

## 🎯 Next Steps (Day 2)

Tomorrow we'll implement WhatsApp Web integration:

1. Research WhatsApp Web DOM structure
2. Implement message detection (MutationObserver)
3. Create message ID generation system
4. Inject mark icons on messages
5. Add right-click context menu
6. Implement mark/unmark functionality
7. Apply saved marks on page load
8. Test thoroughly with real WhatsApp chats

## 📚 Documentation

- **FEATURES.md** - Complete feature specifications (180+ features)
- **TIMELINE.md** - 5-day development plan with detailed tasks
- **DESIGN.md** - Visual design specifications and wireframes

## 🤝 Contributing

This is currently a solo development project following the 5-day timeline. After MVP completion, contributions will be welcome!

## 📄 License

TBD

## 🙏 Acknowledgments

- Chrome Extension Manifest V3 documentation
- Inspiration from productivity tools like Todoist, Notion, Boomerang

---

**Current Version**: 1.0.0 (Day 1 Complete)
**Last Updated**: 2025-10-30
**Status**: In Active Development 🚧
