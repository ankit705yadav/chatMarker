# ChatMarker - 5-Day Development Timeline

## Overview
This timeline outlines a focused 5-day development sprint to build an MVP (Minimum Viable Product) of ChatMarker with essential features and one advanced feature for demonstration.

**Total Time**: 5 days (40-50 hours)
**Team Size**: 1-2 developers
**Goal**: Functional extension with marking, labeling, and reminders on WhatsApp + basic support for other platforms

---

## Day 1: Foundation & Core Infrastructure
**Focus**: Project setup, architecture, and basic extension structure

### Morning Session (4 hours)
#### 1.1 Project Setup (1 hour)
- [ ] Initialize project structure and folders
  ```
  chatMarker/
  ├── manifest.json
  ├── background.js
  ├── content-scripts/
  ├── popup/
  ├── utils/
  ├── styles/
  └── icons/
  ```
- [ ] Set up package.json if using build tools (optional: Webpack/Vite)
- [ ] Initialize Git repository
- [ ] Create .gitignore
- [ ] Install any dependencies (none required for basic version)

#### 1.2 Create manifest.json (1 hour)
- [ ] Define Manifest V3 structure
- [ ] Add required permissions: storage, notifications, alarms, activeTab
- [ ] Add host permissions for all 4 platforms
- [ ] Configure background service worker
- [ ] Set up content script injection rules
- [ ] Add extension icons (use placeholders if needed)
- [ ] Test extension loads in Chrome

**Deliverable**: ✅ Extension loads in Chrome://extensions with manifest v3

#### 1.3 Build Storage System (2 hours)
- [ ] Create `utils/storage.js`
- [ ] Implement storage wrapper functions:
  ```javascript
  - saveMarker(messageId, markerData)
  - getMarker(messageId)
  - getAllMarkers()
  - deleteMarker(messageId)
  - updateMarker(messageId, updates)
  - clearAllMarkers()
  ```
- [ ] Define data structure for markers:
  ```javascript
  {
    messageId: "whatsapp:chat123:msg456:hash789",
    platform: "whatsapp",
    chatId: "123",
    chatName: "John Doe",
    messageText: "Let's meet tomorrow...",
    sender: "John Doe",
    timestamp: 1698765432000,
    labels: ["important"],
    color: "#FFD700",
    priority: "high",
    notes: "",
    starred: false,
    createdAt: 1698765432000,
    updatedAt: 1698765432000
  }
  ```
- [ ] Add error handling and validation
- [ ] Test storage CRUD operations

**Deliverable**: ✅ Working storage system with test data

### Afternoon Session (4 hours)
#### 1.4 Create Background Service Worker (2 hours)
- [ ] Create `background.js`
- [ ] Set up message listener for content script communication
- [ ] Implement basic alarm system for reminders
- [ ] Add notification handler
- [ ] Create cleanup routine for old marks
- [ ] Test background script initializes correctly

**Key Functions**:
```javascript
- handleCreateMarker(data)
- handleDeleteMarker(messageId)
- handleCreateReminder(reminderId, timestamp)
- handleReminderAlarm(reminderId)
- showNotification(title, message)
```

#### 1.5 Build Basic Popup UI (2 hours)
- [ ] Create `popup/popup.html` structure
- [ ] Add sections: header, search bar, marks list, empty state
- [ ] Create `popup/popup.css` with basic styling
- [ ] Create `popup/popup.js` with logic:
  - Load and display all marks
  - Search functionality
  - Click to navigate to message
  - Delete mark button
- [ ] Test popup opens and shows test data

**Deliverable**: ✅ Functional popup showing marked messages

### End of Day 1 Checklist
- ✅ Extension installs without errors
- ✅ Storage system working
- ✅ Background script running
- ✅ Popup UI displays test data
- ✅ No console errors

**Time Invested**: 8 hours
**Completion**: ~15% of MVP

---

## Day 2: WhatsApp Web Integration
**Focus**: Get marking working end-to-end on WhatsApp Web

### Morning Session (4 hours)
#### 2.1 WhatsApp DOM Research (1 hour)
- [ ] Open WhatsApp Web and inspect message structure
- [ ] Identify message container selectors
- [ ] Identify message text selectors
- [ ] Identify sender name selectors
- [ ] Identify timestamp selectors
- [ ] Document all selectors in comments
- [ ] Test selectors stability across page reloads

**Key Selectors** (may vary, these are examples):
```javascript
{
  chatContainer: '[data-tab="6"]',
  messageList: 'div[class*="message-list"]',
  message: 'div[class*="message-"]',
  messageText: 'span.selectable-text',
  sender: 'span[class*="message-author"]',
  timestamp: 'span[data-testid="msg-time"]'
}
```

