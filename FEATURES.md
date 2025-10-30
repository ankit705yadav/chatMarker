# ChatMarker - Complete Feature Specification

## Overview
ChatMarker is a Chrome extension that enables users to mark, label, and set reminders for messages across WhatsApp Web, Facebook Messenger, Instagram, and LinkedIn messaging platforms.

---

## 1. ESSENTIAL FEATURES (MVP - Must-Have)

These are the absolute minimum features required for a functional product.

### 1.1 Core Marking Functionality
- **Quick Mark/Unmark**: Click or right-click to mark individual messages with a visual indicator
- **Visual Mark Indicator**: Star/flag icon appears directly on marked messages in the chat
- **Mark Persistence**: All marks saved locally using Chrome Storage API
- **Mark Count**: Display total number of marked messages on extension badge

### 1.2 Basic Labeling
- **5 Preset Color Labels**: Red, Yellow, Green, Blue, Purple
- **Label Display**: Color highlight or badge on marked messages
- **Single Label per Message**: Each message can have one color label
- **Quick Label Menu**: Right-click to show label selection

### 1.3 Message Display & Access
- **Extension Popup**: Click extension icon to open popup with marked messages list
- **Message Preview**: Show message snippet (first 100 characters)
- **Sender Info**: Display sender name with each marked message
- **Timestamp**: Show when message was sent
- **Platform Indicator**: Icon showing which platform (WhatsApp/Messenger/Instagram/LinkedIn)
- **Click to Navigate**: Click marked message in popup to scroll to it in chat

### 1.4 Platform Support
- **WhatsApp Web Detection**: Auto-detect web.whatsapp.com
- **Messenger Detection**: Auto-detect messenger.com or facebook.com/messages
- **Instagram Detection**: Auto-detect instagram.com/direct
- **LinkedIn Detection**: Auto-detect linkedin.com/messaging
- **Platform-Specific Selectors**: Reliable message DOM parsing for each platform

### 1.5 Basic Search
- **Text Search**: Find marked messages by searching message content
- **Search Within Current Platform**: Filter search to current platform only
- **Real-time Search**: Results update as user types

### 1.6 Critical UX Elements
- **Immediate Visual Feedback**: Mark appears instantly when applied
- **Loading States**: Show spinner while loading marks
- **Error Messages**: Clear error notifications if something fails
- **Empty States**: Helpful message when no marks exist

---

## 2. CORE FEATURES (Full Functionality)

Features that make the product fully functional and competitive.

### 2.1 Enhanced Labeling System
- **Custom Label Names**: Create labels like "Follow-up", "Important", "Action Required", "Review"
- **Label Manager**: Interface to create, edit, delete custom labels
- **Color Picker**: Choose any color for custom labels
- **Multiple Labels**: Apply multiple labels to a single message
- **Label Templates**: Pre-configured label sets (Work, Personal, Projects)
- **Quick Label Shortcuts**: Keyboard shortcuts 1-9 to apply first 9 labels

### 2.2 Notes & Annotations
- **Private Notes**: Add text notes to any marked message
- **Note Editing**: Edit existing notes inline
- **Note Search**: Search through note content
- **Note Preview**: Show note icon and preview on hover
- **Rich Text Notes**: Basic formatting (bold, italic, links)
- **Character Limit**: 2000 characters per note

### 2.3 Priority System
- **Priority Levels**: High (red), Medium (yellow), Low (gray)
- **Priority Badges**: Visual indicators on messages
- **Priority Sorting**: Sort marked messages by priority
- **Quick Priority Toggle**: Click to cycle through priority levels

### 2.4 Global Dashboard
- **All Marks View**: Central dashboard showing all marked messages across all chats
- **Platform Tabs**: Separate tabs for WhatsApp, Messenger, Instagram, LinkedIn
- **Conversation Grouping**: Group marks by chat/conversation
- **Compact/Expanded Views**: Toggle between list and card views
- **Dashboard Shortcut**: Keyboard shortcut (Ctrl+Shift+M) to open dashboard

### 2.5 Advanced Filtering
- **Filter by Label**: Show only messages with specific labels
- **Filter by Platform**: View marks from single platform
- **Filter by Priority**: Show only high/medium/low priority
- **Filter by Date Range**: Today, Last 7 days, Last 30 days, Custom range
- **Filter by Conversation**: Show marks from specific chat
- **Multi-Filter Combination**: Apply multiple filters simultaneously
- **Save Filter Presets**: Save commonly used filter combinations

