# Popup / Side Panel

Dashboard interface for viewing and managing all marked chats.

---

## Overview

The popup is actually a **Side Panel** (Chrome 114+ API) that provides a persistent sidebar experience. Unlike traditional popups that close when you click away, the side panel stays open, making it perfect for a dashboard.

---

## Files

| File | Size | Description |
|------|------|-------------|
| `popup.html` | 332 lines | Structure and layout |
| `popup.css` | ~800 lines | Styles with CSS variables |
| `popup.js` | 1,870 lines | Logic, search, filters, modals |

---

## Architecture

### popup.html

**Structure**:
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <!-- Header with logo, settings, theme toggle -->
  <header class="header">...</header>

  <!-- Dashboard with sidebar and main content -->
  <div class="dashboard-container">
    <!-- Filters sidebar -->
    <aside class="dashboard-sidebar">...</aside>

    <!-- Main content area -->
    <main class="dashboard-main">
      <!-- Search bar -->
      <!-- Platform tabs -->
      <!-- Message list -->
      <!-- Footer -->
    </main>
  </div>

  <!-- Modals (settings, stats, notes, reminders) -->

  <!-- Toast notification -->

  <script src="../utils/storage.js"></script>
  <script src="popup.js"></script>
</body>
</html>
```

**Key Sections**:
1. **Header** - Logo, stats button, settings button, theme toggle
2. **Sidebar** - Statistics, label filters, date filters, actions
3. **Search** - Live search input with clear button
4. **Platform Tabs** - All / WhatsApp / Reddit
5. **Message List** - Chat cards with all details
6. **Modals** - Settings, Statistics, Notes, Reminders
7. **Toast** - Notification messages

---

### popup.css

**CSS Variables** for theming:
```css
:root {
  /* Colors */
  --color-primary: #6366F1;
  --color-urgent: #EF4444;
  --color-important: #F59E0B;
  --color-completed: #10B981;
  --color-followup: #3B82F6;
  --color-question: #8B5CF6;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-base: 16px;
  --space-lg: 24px;

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

body.dark-mode {
  --color-background: #0F172A;
  --color-text-primary: #F1F5F9;
  /* ... override light values */
}
```

**Component Styles**:
- Header
- Sidebar (filters, stats)
- Search bar
- Platform tabs
- Message cards
- Modals
- Buttons
- Forms
- Empty states
- Loading states
- Toast notifications

**Dark Mode**:
All colors defined as CSS variables that get overridden in `body.dark-mode` selector.

---

### popup.js

**Main Functions**:

#### Initialization
```javascript
document.addEventListener('DOMContentLoaded', init);

async function init() {
  loadSettings();
  loadMarkers();
  setupEventListeners();
  applyTheme();
}
```

#### Data Loading
```javascript
async function loadAllMarkers() {
  const response = await chrome.runtime.sendMessage({
    action: 'getAllChatMarkers'
  });

  allChatMarkers = response.data || [];
  displayChatMarkers();
}
```

#### Search & Filtering
```javascript
function filterAndDisplay() {
  let filtered = allChatMarkers;

  // Platform filter
  if (currentPlatform !== 'all') {
    filtered = filtered.filter(c => c.platform === currentPlatform);
  }

  // Search filter
  if (searchQuery) {
    filtered = filtered.filter(c =>
      c.chatName.toLowerCase().includes(searchQuery) ||
      c.notes?.toLowerCase().includes(searchQuery)
    );
  }

  // Label filter
  const enabledLabels = getEnabledLabels();
  filtered = filtered.filter(c =>
    c.labels?.some(l => enabledLabels.includes(l))
  );

  // Date filter
  const dateRange = getCurrentDateRange();
  filtered = filtered.filter(c =>
    c.timestamp >= dateRange.start && c.timestamp <= dateRange.end
  );

  displayChatMarkers(filtered);
}
```

#### Rendering
```javascript
function displayChatMarkers(markers) {
  const container = document.getElementById('messageList');
  container.innerHTML = '';

  if (markers.length === 0) {
    showEmptyState();
    return;
  }

  markers.forEach(marker => {
    const card = createChatCard(marker);
    container.appendChild(card);
  });
}

function createChatCard(marker) {
  const card = document.createElement('div');
  card.className = 'chat-card';
  card.innerHTML = `
    <div class="chat-header">
      <span class="platform-icon">${getPlatformIcon(marker.platform)}</span>
      <strong>${marker.chatName}</strong>
    </div>
    <div class="chat-labels">
      ${marker.labels?.map(l => `<span class="label-badge ${l}">${l}</span>`).join('')}
    </div>
    ${marker.notes ? `<div class="chat-notes">${marker.notes}</div>` : ''}
    <div class="chat-footer">
      <span class="chat-date">${formatDate(marker.timestamp)}</span>
      <button class="btn-edit">Edit</button>
    </div>
  `;

  card.addEventListener('click', () => navigateToChat(marker));

  return card;
}
```

#### Navigation
```javascript
async function navigateToChat(marker) {
  await chrome.runtime.sendMessage({
    action: 'navigateToMessage',
    messageId: marker.messageId
  });
}
```

#### Modals
```javascript
function showSettingsModal() {
  const modal = document.getElementById('settingsModal');
  modal.style.display = 'flex';

  // Populate current settings
  document.getElementById('themeSelect').value = currentSettings.theme || 'auto';
  // ...
}

function saveSettings() {
  const settings = {
    theme: document.getElementById('themeSelect').value,
    notificationSound: document.getElementById('notificationSound').checked,
    compactMode: document.getElementById('compactMode').checked
  };

  chrome.runtime.sendMessage({
    action: 'updateSettings',
    settings: settings
  });

  applyTheme(settings.theme);
  closeSettingsModal();
}
```

#### Statistics
```javascript
function showStatistics() {
  const stats = calculateStatistics(allChatMarkers);

  const statsBody = document.getElementById('statsBody');
  statsBody.innerHTML = `
    <div class="stat-row">
      <span>Total Marked Chats:</span>
      <strong>${stats.total}</strong>
    </div>
    <div class="stat-row">
      <span>WhatsApp:</span>
      <strong>${stats.whatsapp}</strong>
    </div>
    <div class="stat-row">
      <span>Reddit:</span>
      <strong>${stats.reddit}</strong>
    </div>
    <div class="stat-row">
      <span>Urgent:</span>
      <strong>${stats.urgent}</strong>
    </div>
    <!-- ... more stats -->
  `;

  document.getElementById('statsModal').style.display = 'flex';
}
```

#### Export/Import
```javascript
async function exportData() {
  const data = await chrome.runtime.sendMessage({ action: 'exportData' });

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chatmarker-backup-${Date.now()}.json`;
  a.click();
}

async function importData() {
  const input = document.getElementById('importFileInput');
  const file = input.files[0];

  const text = await file.text();
  const data = JSON.parse(text);

  await chrome.runtime.sendMessage({
    action: 'importData',
    data: data
  });

  loadAllMarkers(); // Refresh display
}
```

---

## Features

### 1. Platform Tabs
- **All Chats** - Show marks from all platforms
- **WhatsApp** - Filter to WhatsApp only
- **Reddit** - Filter to Reddit only
- Tab counts update automatically

### 2. Live Search
- Real-time filtering as you type
- Searches chat names and notes
- Debounced for performance (300ms)
- Clear button appears when typing

### 3. Label Filters
- Checkboxes for each label type
- Multi-select (show chats with ANY selected label)
- Updates instantly when toggled

### 4. Date Filters
- Radio buttons for date ranges
- Options: All Time, Today, This Week, This Month
- Custom range coming soon

### 5. Statistics
- Total marked chats
- Breakdown by platform
- Breakdown by label
- Active reminders count

### 6. Settings
- Theme selection (Auto/Light/Dark)
- Notification sound toggle
- Compact mode toggle
- Export/import data
- Clear all marks

### 7. Empty States
- **No marks**: Shows instructions
- **No results**: "Try adjusting filters"
- **Loading**: Spinner while fetching

### 8. Responsive
- Adapts to sidebar width
- Compact mode for more items
- Mobile-friendly (though extension is desktop-only)

---

## State Management

### Global State
```javascript
// Data
let allChatMarkers = [];
let allReminders = {};
let currentSettings = {};

// UI State
let currentPlatform = 'all';
let searchQuery = '';
let enabledLabels = ['urgent', 'important', 'completed', 'followup', 'question'];
let currentDateFilter = 'all';
```

### Storage Listeners
```javascript
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.chatMarkers) {
    loadAllMarkers(); // Refresh when data changes
  }
});
```

---

## Performance

### Optimizations
1. **Debounced Search** - 300ms delay
2. **Client-Side Filtering** - No storage calls for filters
3. **Efficient Rendering** - DocumentFragment for batch DOM updates
4. **CSS Animations** - Hardware-accelerated transforms

### Benchmarks
- Load 100 markers: < 500ms
- Search: < 50ms
- Filter: < 100ms
- Render: < 200ms

---

## Styling Guidelines

### Layout
- Sidebar: 260px fixed width
- Main content: Flex 1 (grows)
- Search bar: 100% width with padding
- Cards: Full width with 12px margin

### Colors
Use CSS variables for consistency:
```css
.urgent { background: var(--color-urgent); }
.important { background: var(--color-important); }
```

### Spacing
Use CSS variable scale:
```css
.card { padding: var(--space-base); }
.compact .card { padding: var(--space-sm); }
```

### Typography
```css
h1 { font-size: 24px; font-weight: 600; }
h2 { font-size: 20px; font-weight: 600; }
body { font-size: 14px; }
.small { font-size: 12px; }
```

---

## Development

### Adding a New Modal

1. **Add HTML** in `popup.html`:
```html
<div class="modal" id="myModal" style="display: none;">
  <div class="modal-content">
    <!-- content -->
  </div>
</div>
```

2. **Add trigger** in popup.js:
```javascript
document.getElementById('myBtn').addEventListener('click', showMyModal);
```

3. **Implement show/hide**:
```javascript
function showMyModal() {
  document.getElementById('myModal').style.display = 'flex';
}

function closeMyModal() {
  document.getElementById('myModal').style.display = 'none';
}
```

### Adding a New Filter

1. **Add UI** in sidebar
2. **Update filtering logic**:
```javascript
function filterAndDisplay() {
  let filtered = allChatMarkers;

  // Add your filter logic
  if (myFilterCondition) {
    filtered = filtered.filter(/* ... */);
  }

  displayChatMarkers(filtered);
}
```

---

## Testing

### Manual Tests
1. Load extension
2. Click extension icon
3. Verify sidebar opens
4. Check all features:
   - Search works
   - Filters work
   - Platform tabs work
   - Modals open/close
   - Dark mode toggles
   - Export/import works
   - Settings save

### Edge Cases
- Empty state (no marks)
- Many marks (100+)
- Long chat names
- Long notes
- All labels on one chat
- No results from search

---

## Known Issues

1. **Side Panel API** - Requires Chrome 114+
2. **No Mobile** - Desktop only
3. **Fixed Width** - Can't resize sidebar (Chrome limitation)

---

## Future Improvements

- [ ] Virtual scrolling for 1000+ marks
- [ ] Advanced date range picker
- [ ] Bulk operations (select multiple chats)
- [ ] Drag-and-drop reordering
- [ ] Export to CSV
- [ ] Search highlighting
- [ ] Keyboard shortcuts
- [ ] Custom themes

---

*Last Updated: 2025-11-01*