#### 2.2 Create Base Content Script (3 hours)
- [ ] Create `content-scripts/base-content-script.js` with utilities:
  ```javascript
  - generateMessageId(element)
  - extractMessageData(element)
  - injectMarkIcon(element, markerData)
  - removeMarkIcon(element)
  - setupMutationObserver()
  - handleDOMChanges()
  ```
- [ ] Create message ID generation algorithm
- [ ] Add hash function for content
- [ ] Test message identification consistency

**Deliverable**: ✅ Reusable content script utilities

### Afternoon Session (4 hours)
#### 2.3 WhatsApp Content Script Implementation (4 hours)
- [ ] Create `content-scripts/whatsapp.js`
- [ ] Extend base content script with WhatsApp-specific config
- [ ] Implement message detection and parsing
- [ ] Set up MutationObserver for new messages
- [ ] Process existing messages on page load
- [ ] Inject mark UI (star icon) on messages
- [ ] Add right-click context menu for marking
- [ ] Add hover state for mark icon
- [ ] Implement mark/unmark toggle
- [ ] Send mark data to background script
- [ ] Apply marks from storage on page load
- [ ] Test scrolling and dynamic message loading

**Key Features**:
- Right-click on message → "Mark Message" menu appears
- Click "Mark Message" → star icon appears on message
- Click star icon → mark removed
- Marks persist after page reload
- Marks sync to popup in real-time

**Deliverable**: ✅ Full marking workflow on WhatsApp Web

### End of Day 2 Checklist
- ✅ Can mark messages on WhatsApp Web
- ✅ Marks appear as icons on messages
- ✅ Marks save to storage
- ✅ Popup updates when marks added/removed
- ✅ Marks persist across page reloads
- ✅ MutationObserver handles dynamic content

**Time Invested**: 16 hours (cumulative)
**Completion**: ~35% of MVP

---

## Day 3: Core Features & Multi-Platform Support
**Focus**: Add labeling, notes, and expand to other platforms

### Morning Session (5 hours)
#### 3.1 Labeling System (2.5 hours)
- [ ] Create label selector UI component
- [ ] Add 5 preset colors with names
- [ ] Implement color picker in context menu
- [ ] Add label badge to marked messages
- [ ] Update storage to include labels
- [ ] Add label filter in popup
- [ ] Style labels consistently

**Labels**:
- 🔴 Red - Urgent
- 🟡 Yellow - Important
- 🟢 Green - Completed
- 🔵 Blue - Follow-up
- 🟣 Purple - Question

#### 3.2 Notes System (2.5 hours)
- [ ] Add "Add Note" button to context menu
- [ ] Create note input modal/dialog
- [ ] Store notes in marker data
- [ ] Show note indicator (📝 icon) on messages with notes
- [ ] Hover to preview note
- [ ] Click to edit note
- [ ] Add notes display in popup
- [ ] Character limit: 500 chars

**Deliverable**: ✅ Labels and notes working on WhatsApp

### Afternoon Session (3 hours)
#### 3.3 Multi-Platform Support (3 hours)
- [ ] Create `content-scripts/messenger.js`
  - Research Messenger DOM structure
  - Implement message detection
  - Apply base content script pattern
  - Test marking on messenger.com

- [ ] Create `content-scripts/instagram.js`
  - Research Instagram DM DOM structure
  - Implement message detection
  - Apply base content script pattern
  - Test marking on instagram.com/direct

- [ ] Create `content-scripts/linkedin.js`
  - Research LinkedIn messaging DOM structure
  - Implement message detection
  - Apply base content script pattern
  - Test marking on linkedin.com/messaging

**Note**: These will be simplified versions; full feature parity may take longer

**Deliverable**: ✅ Basic marking works on all 4 platforms

### End of Day 3 Checklist
- ✅ Color labels working
- ✅ Notes can be added to marks
- ✅ Basic marking on Messenger
- ✅ Basic marking on Instagram
- ✅ Basic marking on LinkedIn
- ✅ Popup shows marks from all platforms

**Time Invested**: 24 hours (cumulative)
**Completion**: ~60% of MVP

---

## Day 4: UX Enhancements & Reminders
**Focus**: Polish user experience and add reminder system