### 2.6 Sorting Options
- **Sort by Date**: Newest/oldest first
- **Sort by Priority**: High to low or low to high
- **Sort by Platform**: Group by platform
- **Sort by Label**: Group by label type
- **Sort by Conversation**: Alphabetical by chat name
- **Custom Sort Order**: Drag and drop to manually order marks

### 2.7 Context & Metadata
- **Full Conversation Context**: Show previous/next messages in thread
- **Sender Profile Picture**: Display profile image with marks
- **Message Type Detection**: Icon for text, image, video, document, voice
- **Group Chat Info**: Show group name and participant count
- **Timestamp Formats**: Relative (2 hours ago) and absolute (Dec 25, 2:30 PM)
- **Read/Unread Status**: Indicate if you've read the message

### 2.8 Bulk Operations
- **Multi-Select Mode**: Check boxes to select multiple marks
- **Bulk Delete**: Remove multiple marks at once
- **Bulk Label**: Apply/remove labels to multiple marks
- **Bulk Priority**: Set priority for multiple marks
- **Bulk Export**: Export selected marks only
- **Select All/None**: Quick selection controls

### 2.9 Export & Backup
- **Export to CSV**: Export marks with all metadata (date, sender, platform, labels, notes)
- **Export to JSON**: Machine-readable format for backups
- **Export to Markdown**: Formatted for note-taking apps (Notion, Obsidian)
- **Export to HTML**: Styled web page with all marks
- **Selective Export**: Export filtered or selected marks only
- **Auto-Backup**: Automatic daily backup to local file
- **Import from Backup**: Restore marks from backup file

### 2.10 Copy & Share
- **Copy Message Text**: One-click copy of message content
- **Copy with Context**: Copy message with sender and timestamp
- **Copy Multiple**: Copy selected marks as formatted text
- **Share Link**: Generate shareable link to mark (requires cloud feature)

---

## 3. USER EXPERIENCE FEATURES

Features that enhance usability, accessibility, and overall user satisfaction.

### 3.1 Keyboard Shortcuts & Navigation
- **Global Shortcuts**:
  - `M`: Mark/unmark currently hovered message
  - `L`: Open label menu
  - `N`: Add/edit note
  - `P`: Set priority
  - `R`: Set reminder
  - `D`: Delete mark
  - `F` or `/`: Focus search box
  - `Esc`: Close popups and menus
  - `Ctrl+Shift+M`: Open dashboard
  - `1-9`: Apply label 1-9
  - `Shift+1-3`: Set priority (1=High, 2=Med, 3=Low)

- **Navigation Shortcuts**:
  - `J/K`: Next/previous mark in list (Vim-style)
  - `↑/↓`: Navigate through marks
  - `Enter`: Open selected mark in chat
  - `Space`: Preview mark details
  - `Tab`: Cycle through UI elements

- **Shortcut Customization**: Users can rebind shortcuts in settings
- **Shortcut Help**: Press `?` to show keyboard shortcut cheat sheet

### 3.2 Accessibility
- **Screen Reader Support**: Full ARIA labels and roles
- **Keyboard-Only Navigation**: Complete functionality without mouse
- **High Contrast Mode**: Support for high contrast accessibility themes
- **Focus Indicators**: Clear visual focus states for keyboard navigation
- **Alt Text**: Descriptive alt text for all icons and images
- **Announcements**: Screen reader announcements for actions (mark added, label changed)

### 3.3 Visual Design & Theming
- **Dark/Light Mode**: Toggle between themes
- **Auto Theme Detection**: Match browser/system theme
- **Custom Theme Creator**: Choose accent colors and styles
- **Preset Themes**: Professional, Colorful, Minimal, Monochrome
- **Font Size Options**: Small, Medium, Large, Extra Large
- **Compact Mode**: Dense layout for more items on screen
- **Icon Styles**: Choose mark icon (star, flag, bookmark, dot, heart)

