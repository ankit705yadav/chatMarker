# ChatMarker - Design Specification (No Code)

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Design System](#design-system)
3. [Component Library](#component-library)
4. [Screen Designs](#screen-designs)
5. [Platform-Specific Designs](#platform-specific-designs)
6. [User Flows](#user-flows)
7. [Interaction Patterns](#interaction-patterns)
8. [Responsive Design](#responsive-design)

---

## Design Philosophy

### Core Principles
1. **Non-Intrusive**: Blend seamlessly with existing platform UI
2. **Quick & Efficient**: Every action should be 1-2 clicks maximum
3. **Visually Clear**: Marks should be immediately recognizable
4. **Consistent**: Same experience across all platforms
5. **Accessible**: Support keyboard navigation and screen readers

### Visual Style
- **Modern Minimalism**: Clean, uncluttered interface
- **Friendly & Professional**: Approachable but capable
- **Clarity First**: Information hierarchy is obvious
- **Subtle Animations**: Smooth, purposeful transitions

---

## Design System

### Color Palette

#### Primary Colors
```
Brand Primary:   #6366F1 (Indigo)     - Main brand color, CTAs
Brand Secondary: #8B5CF6 (Purple)     - Accents, hover states
Brand Dark:      #4338CA (Dark Indigo) - Active states
```

#### Label Colors
```
Red:     #EF4444  - Urgent, high priority
Yellow:  #F59E0B  - Important, needs attention
Green:   #10B981  - Completed, approved
Blue:    #3B82F6  - Follow-up, information
Purple:  #8B5CF6  - Question, review
Pink:    #EC4899  - Personal
Orange:  #F97316  - Deadline
Teal:    #14B8A6  - Waiting
```

#### Neutral Colors (Light Mode)
```
Background:     #FFFFFF
Surface:        #F9FAFB
Border:         #E5E7EB
Text Primary:   #111827
Text Secondary: #6B7280
Text Tertiary:  #9CA3AF
Divider:        #E5E7EB
```

#### Neutral Colors (Dark Mode)
```
Background:     #0F172A
Surface:        #1E293B
Border:         #334155
Text Primary:   #F1F5F9
Text Secondary: #94A3B8
Text Tertiary:  #64748B
Divider:        #334155
```

#### Semantic Colors
```
Success:  #10B981
Warning:  #F59E0B
Error:    #EF4444
Info:     #3B82F6
```

### Typography

#### Font Family
```
Primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Mono:    'JetBrains Mono', 'Fira Code', monospace
```

#### Font Sizes
```
xs:   11px  - Timestamps, badges
sm:   13px  - Secondary text, labels
base: 14px  - Body text, buttons
md:   16px  - Headings (small)
lg:   18px  - Headings (medium)
xl:   20px  - Headings (large)
2xl:  24px  - Page titles
```

#### Font Weights
```
Regular:    400 - Body text
Medium:     500 - Labels, secondary headings
Semibold:   600 - Buttons, primary headings
Bold:       700 - Emphasis
```

#### Line Heights
```
Tight:   1.25 - Headings
Normal:  1.5  - Body text
Relaxed: 1.75 - Long-form content
```

### Spacing Scale
```
xs:  4px   - Tight spacing
sm:  8px   - Icon padding
md:  12px  - Component padding
base: 16px - Standard spacing
lg:  24px  - Section spacing
xl:  32px  - Large gaps
2xl: 48px  - Page spacing
```

### Border Radius
```
sm:   4px  - Buttons, inputs
md:   6px  - Cards, tooltips
lg:   8px  - Modals, large cards
xl:   12px - Containers
full: 9999px - Pills, badges
```

### Shadows
```
sm:   0 1px 2px rgba(0,0,0,0.05)
base: 0 2px 4px rgba(0,0,0,0.08)
md:   0 4px 8px rgba(0,0,0,0.1)
lg:   0 8px 16px rgba(0,0,0,0.12)
xl:   0 12px 24px rgba(0,0,0,0.15)
```

### Animations
```
Duration:
  fast:   150ms - Hover states
  base:   250ms - Standard transitions
  slow:   350ms - Complex animations

Easing:
  in:     cubic-bezier(0.4, 0, 1, 1)
  out:    cubic-bezier(0, 0, 0.2, 1)
  inOut:  cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Component Library

### 1. Mark Icon (In-Chat)

#### Star Icon (Default)
```
┌─────┐
│  ★  │  Small, 16x16px
└─────┘
```

**Specifications**:
- Size: 16x16px
- Position: Top-right corner of message bubble
- Colors:
  - Unmarked: Transparent with #6B7280 border (on hover)
  - Marked: #F59E0B (yellow star, filled)
  - With Label: Match label color
- States:
  - Default: Hidden
  - Hover: Show outline
  - Marked: Show filled
  - With Reminder: Add small clock badge (⏰)
- Interaction: Click to toggle mark/unmark

#### Alternative Icons
```
Flag:     🚩  (16x16px, can use for high priority)
Bookmark: 🔖  (16x16px, alternative style)
Dot:      ●   (12x12px, minimal style)
Heart:    ♥   (16x16px, personal messages)
```

### 2. Label Badge

#### Design
```
┌──────────────┐
│  Important   │  Pill-shaped badge
└──────────────┘
```

**Specifications**:
- Height: 20px
- Padding: 4px 8px
- Border Radius: 10px (full pill)
- Font: 11px, Medium (500)
- Position: Below message or next to sender name
- Multiple labels: Stack or inline with 4px gap

**Variants**:
```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Urgent   │ │Important │ │Follow-up │
└──────────┘ └──────────┘ └──────────┘
  #EF4444      #F59E0B      #3B82F6
```

### 3. Note Indicator

```
┌────┐
│ 📝 │  Note icon
└────┘
```

**Specifications**:
- Icon: 📝 (or custom note icon)
- Size: 14x14px
- Position: Next to mark icon
- Tooltip on Hover: Show note preview (max 100 chars)
- Click: Open note editor

### 4. Reminder Badge

```
┌──────────┐
│ ⏰ 2h    │  Time badge
└──────────┘
```

**Specifications**:
- Icon: ⏰ (clock)
- Size: 14x14px + text
- Text: Relative time ("2h", "1d", "3w")
- Background: Semi-transparent dark (#000000 20%)
- Position: Top-left of message
- Tooltip: Full date/time

### 5. Priority Indicator

```
High:    🔴 or [!]
Medium:  🟡 or [-]
Low:     ⚪ or [ ]
```

**Specifications**:
- Size: 12x12px
- Position: Left border of message (vertical strip)
- Alternative: Small circle next to sender name

### 6. Context Menu (Right-Click)

```
┌─────────────────────────────┐
│  ⭐ Mark Message            │
│  🏷️  Add Label          →   │
│  📝 Add Note                │
│  ⏰ Set Reminder        →   │
│  ────────────────────       │
│  ⚡ Priority           →   │
│  🗑️  Remove Mark            │
└─────────────────────────────┘
```

**Specifications**:
- Width: 240px
- Padding: 4px
- Background: Surface color with shadow-lg
- Border Radius: 8px
- Menu Item Height: 36px
- Menu Item Padding: 8px 12px
- Hover: Background changes to light gray
- Icons: 16x16px, left-aligned
- Submenu Arrow: Right-aligned chevron (→)

**Submenu - Labels**:
```
┌─────────────────────────────┐
│  ● Red - Urgent             │
│  ● Yellow - Important       │
│  ● Green - Completed        │
│  ● Blue - Follow-up         │
│  ● Purple - Question        │
│  ────────────────────       │
│  ➕ Create Custom Label     │
└─────────────────────────────┘
```

**Submenu - Reminders**:
```
┌─────────────────────────────┐
│  ⏰ 1 Hour                  │
│  ⏰ 3 Hours                 │
│  ⏰ Tomorrow (9 AM)         │
│  ⏰ Next Week (Mon 9 AM)   │
│  ────────────────────       │
│  📅 Custom Date & Time      │
└─────────────────────────────┘
```

### 7. Buttons

#### Primary Button
```
┌──────────────┐
│  Add Label   │  Solid background
└──────────────┘
```
- Height: 36px
- Padding: 8px 16px
- Background: #6366F1
- Text: #FFFFFF, 14px, Semibold
- Border Radius: 6px
- Hover: Background → #4338CA
- Active: Scale 0.98

#### Secondary Button
```
┌──────────────┐
│   Cancel     │  Outline style
└──────────────┘
```
- Height: 36px
- Padding: 8px 16px
- Background: Transparent
- Border: 1px solid #E5E7EB
- Text: #6B7280, 14px, Medium
- Hover: Background → #F9FAFB

#### Icon Button
```
┌────┐
│ 🗑️ │  Icon only
└────┘
```
- Size: 32x32px
- Padding: 8px
- Background: Transparent
- Hover: Background → #F9FAFB
- Border Radius: 6px

### 8. Input Fields

#### Text Input
```
┌──────────────────────────────┐
│ Search messages...           │
└──────────────────────────────┘
```
- Height: 40px
- Padding: 10px 12px
- Border: 1px solid #E5E7EB
- Border Radius: 6px
- Font: 14px, Regular
- Placeholder: #9CA3AF
- Focus: Border → #6366F1, shadow-sm

#### Text Area (Notes)
```
┌──────────────────────────────┐
│ Add a note...                │
│                              │
│                              │
└──────────────────────────────┘
```
- Min Height: 80px
- Max Height: 200px
- Padding: 12px
- Auto-resize as user types
- Character counter: Bottom-right (500/500)

### 9. Dropdown

```
┌──────────────────────────────┐
│ All Platforms           ▼   │
└──────────────────────────────┘

When open:
┌──────────────────────────────┐
│ All Platforms           ▲   │
├──────────────────────────────┤
│ ✓ All Platforms              │
│   WhatsApp                   │
│   Messenger                  │
│   Instagram                  │
│   LinkedIn                   │
└──────────────────────────────┘
```

### 10. Toggle Switch

```
OFF:  ○──────   (Gray)
ON:   ──────●   (Brand Primary)
```
- Width: 44px
- Height: 24px
- Knob: 20px circle
- Animation: 250ms ease-out
- Use for: Dark mode, settings

### 11. Checkbox

```
Unchecked:  ☐
Checked:    ☑
```
- Size: 18x18px
- Border: 2px solid #E5E7EB
- Checked: Background #6366F1, white checkmark
- Use for: Multi-select in lists

### 12. Badge (Count)

```
┌────┐
│ 12 │  Small pill
└────┘
```
- Height: 20px
- Padding: 3px 6px
- Background: #EF4444 (for counts/alerts)
- Text: #FFFFFF, 11px, Semibold
- Border Radius: 10px
- Use for: Notification counts, filter counts

---

## Screen Designs

### 1. Extension Popup (Main View)

```
┌─────────────────────────────────────────────────────────┐
│  ┌─────┐ ChatMarker                      [⚙️] [🌙]    │  Header
│  │  ★  │                                               │  (60px)
│  └─────┘                                               │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐  │  Search
│  │  🔍  Search messages...                         │  │  (52px)
│  └─────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  [All Platforms ▼]  [All Labels ▼]  [All Time ▼]      │  Filters
│                                                         │  (48px)
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐  │
│  │ 🟢 WhatsApp • John Doe • 2h ago                 │  │  Message
│  │ Let's schedule the meeting for tomorrow...      │  │  Card 1
│  │ ┌─────────┐ ┌──────────┐                        │  │  (Auto)
│  │ │Important│ │Follow-up │  [📝] [⏰ 1d] [⋮]     │  │
│  │ └─────────┘ └──────────┘                        │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 🔵 Messenger • Sarah Smith • 5h ago             │  │  Message
│  │ Can you send me the files?                      │  │  Card 2
│  │ ┌─────────┐                                     │  │  (Auto)
│  │ │Urgent   │              [⋮]                    │  │
│  │ └─────────┘                                     │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 📷 Instagram • Alex Chen • 1d ago               │  │  Message
│  │ Great idea! Let's do it.                        │  │  Card 3
│  │ ┌─────────┐                                     │  │  (Auto)
│  │ │Completed│              [📝] [⋮]               │  │
│  │ └─────────┘                                     │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 💼 LinkedIn • Mike Johnson • 3d ago             │  │  Message
│  │ Interested in the position...                   │  │  Card 4
│  │                             [⋮]                 │  │  (Auto)
│  └─────────────────────────────────────────────────┘  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Showing 4 of 47 marked messages                       │  Footer
│  [View All in Dashboard →]                             │  (48px)
└─────────────────────────────────────────────────────────┘

Dimensions: 400px × 600px
```

**Component Breakdown**:

**Header (60px)**:
- Logo + Title (left)
- Settings icon (top-right)
- Dark mode toggle (top-right)

**Search Bar (52px)**:
- Full-width input
- Search icon (left)
- Clear button (right, appears when typing)

**Filter Bar (48px)**:
- 3 dropdown filters, equal width
- Icon + text + chevron

**Message Cards**:
- Padding: 16px
- Border: 1px solid #E5E7EB
- Border Radius: 8px
- Margin: 12px
- Shadow: shadow-sm on hover
- Platform Icon: 20x20px
- Sender: Semibold, 14px
- Time: 13px, text-secondary
- Preview: 14px, text-primary, 2 lines max (ellipsis)
- Labels: Inline, 4px gap
- Action Icons: Right-aligned
- Click anywhere: Navigate to message in chat

**Footer (48px)**:
- Summary text (left)
- Link to dashboard (right)

### 2. Extension Popup (Empty State)

```
┌─────────────────────────────────────────────────────────┐
│  ┌─────┐ ChatMarker                      [⚙️] [🌙]    │
│  │  ★  │                                               │
│  └─────┘                                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│                    ┌─────────┐                         │
│                    │    ★    │                         │
│                    │         │                         │
│                    └─────────┘                         │
│                                                         │
│              No marked messages yet                    │
│                                                         │
│     Right-click any message on WhatsApp, Messenger,    │
│     Instagram, or LinkedIn and select "Mark Message"   │
│                                                         │
│              ┌──────────────────┐                      │
│              │  View Tutorial   │                      │
│              └──────────────────┘                      │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3. Dashboard View (Full Screen)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  ChatMarker Dashboard                          [🔍 Search] [⚙️] [🌙] [✕] │  Header
├───────────────────────────────────────────────────────────────────────────┤
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐                    │  Tab Bar
│  │ All (47)│WhatsApp │Messenger│Instagram│LinkedIn │  + More Filters    │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘                    │
├────────────┬──────────────────────────────────────────────────────────────┤
│            │                                                              │
│  Filters   │  ┌──────────────────────────────────────────────────────┐  │
│  ─────────│  │ 🟢 WhatsApp • John Doe • Meeting Room              │  │
│            │  │ Let's schedule the meeting for tomorrow at 2pm     │  │
│  Labels    │  │ 2 hours ago                                         │  │
│  ────────│  │ ┌─────────┐ ┌──────────┐                           │  │
│  ☑ Urgent  │  │ │Important│ │Follow-up │  [📝] [⏰ 1d]  [⋮]      │  │
│  ☑ Import  │  │ └─────────┘ └──────────┘                           │  │
│  ☐ Complet │  └──────────────────────────────────────────────────────┘  │
│  ☑ Follow  │                                                              │
│  ☐ Question│  ┌──────────────────────────────────────────────────────┐  │
│            │  │ 🔵 Messenger • Sarah Smith • Project Team           │  │
│  Priority  │  │ Can you send me the updated files?                  │  │
│  ────────│  │ 5 hours ago                                         │  │
│  ☑ High    │  │ ┌─────────┐                                        │  │
│  ☑ Medium  │  │ │Urgent   │                      [⋮]              │  │
│  ☐ Low     │  │ └─────────┘                                        │  │
│            │  └──────────────────────────────────────────────────────┘  │
│  Date      │                                                              │
│  ────────│  ┌──────────────────────────────────────────────────────┐  │
│  ⚪ Today   │  │ 📷 Instagram • Alex Chen • Travel Plans             │  │
│  ⚪ Week    │  │ Great idea! Let's do it this weekend.               │  │
│  ⚪ Month   │  │ 1 day ago                                           │  │
│  ⚪ All     │  │ ┌─────────┐                                        │  │
│            │  │ │Completed│              [📝]  [⋮]                 │  │
│  ──────── │  │ └─────────┘                                        │  │
│            │  └──────────────────────────────────────────────────────┘  │
│  Actions   │                                                              │
│  ────────│  ┌──────────────────────────────────────────────────────┐  │
│  Export    │  │ 💼 LinkedIn • Mike Johnson • Job Opening            │  │
│  Clear All │  │ Very interested in the Senior Developer position   │  │
│            │  │ 3 days ago                                          │  │
│            │  │                                 [⋮]                │  │
│            │  └──────────────────────────────────────────────────────┘  │
│            │                                                              │
│  ┌───────┐│  ...more messages...                                       │
│  │47 Marks││                                                              │
│  │12 Rem. ││                                                              │
│  └───────┘│                                                              │
└────────────┴──────────────────────────────────────────────────────────────┘

Dimensions: Min 1024px × 768px (responsive)
```

**Layout**:
- **Sidebar**: 240px fixed width, filters and stats
- **Main Area**: Flexible width, message list
- **Cards**: Max width 800px, centered

### 4. Settings Panel

```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Messages              Settings          [✕]  │  Header
├─────────────────────────────────────────────────────────┤
│  ┌────────────┬──────────────────────────────────────┐ │
│  │ General    │                                      │ │
│  ├────────────┤  General Settings                    │ │
│  │ Appearance │  ─────────────────                   │ │
│  ├────────────┤                                      │ │
│  │ Notificat. │  Theme                               │ │
│  ├────────────┤  ┌─────────────────────────────┐    │ │
│  │ Platforms  │  │ Auto (System Default)    ▼ │    │ │
│  ├────────────┤  └─────────────────────────────┘    │ │
│  │ Data       │                                      │ │
│  ├────────────┤  ┌───┐                               │ │
│  │ Advanced   │  │   │ Enable dark mode             │ │
│  ├────────────┤  └───┘                               │ │
│  │ About      │                                      │ │
│  └────────────┘  Extension Icon                      │ │
│                  ⭐ Star  🚩 Flag  🔖 Bookmark  ●Dot │ │
│                                                       │ │
│                  Default View                         │ │
│                  ⚪ Popup  ⚪ Dashboard               │ │
│                                                       │ │
│                  ──────────────────────────────────  │ │
│                                                       │ │
│                  Appearance                           │ │
│                  ───────────                          │ │
│                                                       │ │
│                  Font Size                            │ │
│                  ◄────────●────────►                 │ │
│                  Small    Medium    Large             │ │
│                                                       │ │
│                  Compact Mode                         │ │
│                  ┌───┐                                │ │
│                  │ ✓ │ Show more items on screen     │ │
│                  └───┘                                │ │
│                                                       │ │
└─────────────────────────────────────────────────────────┘
```

### 5. Note Editor Modal

```
┌─────────────────────────────────────────────────────────┐
│  Add Note                                          [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Message Preview:                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ "Let's schedule the meeting for tomorrow..."    │  │
│  │ From: John Doe • WhatsApp • 2h ago              │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  Your Note:                                             │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Need to check my calendar first before          │  │
│  │ confirming the time. Also ask about the         │  │
│  │ agenda.                                          │  │
│  │                                                  │  │
│  │                                                  │  │
│  └─────────────────────────────────────────────────┘  │
│                                            127 / 500   │
│                                                         │
│              ┌────────┐  ┌──────────────┐             │
│              │ Cancel │  │  Save Note   │             │
│              └────────┘  └──────────────┘             │
│                                                         │
└─────────────────────────────────────────────────────────┘

Dimensions: 500px × 400px (centered overlay)
```

### 6. Reminder Picker

```
┌─────────────────────────────────────────────────────────┐
│  Set Reminder                                      [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Quick Options:                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │
│  │  ⏰ 1 Hour  │ │  ⏰ 3 Hours │ │ ⏰ Tomorrow  │     │
│  └─────────────┘ └─────────────┘ └─────────────┘     │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐                      │
│  │⏰ Next Week │ │  📅 Custom  │                      │
│  └─────────────┘ └─────────────┘                      │
│                                                         │
│  ──────────────────────────────────────────────────   │
│                                                         │
│  Custom Date & Time:                                    │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │  Dec 25, 2024 ▼ │  │     09:00 AM  ▼ │           │
│  └──────────────────┘  └──────────────────┘           │
│                                                         │
│  ┌───┐                                                 │
│  │   │ Repeat reminder                                │
│  └───┘ [Daily ▼]                                       │
│                                                         │
│  Notification Message: (Optional)                      │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Follow up on meeting time                       │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│              ┌────────┐  ┌──────────────┐             │
│              │ Cancel │  │ Set Reminder │             │
│              └────────┘  └──────────────┘             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7. Browser Notification

```
┌─────────────────────────────────────────────┐
│  ⭐ ChatMarker Reminder            [⚙️] [✕]│
├─────────────────────────────────────────────┤
│  John Doe (WhatsApp)                        │
│  "Let's schedule the meeting for..."        │
│                                             │
│  Your note: Check calendar first            │
│                                             │
│  ┌────────────┐  ┌────────────┐            │
│  │ View Message│  │  Snooze ▼ │            │
│  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────┘
```

---

## Platform-Specific Designs

### WhatsApp Web Integration

```
WhatsApp Chat Window:
┌─────────────────────────────────────────────────────────────┐
│  John Doe                                          🔍 ⋮     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        ┌──────────────────────┐     ★      │ ← Mark Icon
│                        │ Hey, how are you?    │            │   (top-right)
│                        └──────────────────────┘            │
│                        10:30 AM                             │
│                                                             │
│  ┌──────────────────────┐                                  │
│  │ I'm good, thanks!    │                                  │
│  └──────────────────────┘                                  │
│  10:31 AM                                                   │
│                                                             │
│                        ┌──────────────────────┐     ★      │ ← Marked
│                        │ Let's schedule the   │    📝      │   + Note
│                        │ meeting for tomorrow │            │
│                        └──────────────────────┘            │
│                        ┌─────────┐ ⏰ 1d                   │ ← Label +
│                        │Important│                         │   Reminder
│                        └─────────┘                         │
│                        10:32 AM                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Integration Points**:
1. Mark icon appears on hover (top-right of bubble)
2. Labels appear below message bubble
3. Reminder badge overlays top-left
4. Note icon next to mark icon
5. Right-click message → ChatMarker menu

**Positioning**:
- Message bubble selector: `div[class*="message-"]`
- Icon position: `position: absolute; top: 4px; right: 4px;`
- Label position: Below bubble, `margin-top: 4px;`

### Messenger Integration

```
Messenger Chat:
┌─────────────────────────────────────────────────────────────┐
│  ← Sarah Smith                              📞 🎥 ℹ️        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚪ Sarah Smith                                             │
│  Can you send the files?                              ★    │ ← Mark Icon
│  Just now                                                   │
│                                                             │
│                                              You ⚪         │
│                                            Sure, give me ★  │
│                                            a minute         │
│                                            Just now   📝    │
│                                            ┌─────────┐      │
│                                            │ Urgent  │      │
│                                            └─────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Instagram DM Integration

```
Instagram Direct:
┌─────────────────────────────────────────────────────────────┐
│  ← alex_chen                               ℹ️  📞 🎥        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  alex_chen                                                  │
│  Great idea! Let's do it. 😊                          ★    │
│  ┌─────────┐                                         📝    │
│  │Completed│                                               │
│  └─────────┘                                               │
│  2h                                                         │
│                                                             │
│                                                     you     │
│                                           Sounds good! ★    │
│                                           5m                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### LinkedIn Messaging Integration

```
LinkedIn Messages:
┌─────────────────────────────────────────────────────────────┐
│  Mike Johnson • 1st                           ⋮             │
│  Senior Recruiter at TechCorp                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Mike Johnson ⚪                                            │
│  Hi, I saw your profile and wanted to reach         ★      │
│  out about a position...                            📝      │
│  3 days ago                                                 │
│                                                             │
│                                              You ⚪         │
│                                   Thanks for reaching out!  │
│                                   1 day ago                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## User Flows

### Flow 1: Mark a Message

```
1. User hovers over message
   └─> Mark icon appears (faded)

2. User clicks mark icon
   └─> Icon fills with color (yellow star)
   └─> Message saved to storage
   └─> Toast notification: "Message marked" (bottom-right)

3. User hovers over marked message
   └─> Quick actions appear (Edit label, Add note, Set reminder)

Alternative: Right-click flow
1. User right-clicks message
   └─> Context menu appears

2. User clicks "Mark Message"
   └─> Message is marked
   └─> Submenu opens for label selection
```

### Flow 2: Add Label & Note

```
1. User marks message (see Flow 1)

2. User clicks "Add Label" from quick actions
   └─> Label picker appears (inline or modal)

3. User selects "Important" (yellow)
   └─> Yellow badge appears below message
   └─> Storage updated

4. User clicks "Add Note"
   └─> Note modal opens

5. User types note and clicks "Save"
   └─> Note icon (📝) appears next to mark
   └─> Modal closes with fade animation
```

### Flow 3: Set Reminder

```
1. User has marked message

2. User clicks reminder icon or right-click → "Set Reminder"
   └─> Reminder picker modal opens

3. User clicks "Tomorrow (9 AM)"
   └─> Modal closes
   └─> Reminder badge (⏰) appears on message
   └─> Toast: "Reminder set for Dec 25, 9:00 AM"

4. Tomorrow at 9 AM:
   └─> Browser notification appears
   └─> Badge icon on extension shows "1"
   └─> User clicks "View Message"
   └─> Tab switches to platform, scrolls to message
```

### Flow 4: Search & Filter

```
1. User opens popup

2. User types "meeting" in search
   └─> List filters in real-time
   └─> Matching text highlighted in yellow
   └─> Count updates: "Showing 3 of 47"

3. User selects "WhatsApp" filter
   └─> List shows only WhatsApp messages matching "meeting"
   └─> Count updates: "Showing 2 of 47"

4. User clicks clear (✕) in search
   └─> Filter remains, search clears
   └─> Shows all WhatsApp messages
```

### Flow 5: Navigate to Message

```
1. User opens popup or dashboard

2. User sees marked message in list

3. User clicks on message card
   └─> Extension opens/switches to platform tab
   └─> Scrolls to message in conversation
   └─> Highlights message briefly (pulse animation)
   └─> Popup closes automatically
```

---

## Interaction Patterns

### Hover States

**Message Card in Popup**:
```
Default:  border: 1px solid #E5E7EB
Hover:    border: 1px solid #6366F1
          box-shadow: 0 4px 8px rgba(99,102,241,0.1)
          cursor: pointer
```

**Mark Icon in Chat**:
```
Not Marked + Hover:    Opacity 0.5, outline star
Marked + Hover:        Scale 1.1, filled star
```

**Buttons**:
```
Primary:
  Default → Hover → Active
  #6366F1 → #4338CA → scale(0.98)

Secondary:
  Default → Hover
  transparent → #F9FAFB
```

### Click Feedback

**Mark Toggle**:
```
Click → Scale 0.9 (50ms) → Scale 1.1 (100ms) → Scale 1 (100ms)
Color fills during animation
```

**Button Click**:
```
Click → Scale 0.98 (100ms) → Action executes
```

### Loading States

**Popup Opening**:
```
Frame 1: Skeleton cards (3 gray rectangles)
Frame 2: Fade in actual content (250ms)
```

**Search Loading**:
```
Spinner appears in search box after 300ms of typing
Results update when complete
```

### Animations

**Toast Notification**:
```
Enter: Slide up from bottom + fade in (250ms ease-out)
Stay: 3 seconds
Exit: Fade out (200ms ease-in)
```

**Modal Open/Close**:
```
Open:
  - Backdrop fade in (150ms)
  - Modal scale from 0.95 to 1 + fade in (250ms ease-out)

Close:
  - Modal fade out (200ms)
  - Backdrop fade out (200ms)
```

**Mark Icon Appear**:
```
Hover on message:
  Icon fades in (150ms)
  Position: slide down 2px during fade

Click to mark:
  Scale pulse (200ms)
  Color fill (200ms)
```

### Transitions

```css
/* Fast transitions for hover */
transition: all 150ms ease-out;

/* Standard transitions for state changes */
transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);

/* Slow transitions for complex animations */
transition: all 350ms ease-in-out;
```

---

## Responsive Design

### Popup Sizes

```
Minimum:  360px × 500px
Default:  400px × 600px
Maximum:  480px × 800px
```

### Dashboard Breakpoints

```
Mobile (< 768px):
  - Hide sidebar
  - Filters in collapsible drawer
  - Single column layout
  - Full-width cards

Tablet (768px - 1024px):
  - Sidebar: 200px
  - Cards: Full width
  - Two-column filter grid

Desktop (> 1024px):
  - Sidebar: 240px
  - Cards: Max 800px, centered
  - All filters visible
```

### Touch Targets

```
Minimum touch target: 44px × 44px (mobile)
Desktop: 32px × 32px minimum

Spacing between targets: 8px minimum
```

---

## Accessibility

### Keyboard Navigation

```
Tab:        Move focus forward
Shift+Tab:  Move focus backward
Enter:      Activate button/link
Space:      Toggle checkbox/switch
Escape:     Close modal/menu
Arrow Keys: Navigate lists
```

### Focus Indicators

```
Default browser outline removed
Custom focus ring:
  - 2px solid #6366F1
  - 2px offset
  - border-radius matches element
```

### Screen Reader

```
All icons have aria-label
All buttons have descriptive text
Form inputs have associated labels
Loading states announced
Success/error messages announced
```

### Color Contrast

```
All text meets WCAG AA standards:
  - Normal text: 4.5:1
  - Large text: 3:1
  - UI components: 3:1
```

---

## Icon Library

### Platform Icons (20×20px)

```
WhatsApp:  🟢 (Green circle + phone icon)
Messenger: 🔵 (Blue messenger bubble)
Instagram: 📷 (Camera/gradient square)
LinkedIn:  💼 (Blue briefcase/IN logo)
```

### Action Icons (16×16px)

```
Mark:       ⭐ (star)
Label:      🏷️  (tag)
Note:       📝 (memo)
Reminder:   ⏰ (alarm clock)
Priority:   🔴 (red circle) / ⚡ (lightning)
Delete:     🗑️  (trash)
Edit:       ✏️  (pencil)
Settings:   ⚙️  (gear)
Search:     🔍 (magnifying glass)
Filter:     🔽 (filter funnel)
More:       ⋮  (vertical dots)
Close:      ✕  (X)
Back:       ←  (left arrow)
Forward:    →  (right arrow)
Expand:     ▼  (chevron down)
Collapse:   ▲  (chevron up)
Check:      ✓  (checkmark)
Info:       ℹ️  (info circle)
Export:     📤 (outbox)
Import:     📥 (inbox)
Calendar:   📅 (calendar)
```

### Status Icons (12×12px)

```
High Priority:    🔴
Medium Priority:  🟡
Low Priority:     ⚪
Completed:        ✓ (in green circle)
Pending:          ⏳
Overdue:          🔴 (pulsing)
```

---

## Dark Mode Specifications

### Color Adjustments

```
Background:     #FFFFFF → #0F172A
Surface:        #F9FAFB → #1E293B
Border:         #E5E7EB → #334155
Text Primary:   #111827 → #F1F5F9
Text Secondary: #6B7280 → #94A3B8
```

### Shadows in Dark Mode

```
Reduce opacity by 50%:
shadow-sm: 0 1px 2px rgba(0,0,0,0.025)
shadow-md: 0 4px 8px rgba(0,0,0,0.05)

Or add subtle glow:
box-shadow: 0 0 0 1px rgba(255,255,255,0.05)
```

### Images & Icons

```
Reduce opacity: 90%
Filter: brightness(0.9)
Platform icons: Use dark variants if available
```

---

## Export Assets Needed

### Extension Icons
- icon-16.png (16×16px)
- icon-48.png (48×48px)
- icon-128.png (128×128px)

### Store Listing Graphics
- Small promo tile: 440×280px
- Marquee promo tile: 1400×560px
- Screenshots: 1280×800px or 640×400px (5 minimum)

### In-Extension Graphics
- Empty state illustration: 200×200px
- Logo: 48×48px
- Loading spinner: 32×32px (animated GIF or CSS)

---

## Design Checklist

### Before Development
- [ ] All colors defined with hex codes
- [ ] All font sizes and weights specified
- [ ] All spacing values documented
- [ ] All component states designed (default, hover, active, disabled)
- [ ] Dark mode variants created
- [ ] Accessibility requirements noted
- [ ] Responsive breakpoints defined
- [ ] All icons sourced or designed
- [ ] Animation timings specified

### During Development
- [ ] Test with real message content (long text, emojis, links)
- [ ] Test on all 4 platforms
- [ ] Test in light and dark mode
- [ ] Test at different screen sizes
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Test loading states
- [ ] Test error states
- [ ] Test empty states

### Before Launch
- [ ] All hover states work smoothly
- [ ] All animations are smooth (60fps)
- [ ] No layout shifts or jumps
- [ ] Consistent styling across all screens
- [ ] No console errors
- [ ] Extension icons look good
- [ ] Screenshots captured for store
- [ ] Demo video recorded

---

*Design Version: 1.0*
*Last Updated: 2025-10-29*
*Tool: Figma / Sketch / Adobe XD (recommended)*