### Morning Session (4 hours)
#### 4.1 Enhanced Popup UI (2 hours)
- [ ] Improve popup visual design
- [ ] Add dark/light mode toggle
- [ ] Add platform filter tabs
- [ ] Add label filter dropdown
- [ ] Add date range filter
- [ ] Improve list item design with better spacing
- [ ] Add empty state illustrations
- [ ] Add loading states
- [ ] Optimize for performance (virtual scrolling if needed)

#### 4.2 Search & Filtering (2 hours)
- [ ] Implement real-time search across all marks
- [ ] Add search highlighting
- [ ] Combine filters (platform + label + search)
- [ ] Add "Clear filters" button
- [ ] Show result count
- [ ] Add search history (recent searches)

**Deliverable**: ✅ Polished popup with good UX

### Afternoon Session (4 hours)
#### 4.3 Reminder System (4 hours)
- [ ] Add "Set Reminder" to context menu
- [ ] Create reminder picker UI:
  - 1 hour
  - 3 hours
  - Tomorrow (9 AM)
  - Next week (Monday 9 AM)
  - Custom date/time picker
- [ ] Store reminder data structure:
  ```javascript
  {
    reminderId: "reminder_123",
    messageId: "whatsapp:...",
    reminderTime: 1698876543000,
    notificationText: "Follow up: Let's meet tomorrow",
    active: true,
    recurring: false
  }
  ```
- [ ] Create chrome.alarms for reminders
- [ ] Implement notification handler in background.js
- [ ] Add reminder icon (⏰) to messages with reminders
- [ ] Show countdown on hover ("in 2 hours")
- [ ] Add reminder list in popup
- [ ] Add snooze and dismiss buttons on notifications
- [ ] Test reminder fires correctly
- [ ] Handle edge cases (page closed, browser restart)

**Deliverable**: ✅ Working reminder system with notifications

### End of Day 4 Checklist
- ✅ Beautiful, functional popup UI
- ✅ Dark mode works
- ✅ Search and filters working
- ✅ Reminders can be set
- ✅ Notifications appear on time
- ✅ Snooze functionality works

**Time Invested**: 32 hours (cumulative)
**Completion**: ~80% of MVP

---

## Day 5: Testing, Polish & Advanced Features
**Focus**: Bug fixes, testing, and add one smart feature

### Morning Session (4 hours)
#### 5.1 Comprehensive Testing (2 hours)
- [ ] Test on WhatsApp Web:
  - Mark/unmark messages
  - Add labels and notes
  - Set reminders
  - Search and filter
  - Large conversations (100+ messages)
  - Scrolling and dynamic loading
  - Multiple chats

- [ ] Test on Messenger, Instagram, LinkedIn:
  - Basic marking functionality
  - Labels persist
  - Navigate from popup works

- [ ] Test edge cases:
  - Browser restart (marks persist)
  - Multiple tabs open
  - Rapid marking/unmarking
  - Empty states
  - Network offline
  - Very long messages
  - Special characters in messages

- [ ] Test popup:
  - Search with no results
  - Filters work correctly
  - Navigation to message works
  - Delete marks works
  - UI responsive to window resize

#### 5.2 Bug Fixes (2 hours)
- [ ] Fix any critical bugs found in testing
- [ ] Handle errors gracefully
- [ ] Add try-catch blocks where needed
- [ ] Improve error messages
- [ ] Fix any visual glitches
- [ ] Optimize performance issues

**Deliverable**: ✅ Stable, bug-free core functionality

### Afternoon Session (4 hours)
#### 5.3 Add Smart Feature: Priority Detection (2 hours)
Choose ONE smart feature to implement for demo purposes:

**Option A: AI Priority Detection**
- [ ] Integrate OpenAI API (or local keyword detection)
- [ ] Analyze message content for urgency signals
- [ ] Keywords: "urgent", "ASAP", "deadline", "important", "!!! "
- [ ] Auto-assign high/medium/low priority
- [ ] Add priority badges (🔴 High, 🟡 Medium, ⚪ Low)
- [ ] Allow manual override

**Option B: Auto-Categorization**
- [ ] Keyword-based auto-labeling
- [ ] Detect question marks → "Question" label
- [ ] Detect time/date words → "Meeting" label
- [ ] Detect "can you", "please" → "Request" label
- [ ] User can enable/disable auto-labels in settings

**Recommended**: Option B (simpler, no API dependencies)

#### 5.4 Settings Panel (1 hour)
- [ ] Create settings page/tab in popup
- [ ] Add toggle for auto-categorization
- [ ] Add notification sound toggle
- [ ] Add data management section:
  - Export all marks to JSON
  - Import from JSON
  - Clear all marks (with confirmation)
- [ ] Add about section with version number