### 3.4 Smart UX Patterns
- **Hover Previews**: Hover over mark to see full note without clicking
- **Quick Actions Bar**: Hover over mark to reveal action buttons (edit, delete, change label)
- **Context Menus**: Right-click for quick actions anywhere
- **Drag & Drop**: Drag marks between labels in dashboard
- **Inline Editing**: Edit notes and labels directly in list view
- **Undo/Redo**: Undo last action (mark deletion, label change)
- **Confirmation Dialogs**: Confirm destructive actions (bulk delete)
- **Toast Notifications**: Non-intrusive success/error messages
- **Progressive Disclosure**: Show advanced options only when needed

### 3.5 Performance & Responsiveness
- **Lazy Loading**: Load marks on-demand as user scrolls
- **Virtual Scrolling**: Efficiently render large lists (1000+ marks)
- **Debounced Search**: Avoid lag when typing in search
- **Cached Data**: Cache frequently accessed data
- **Loading Skeletons**: Show placeholder UI while loading
- **Smooth Animations**: 60fps transitions and animations
- **Offline Support**: View cached marks without internet

### 3.6 Reminders & Notifications
- **Quick Reminders**: 1 hour, 3 hours, Tomorrow, Next week, Custom
- **Browser Notifications**: Native Chrome notifications for reminders
- **Snooze Function**: Snooze reminder for 10 min / 1 hour / 1 day
- **Reminder List**: View all upcoming reminders in dashboard
- **Reminder Icons**: Clock icon on messages with active reminders
- **Countdown Display**: Show time until reminder (e.g., "in 2 hours")
- **Repeat Reminders**: Set recurring reminders (daily, weekly)
- **Notification Sound**: Optional sound alert (customizable)
- **Badge Counter**: Show number of pending reminders on extension icon
- **Daily Digest**: Summary notification at chosen time (8 AM default)

### 3.7 Recent Activity & Quick Access
- **Recently Marked**: Quick access to last 10 marked messages
- **Recently Viewed**: Last 10 marks you clicked on
- **Frequently Accessed**: Most-clicked marks
- **Pin to Top**: Pin important marks to top of list
- **Starred Marks**: Quick filter for starred/favorited marks
- **Today's Marks**: Quick view of marks added today

### 3.8 Sync & Multi-Device
- **Chrome Sync Storage**: Automatic sync across Chrome browsers
- **Sync Status Indicator**: Show when sync is active/complete
- **Conflict Resolution**: Last-write-wins for conflicting changes
- **Sync Settings**: Choose what to sync (marks, labels, settings)
- **Manual Sync**: Force sync button
- **Sync History**: View sync activity log
- **Device Management**: See which devices have synced

### 3.9 Onboarding & Help
- **Welcome Tutorial**: First-time user walkthrough
- **Interactive Tooltips**: Contextual help for features
- **Video Tutorials**: Embedded how-to videos
- **Help Center**: Searchable knowledge base
- **Feature Announcements**: In-app notifications for new features
- **Feedback Form**: Easy way to submit feedback/bugs
- **Changelog**: View version history and updates

### 3.10 Settings & Customization
- **General Settings**: Extension name, language, theme
- **Notification Settings**: Enable/disable, sound, timing
- **Display Settings**: Font size, compact mode, icon style
- **Shortcut Settings**: Customize keyboard shortcuts
- **Platform Settings**: Enable/disable specific platforms
- **Privacy Settings**: Data retention, export options
- **Advanced Settings**: Performance tuning, debug mode
- **Reset Settings**: Restore defaults

---

## 4. SMART FEATURES (Advanced & AI-Powered)

Cutting-edge features that leverage AI, automation, and advanced integrations.

### 4.1 AI-Powered Categorization
- **Auto-Label Suggestions**: AI suggests appropriate labels based on message content
- **Smart Priority Detection**: Automatically flag urgent or important messages
- **Category Recognition**: Detect message types (question, request, task, information, social)
- **Topic Extraction**: Identify main topics discussed in message
- **Entity Recognition**: Extract names, dates, locations, phone numbers, emails
- **Action Item Detection**: Identify messages containing tasks or todos
- **Sentiment Analysis**: Detect tone (urgent, positive, negative, neutral)
- **Language Detection**: Identify language of message