#### 5.5 Final Polish (1 hour)
- [ ] Add extension icons (create or use free icons)
- [ ] Improve mark icon design
- [ ] Add smooth animations/transitions
- [ ] Ensure consistent styling across all platforms
- [ ] Add tooltips to buttons
- [ ] Spell check and grammar check all UI text
- [ ] Update manifest with proper description and name

**Deliverable**: ✅ Polished MVP with smart feature

### End of Day 5 Checklist
- ✅ All core features working reliably
- ✅ No critical bugs
- ✅ Smart feature implemented
- ✅ Settings panel functional
- ✅ Professional visual design
- ✅ Export/import working
- ✅ Ready for demo/beta testing

**Time Invested**: 40 hours (cumulative)
**Completion**: ~100% of MVP

---

## MVP Feature Summary (After 5 Days)

### ✅ COMPLETED Features
1. **Marking System**
   - Mark/unmark messages on all 4 platforms
   - Visual indicators on messages
   - Persistent storage

2. **Labeling**
   - 5 color labels
   - Label badges on messages
   - Filter by label

3. **Notes**
   - Add private notes to marks
   - View and edit notes
   - Note indicator on messages

4. **Reminders**
   - Set reminders with presets + custom time
   - Browser notifications
   - Snooze functionality
   - Reminder icons and countdown

5. **Dashboard/Popup**
   - View all marked messages
   - Search functionality
   - Filter by platform, label, date
   - Click to navigate to message
   - Dark/light mode

6. **Multi-Platform**
   - WhatsApp Web (full support)
   - Facebook Messenger (basic)
   - Instagram (basic)
   - LinkedIn (basic)

7. **Smart Feature** (1 of the following)
   - Auto-categorization OR
   - Priority detection

8. **Settings**
   - Export/import data
   - Toggle features
   - Clear all data

### ⏳ NOT COMPLETED (Future Phases)
- Custom labels (beyond 5 presets)
- Bulk operations
- Advanced analytics
- Team collaboration
- Calendar integration
- Mobile app
- Cloud sync
- AI-powered search

---

## Post-MVP Roadmap

### Week 2-3: Core Enhancements
- Custom label creation
- Bulk mark operations
- Advanced filtering (Boolean logic)
- Keyboard shortcuts
- Better platform stability (handle DOM changes)
- Improved WhatsApp, Messenger, Instagram support

### Week 4-6: Smart Features
- AI-powered categorization (OpenAI integration)
- Smart search (semantic)
- Action item detection
- Auto-mark rules
- Analytics dashboard

### Week 7-10: Integrations
- Google Calendar integration
- Todoist/Asana export
- Notion integration
- Email forwarding
- Webhook support

### Week 11+: Advanced
- Team collaboration features
- Cloud sync
- Mobile companion app
- Enterprise features
- API access

---

## Daily Time Breakdown

| Day | Focus Area | Hours | Cumulative |
|-----|------------|-------|------------|
| 1 | Foundation & Infrastructure | 8 | 8 |
| 2 | WhatsApp Integration | 8 | 16 |
| 3 | Multi-Platform & Features | 8 | 24 |
| 4 | UX & Reminders | 8 | 32 |
| 5 | Testing & Polish | 8 | 40 |

---

## Risk Management

### High-Risk Items
1. **Platform DOM Changes**: WhatsApp, Messenger, Instagram frequently update UI
   - **Mitigation**: Use multiple selector strategies, test regularly, build fallback mechanisms

2. **Message Identification**: No stable IDs means we must generate composite IDs
   - **Mitigation**: Use hash of content + timestamp + sender for uniqueness

3. **Performance**: Large conversations (1000+ messages) could be slow
   - **Mitigation**: Use lazy loading, debouncing, efficient selectors

4. **Notification Reliability**: Chrome alarms may not fire if browser closed
   - **Mitigation**: Check on startup, reschedule missed reminders

### Medium-Risk Items
1. **Chrome Storage Limits**: 100KB per item, 5MB total for sync
   - **Mitigation**: Use local storage primarily, only sync essential data

2. **Cross-Platform Consistency**: Each platform has different structure
   - **Mitigation**: Build abstraction layer, test thoroughly

### Low-Risk Items
1. **Browser Compatibility**: Chrome-only initially
2. **User Adoption**: Need marketing/promotion
3. **Privacy Concerns**: All data local, no server

---

## Testing Strategy