### 4.2 Smart Search & Discovery
- **Semantic Search**: Find messages by meaning, not just keywords
- **Similar Messages**: Find messages related to selected mark
- **Natural Language Queries**: Search using questions ("Show urgent messages from last week")
- **Fuzzy Search**: Find results even with typos
- **Search Suggestions**: Auto-complete and suggest searches
- **Regex Search**: Advanced pattern matching for power users
- **Search History**: Recent searches for quick re-run
- **Saved Searches**: Save complex queries with custom names

### 4.3 Content Intelligence
- **Message Summarization**: Auto-generate summary of long messages
- **Thread Summarization**: Summarize entire conversation thread
- **Key Points Extraction**: Pull out main points from messages
- **Translation**: Translate marked messages to user's language
- **Text-to-Speech**: Read marked messages aloud
- **Attachment Analysis**: Extract text from images (OCR), PDFs
- **Link Preview**: Show preview of links in messages
- **Meeting Detection**: Identify messages about meetings and extract time/date

### 4.4 Automation Rules
- **Auto-Mark Rules**: Automatically mark messages based on conditions
  - From specific contacts
  - Containing keywords
  - With attachments
  - In specific groups
  - During specific hours
  - Matching regex patterns
- **Auto-Label Rules**: Automatically apply labels based on content
- **Auto-Priority Rules**: Set priority based on sender or keywords
- **Auto-Reminder Rules**: Set reminders for messages matching criteria
- **Rule Chains**: Combine multiple conditions (IF this AND that THEN action)
- **Rule Templates**: Pre-built rules for common scenarios
- **Rule Statistics**: See how often rules trigger

### 4.5 Smart Collections & Filters
- **Smart Folders**: Auto-populated collections
  - "Needs Response" (unmarked replies in conversations with marks)
  - "Action Items This Week" (marks with action keywords)
  - "Overdue" (reminders that passed)
  - "Starred & Urgent" (high priority starred marks)
  - "From VIPs" (marks from important contacts)
- **Dynamic Filters**: Filters that update based on criteria
- **Collection Sharing**: Share smart collections with team (requires cloud)

### 4.6 Analytics & Insights
- **Personal Dashboard**: Overview of marking patterns and statistics
- **Mark Statistics**: Total marks, marks per platform, marks per day/week/month
- **Response Time Analysis**: Average time between marking and action
- **Platform Usage**: Which platforms you mark most on
- **Label Distribution**: Pie chart of label usage
- **Time Patterns**: Heatmap of when you mark messages (time of day, day of week)
- **Conversation Heat Map**: Which chats have most marked messages
- **Productivity Score**: Gamified score based on marking and resolution
- **Trends**: Track changes over time (more/less marking)
- **Goal Setting**: Set and track marking goals
- **Weekly Report**: Automated summary email/notification

### 4.7 Advanced Integrations
- **Calendar Integration**:
  - Create Google Calendar / Outlook events from marks
  - Auto-detect dates/times in messages
  - Add mark context to calendar event description

- **Task Manager Integration**:
  - Export to Todoist, Asana, Trello, Microsoft To Do
  - Two-way sync (mark in chat, create task; complete task, archive mark)

- **Note-Taking Apps**:
  - Send to Notion, Evernote, OneNote, Obsidian, Roam Research
  - Maintain formatting and context

- **CRM Integration** (for business users):
  - Export to Salesforce, HubSpot
  - Auto-log interactions

- **Email Integration**:
  - Forward marked messages to email
  - Create email drafts from marks

- **Slack/Teams Integration**:
  - Share marked messages to Slack channels or Teams

- **Webhook Support**:
  - Trigger custom webhooks on mark events
  - POST to Zapier, IFTTT, n8n

- **API Access**:
  - RESTful API for custom integrations
  - OAuth authentication for third parties

### 4.8 Collaboration Features (Team/Enterprise)
- **Team Workspaces**: Create shared spaces for team members
- **Shared Mark Collections**: Everyone sees same marks in workspace
- **Assignment**: Assign marks to team members
- **Status Workflow**: Move marks through stages (To Do → In Progress → Done)
- **Comments & Discussions**: Team members can comment on marks
- **@Mentions**: Mention teammates in comments
- **Activity Feed**: See team activity in real-time
- **Permissions & Roles**: Admin, Member, Viewer roles
- **Team Analytics**: Aggregated stats across team
- **Workspace Settings**: Configure team preferences

### 4.9 Advanced Organization
- **Nested Labels**: Create label hierarchies (Projects > ProjectA > Phase1)
- **Label Groups**: Organize labels into groups
- **Custom Filters with Logic**: Complex filters with AND/OR/NOT
- **Saved Views**: Save complete dashboard configurations
- **Timeline View**: Visualize marks chronologically
- **Calendar View**: See marks on calendar interface
- **Kanban Board**: Organize marks in columns by status/label
- **Mind Map View**: Visualize relationships between marks
- **Relationship Graph**: See connections between messages and contacts

### 4.10 Power User Features
- **Bulk Import**: Import marks from CSV/JSON
- **Regex Mark Matching**: Mark messages matching regex pattern
- **Custom CSS**: Inject custom styles for mark appearance
- **JavaScript Console**: Execute custom scripts on marks
- **Developer Mode**: Access to extension internals
- **Version Control**: Track changes to marks over time
- **Duplicate Detection**: Find and merge duplicate marks
- **Mark Templates**: Create reusable mark configurations
- **Quick Add**: Global shortcut to quick-mark from any app (browser-wide)

### 4.11 Privacy & Security (Advanced)
- **End-to-End Encryption**: Encrypt marks before cloud sync
- **Local LLM Support**: Use local AI models instead of cloud APIs
- **Incognito Mode Support**: Mark in private browsing
- **Password Protection**: Lock extension with password
- **Auto-Lock**: Lock after inactivity
- **Mark Expiration**: Auto-delete marks after X days
- **Secure Export**: Encrypted export files
- **Audit Log**: Complete log of all actions for security review

### 4.12 Mobile & Cross-Platform (Future)
- **Companion Mobile App**: Native iOS/Android app with sync
- **Progressive Web App**: Mobile-optimized web dashboard
- **Touch Gestures**: Swipe to mark/unmark on mobile
- **Mobile Notifications**: Push notifications on mobile devices
- **QR Code Sync**: Scan QR to pair mobile device
- **Universal Clipboard**: Copy marks on desktop, paste on mobile

---

## Feature Priority Matrix

| Category | Essential | Core | UX | Smart | Total |
|----------|-----------|------|-----|-------|-------|
| Features | 20 | 45 | 60 | 55 | 180 |
| Priority | P0 | P1 | P2 | P3 | - |
| Timeline | Week 1 | Week 2-4 | Week 5-8 | Week 9+ | - |

---

## Technical Implementation Notes

### Storage Requirements
- **Essential**: ~100KB (Chrome storage.local)
- **Core**: ~1MB (Chrome storage.sync)
- **UX**: ~5MB (IndexedDB for larger datasets)
- **Smart**: ~50MB+ (may need cloud backend)

### API Dependencies
- **Essential**: None (fully offline)
- **Core**: None (optional cloud backup)
- **UX**: Chrome Sync API, Notifications API, Alarms API
- **Smart**: OpenAI API, Google Cloud NLP, Calendar APIs, Task manager APIs

### Performance Targets
- Mark action response time: <100ms
- Dashboard load time: <500ms for 1000 marks
- Search results: <200ms for 5000 marks
- Memory usage: <50MB for extension
- DOM observation overhead: <1% CPU

---

## Competitive Analysis

### Similar Extensions
- **Todoist for Gmail**: Task creation from emails
- **Notion Web Clipper**: Save web content to Notion
- **Boomerang**: Email reminders and scheduling
- **Evernote Web Clipper**: Save articles and notes
- **Raindrop.io**: Bookmark manager with tags

### Our Differentiators
1. Multi-platform chat support (WhatsApp, Messenger, Instagram, LinkedIn)
2. In-place marking (see marks directly in chat, not just external list)
3. Smart AI categorization and action detection
4. Rich collaboration features for teams
5. Comprehensive analytics and insights
6. Flexible integration ecosystem

---

## Success Metrics

### User Engagement
- Daily active users (DAU)
- Marks created per user per day
- Retention rate (D1, D7, D30)
- Feature adoption rate

### Product Quality
- Mark reliability across platform updates
- Search accuracy and speed
- Sync success rate
- Error rate and crash-free rate

### User Satisfaction
- User ratings (Chrome Web Store)
- NPS score
- Feature request volume
- Support ticket volume

---

*Last Updated: 2025-10-29*
*Version: 1.0*