### Manual Testing Checklist
- [ ] Install extension in Chrome
- [ ] Test on fresh profile (no existing data)
- [ ] Mark 50+ messages across platforms
- [ ] Set 10+ reminders (short term for testing)
- [ ] Test all filters and search
- [ ] Test dark/light mode
- [ ] Export data, clear all, import data
- [ ] Test with browser restart
- [ ] Test with slow internet
- [ ] Test with ad blockers enabled

### Automated Testing (Future)
- Unit tests for storage functions
- Integration tests for content scripts
- E2E tests with Puppeteer

---

## Success Criteria for MVP

### Must Have (Before Launch)
- ✅ No critical bugs
- ✅ Can mark messages on all 4 platforms
- ✅ Marks persist reliably
- ✅ Reminders fire on time
- ✅ Search works accurately
- ✅ UI is intuitive and polished
- ✅ Export/import works
- ✅ No data loss scenarios

### Nice to Have
- ✅ Dark mode
- ✅ One smart feature
- ✅ Keyboard shortcuts (future)
- ✅ Analytics (future)

---

## Resource Requirements

### Development
- 1-2 developers (full-stack)
- Code editor (VS Code recommended)
- Chrome browser
- Git for version control
- Test accounts on all platforms

### Tools & Services
- Chrome Developer Tools
- GitHub for code hosting
- No external APIs required for MVP
- Optional: OpenAI API key for smart features

### Design
- Icon design tool (Figma, Canva, or use free icons)
- Basic CSS knowledge
- Optional: Tailwind CSS for faster styling

---

## Launch Preparation (Day 6+)

### Pre-Launch Checklist
- [ ] Create Chrome Web Store developer account ($5 one-time fee)
- [ ] Prepare store listing:
  - Extension name: ChatMarker
  - Short description (132 chars)
  - Detailed description
  - Screenshots (5 minimum)
  - Promotional images
  - Privacy policy
- [ ] Set up website/landing page (optional)
- [ ] Prepare demo video
- [ ] Write changelog/release notes
- [ ] Set up analytics (privacy-friendly)
- [ ] Create support email/contact

### Distribution
- [ ] Upload to Chrome Web Store
- [ ] Share on Product Hunt
- [ ] Share on Reddit (r/chrome, r/productivity)
- [ ] Share on Twitter/LinkedIn
- [ ] Email beta testers
- [ ] Write blog post/tutorial

---

## Key Metrics to Track

### Technical Metrics
- Installation success rate
- Crash-free rate
- Average response time for marking
- Storage usage per user
- Error rate

### User Metrics
- Daily/weekly active users
- Marks created per user
- Reminders set per user
- Most-used features
- Platform distribution (WhatsApp vs others)
- Retention (D1, D7, D30)

### Feedback Metrics
- Chrome Web Store rating
- Review sentiment
- Support ticket volume
- Feature request frequency

---

## Team Roles (If Multiple People)

### Developer 1 (Lead)
- Day 1: Foundation
- Day 2: WhatsApp integration
- Day 4: Reminders system
- Day 5: Smart features

### Developer 2 (Support)
- Day 1: Popup UI
- Day 3: Multi-platform support
- Day 4: UI polish
- Day 5: Testing

### Designer (Optional)
- Icons and visual assets
- UI mockups
- Store listing graphics

---

## Communication & Standups

### Daily Standup (15 min)
- What did I complete yesterday?
- What will I work on today?
- Any blockers?

### End-of-Day Review (15 min)
- Demo what was built
- Test together
- Adjust timeline if needed

---

## Contingency Plans

### If Behind Schedule
- **Day 2**: Skip Messenger/Instagram/LinkedIn, focus only on WhatsApp
- **Day 3**: Skip notes feature, focus on labels only
- **Day 4**: Simplify reminder system (no snooze, basic notifications)
- **Day 5**: Skip smart feature, focus on stability

### If Ahead of Schedule
- **Day 3**: Add custom label creation
- **Day 4**: Add keyboard shortcuts
- **Day 5**: Add analytics dashboard
- **Day 5**: Start on cloud sync

---

## Conclusion

This 5-day timeline is ambitious but achievable for an experienced developer. The key is to:
1. **Focus on core value**: Marking and organizing messages
2. **Start simple**: Get WhatsApp working first, then expand
3. **Iterate quickly**: Test frequently, fix immediately
4. **Cut scope if needed**: Better to have a polished MVP than half-done advanced features
5. **Maintain quality**: No critical bugs, smooth UX

By end of Day 5, you'll have a functional Chrome extension that genuinely solves a problem and can be released as a beta for early users to test.

---

*Last Updated: 2025-10-29*
*Version: 1.0*
*Estimated Completion: 40-50 hours*
