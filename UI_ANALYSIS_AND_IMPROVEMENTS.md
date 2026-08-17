# DockDaily UI/UX Comprehensive Audit & Visual Design System

---

## 1. Executive Summary

**DockDaily** is designed as an offline-first, local-SQLite daily planner and habit tracker with cloud synchronization and AI enhancements. The interface is intentionally lightweight and uncluttered, but the current UI suffers from:
1. **Color Inconsistencies & Theme Clashes**: Theme tokens are split between leftover template defaults (`#0a7ea4` cyan vs `#6366f1` indigo vs pure white buttons in dark mode).
2. **Missing Visual Hierarchy & Flat Elements**: Lists are flat rows with hairline borders, lacking tactile card depth, rounded capsules, and subtle elevation.
3. **Underutilized Data Attributes**: Database fields like `habit.color`, `task.priority` (high/med/low), `task.due_date`, and `task.notes` are already in SQLite and TypeScript models but have zero UI representation.
4. **Static Streaks & Heatmaps**: Habit streaks and consistency dots are binary and static (monochrome orange flames and single-color dots) instead of dynamically rewarding the user as their streak and consistency grow.

Below is the complete UI audit, screen-by-screen breakdown of missing features, and a cohesive, minimalist design and color progression system.

---

## 2. Global UI Inconsistencies & Theme Audit

### 2.1 Theme Token Mismatch in `constants/theme.ts`
- **Current Issue**:
  - `constants/theme.ts` defines `tintColorLight = '#0a7ea4'` (Cyan/Teal) and `tintColorDark = '#fff'`.
  - `app/(tabs)/_layout.tsx` hardcodes `tabBarActiveTintColor: '#6366f1'` (Indigo).
  - Screen buttons (Add button, Set reminder, Accept AI suggestion) use `colors.tint`. In Dark Mode, `colors.tint` is `#fff`, causing action buttons to become stark solid white blocks with black text, while in Light Mode they are cyan `#0a7ea4`, and the active tab icon is indigo `#6366f1`.
- **Recommendation**:
  - Unify the core brand accent across Light and Dark modes to a cohesive Electric Indigo (`#6366F1` light / `#818CF8` dark) or a fresh Jade Emerald palette.
  - Buttons in dark mode should maintain vibrant brand saturation rather than reverting to plain white.

### 2.2 Micro-Interactions & Tap Targets
- Small tap targets (e.g. 26x26 counter buttons, 18x18 icon buttons) are slightly below the recommended minimum 44x44pt accessibility standard.
- While celebration scale animations exist on checkmarks, list items lack press feedback (active opacity or smooth scale press).

---

## 3. Screen-by-Screen UI Audit: What is Missing & What Can Be Made Better

---

### 3.1 "Today" Screen (`app/(tabs)/index.tsx`)

#### What is Currently There:
- Top static header with dynamic time-of-day greeting ("Good morning", "Good afternoon", "Good evening"), current date, and avatar/profile button.
- Progress summary card showing combined task + habit completion ratio with an animated bar.
- Habit Rescue Banner for broken streaks from yesterday.
- Collapsible Habits section and Tasks section with basic rows.

#### What is Missing & What Can Be Made Better:
1. **Dynamic Streak Tier Highlights**:
   - Every habit currently shows the exact same `#f97316` flame icon whether the streak is 1 day or 60 days.
   - *Improvement*: Streak flame and badge background should shift color dynamically (see Section 4 for the gradient scale).
2. **Quick-Add Actions Directly on Today**:
   - Currently, if a user wants to quickly add a habit or task for today, they *must* leave the Today tab and navigate to Habits or Tasks.
   - *Improvement*: Add a floating or inline "+" quick-capture menu to add a task/habit without switching tabs.
3. **Task Priority Badges & Due Time Chips**:
   - Tasks on the Today screen only show their title.
   - *Improvement*: Show a subtle colored pill indicator for High Priority (Coral Red dot), Medium (Amber dot), and time badge if a reminder is scheduled for today (e.g., `⏰ 3:00 PM`).
4. **Card-Based Row Layout vs Hairline Borders**:
   - Habit and task items are separated by raw 1px lines (`#eee` / `#2a2c2e`).
   - *Improvement*: Convert list items into rounded pill cards (`borderRadius: 12`) with subtle surface contrast (`#F8FAFC` light / `#1A1D20` dark) and a left-accent consistency bar.
5. **Completed Tasks Section / Celebration Feedback**:
   - Completed tasks vanish from the "open" list and are only counted in the top bar. Users miss the satisfaction of seeing what they crossed off today.
   - *Improvement*: Add a collapsed "Completed Today (3)" drawer at the bottom of the list with struck-through text and subtle green checkmarks.

---

### 3.2 "Habits" Screen (`app/(tabs)/habits.tsx`)

#### What is Currently There:
- Top header with total completed progress bar.
- Draggable list with inline title editing (tap title) and counter input (tap counter number).
- Yes/No, Count, and Duration habit types.
- Notification bell, trash button, and drag handle on every row.
- Pinned bottom add bar with Type chips (Yes/No, Count, Minutes).
- AI Suggestion Sheet modal trigger after adding a habit.

#### What is Missing & What Can Be Made Better:
1. **Streak Heat & Color Progression (Primary Request)**:
   - The habit item should visually express consistency through a graded background / border / badge tint:
     - **0 Days**: Slate Neutral border.
     - **1–3 Days**: Light Mint / Soft Green badge.
     - **4–7 Days**: Vibrant Emerald badge.
     - **8–14 Days**: Rich Forest Green badge + glowing flame.
     - **15+ Days**: Jade-Emerald gradient border + golden flame.
2. **Habit Category / Color Customization**:
   - `types/index.ts` has a `color` field in `Habit`, but the UI doesn't allow choosing a color or icon.
   - *Improvement*: Provide 6 curated pastel tag dots when creating a habit (e.g. Health = Emerald, Focus = Indigo, Mind = Lavender, Fitness = Coral, Learning = Amber).
3. **Cluttered Row Actions vs Clean Gestures**:
   - Each row currently displays 3 persistent action icons on the right (Bell, Trash, Drag handle) plus the counter buttons, making rows feel crowded on small screens.
   - *Improvement*: Swipe-to-delete or tap-to-open drawer, keeping the row focused on the title, streak, and completion control.
4. **Milestone Celebrations**:
   - When reaching 7, 14, 30, 50, or 100 days streak, display a celebratory micro-badge on the card (e.g., `⚡ 7-Day Champion`).

---

### 3.3 "Tasks" Screen (`app/(tabs)/tasks.tsx`)

#### What is Currently There:
- Header with Select mode toggle and Search icon toggle.
- Search input bar.
- Bulk actions bar (Complete all, Delete all).
- Draggable FlatList with task items, inline editing, and delete button.
- Bottom pinned input bar.

#### What is Missing & What Can Be Made Better:
1. **Priority Selector & Visual Indicators**:
   - The database stores `priority` (`low`, `medium`, `high`), but there is no way to set it when adding a task, and no badge is displayed on the task row.
   - *Improvement*:
     - In the bottom add bar, add a small priority toggle (e.g., 🔴 High, 🟡 Medium, ⚪ Normal).
     - Display a subtle, elegant left border or small dot tag on high-priority tasks.
2. **Due Date & Reminder Subtext**:
   - When a reminder is set, only a small bell icon is shown.
   - *Improvement*: Display a formatted chip underneath the task title: `📅 Today, 5:00 PM` (with red text if overdue, amber if due today, slate if upcoming).
3. **Section Tabs / Filters (All | Active | Completed)**:
   - Completed tasks currently stay in the main list with a strikethrough, cluttering active tasks over time unless bulk deleted.
   - *Improvement*: Add segmented filter pills at the top: `Active (5)` | `Completed (12)` | `All`.

---

### 3.4 "Stats" Screen (`app/(tabs)/stats.tsx`)

#### What is Currently There:
- Header with "Ask AI" button.
- 4 Stat Metric cards (Longest Streak, Tasks Done, Active Streaks, This Week %).
- AI Weekly Insight card with refresh button.
- 7-Day Weekly Activity vertical bar chart.
- Habit Consistency section with 14-day square dots.

#### What is Missing & What Can Be Made Better:
1. **Gradient Heatmap for Habit Consistency (Core User Feature)**:
   - *Current*: Dots are binary (either active theme color or light gray).
   - *Improvement*: Transition the 14-day dots into a multi-tier **GitHub-style habit heatmap**:
     - Empty / Missed: `#E2E8F0` (light) / `#2A2C2E` (dark)
     - Partial Completion (Count/Duration habits): Light Mint (`#A7F3D0` / `#064E3B`)
     - Complete (1–3 day streak): Medium Emerald (`#34D399` / `#047857`)
     - Sustained Streak (4–7+ days): Deep Vibrant Green (`#10B981` / `#059669`)
     - Milestone Streak (15+ days): Radiant Forest Jade (`#059669` / `#10B981`)
2. **Stat Cards Visual Elevation**:
   - The 4 stat cards currently have flat gray backgrounds (`#f2f2f2` / `#1f2123`) with tiny icons.
   - *Improvement*: Introduce subtle tinted background glows:
     - Longest Streak: Soft Amber Glow (`#FEF3C7` / `#2D2013`) with `#F59E0B` icon.
     - Tasks Done: Soft Indigo Glow (`#EEF2FF` / `#1E1F35`) with `#6366F1` icon.
     - Active Streaks: Soft Emerald Glow (`#ECFDF5` / `#132E24`) with `#10B981` icon.
     - This Week Rate: Soft Violet Glow (`#F5F3FF` / `#251E38`) with `#8B5CF6` icon.
3. **Bar Chart Visual Polish**:
   - Bars are solid single-color blocks.
   - *Improvement*: Use rounded pill tops (`borderRadius: 6`), gradient fill (from Indigo to Emerald on high-activity days), and a highlighted badge for "Today".

---

### 3.5 "Profile & Settings" Screen (`app/profile.tsx`)

#### What is Currently There:
- User avatar with initials or Google profile photo.
- Sign in with Google / Sign out button.
- 4 Mini stats cards.
- Theme selector chips (System, Light, Dark).
- Daily reminder toggle with custom up/down arrow time picker.
- Cloud sync status and "Sync now" button.
- Bug report trigger, Privacy & About links, Export data (JSON), Delete account.

#### What is Missing & What Can Be Made Better:
1. **Time Picker UX**:
   - The current time picker uses custom +/- arrow buttons which take up significant vertical height and require multiple taps to change hours/minutes.
   - *Improvement*: Use a clean native time picker or a sleek horizontal time wheel.
2. **Profile Header Card**:
   - The avatar and user information are centered raw text.
   - *Improvement*: Wrap them in a sleek gradient profile capsule with sync status badge (e.g., `🟢 Synced 2m ago`).
3. **Data Export Preview**:
   - The export action directly triggers native share.
   - *Improvement*: Add a summary tooltip ("Exporting 24 tasks & 6 habits as JSON").

---

### 3.6 Modals & Drawers (`AISuggestionSheet`, `AskHabitsSheet`, `ReminderDrawer`, `BugReportSheet`)

#### What is Missing & What Can Be Made Better:
1. **`AskHabitsSheet.tsx`**:
   - User and AI message bubbles are plain boxes.
   - *Improvement*: Format AI responses with markdown support (bullet points, bold highlights) and provide interactive "+ Add to my habits" buttons directly inside the AI response.
2. **`AISuggestionSheet.tsx`**:
   - Suggestion cards have plain text.
   - *Improvement*: Add category pills ("⚡ Quick Win", "🧠 Focus", "💪 Physical") and an "Add All (3)" primary button at the bottom.
3. **`ReminderDrawer.tsx`**:
   - Currently requires multiple taps to open system modal date pickers.
   - *Improvement*: Add quick-preset chips: `🌅 Morning (8:00 AM)`, `☀️ Afternoon (1:00 PM)`, `🌙 Evening (8:00 PM)`, `Tomorrow`.

---

## 4. The Proposed Color System & Gradient Streak Progression

To keep the application simple, minimal, and elegant while introducing meaningful, reward-driven color dynamics, here is the complete design token specification.

---

### 4.1 Base Neutral Palette (Clean Scandinavian Simplicity)

| Token Name | Light Mode Hex | Dark Mode Hex | Usage |
| :--- | :--- | :--- | :--- |
| **`surface.background`** | `#FFFFFF` | `#0E1117` | Primary screen canvas |
| **`surface.card`** | `#F8FAFC` | `#161B22` | Card and list item backgrounds |
| **`surface.subtle`** | `#F1F5F9` | `#21262D` | Chip backgrounds, input fields |
| **`border.default`** | `#E2E8F0` | `#30363D` | Card borders, dividers |
| **`border.subtle`** | `#F1F5F9` | `#21262D` | Internal hairline separators |

---

### 4.2 Semantic Text Hierarchy (Crisp & Readable)

| Role | Light Mode Hex | Dark Mode Hex | Description |
| :--- | :--- | :--- | :--- |
| **`text.primary`** | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) | Headers, active titles, high emphasis |
| **`text.secondary`** | `#475569` (Slate 600) | `#94A3B8` (Slate 400) | Body descriptions, subheaders |
| **`text.muted`** | `#94A3B8` (Slate 400) | `#64748B` (Slate 500) | Timestamps, empty states, helper notes |
| **`text.accent`** | `#6366F1` (Indigo 500) | `#818CF8` (Indigo 400) | Interactive links, select toggles |
| **`text.success`** | `#059669` (Emerald 600) | `#34D399` (Emerald 400) | Completed counts, positive streaks |

---

### 4.3 Habit Consistency & Streak Gradient Ramp (Light Green to Heavy Green)

This gradient scale directly implements the user's vision for habit streak consistency progression:

```
[Level 0: 0 Days]  →  [Level 1: 1-3 Days]  →  [Level 2: 4-7 Days]  →  [Level 3: 8-14 Days]  →  [Level 4: 15-29 Days]  →  [Level 5: 30+ Days]
  Neutral Slate          Soft Mint              Fresh Emerald           Vibrant Green            Deep Forest Jade           Radiant Gold-Jade
```

#### Detailed Specification Table:

| Streak Level | Streak Duration | Light Mode Color | Dark Mode Color | Visual Cue & Badge Styling |
| :--- | :--- | :--- | :--- | :--- |
| **Level 0 (Inactive)** | 0 Days / Missed | `#94A3B8` (Slate Muted) | `#475569` | Muted flame icon, neutral border |
| **Level 1 (Spark)** | 1 – 3 Days | `#A7F3D0` (Mint 200) | `#064E3B` (Emerald 900) | Soft green pill, `#059669` flame |
| **Level 2 (Momentum)** | 4 – 7 Days | `#34D399` (Emerald 400) | `#047857` (Emerald 700) | Fresh emerald pill, `#10B981` flame |
| **Level 3 (Consistency)**| 8 – 14 Days | `#10B981` (Emerald 500) | `#059669` (Emerald 600) | Solid emerald badge, `#F97316` bright flame |
| **Level 4 (Mastery)** | 15 – 29 Days | `#059669` (Emerald 600) | `#10B981` (Emerald 500) | Deep forest green card accent + glowing flame |
| **Level 5 (Legend)** | 30+ Days | `#047857` (Emerald 700) | `#34D399` (Emerald 400) | Jade gradient border + Gold Star/Flame `#F59E0B` |

#### Consistency Dots in Stats Matrix:
- **0% complete on that date**: `#E2E8F0` (light) / `#21262D` (dark)
- **Partial completion (e.g. 5/10 min)**: `#A7F3D0` (light) / `#064E3B` (dark)
- **100% complete (1–3 streak)**: `#34D399` (light) / `#047857` (dark)
- **100% complete (4–7 streak)**: `#10B981` (light) / `#059669` (dark)
- **100% complete (8+ streak)**: `#047857` (light) / `#34D399` (dark)

---

### 4.4 Functional Accent Palette (Harmonious & Purposeful)

| Purpose | Color Hex (Light / Dark) | Component Usage |
| :--- | :--- | :--- |
| **Primary Brand** | `#6366F1` / `#818CF8` | Tab bar active icon, primary buttons, AI icon |
| **Streak Fire** | `#F97316` / `#FB923C` | Flame icons, streak counter numbers |
| **High Priority** | `#EF4444` / `#F87171` | High priority task dot, delete actions |
| **Medium Priority** | `#F59E0B` / `#FBBF24` | Medium priority task dot |
| **Low Priority** | `#3B82F6` / `#60A5FA` | Low priority task dot |
| **AI / Insights** | `#8B5CF6` / `#A78BFA` | "Ask AI" chip, AI suggestion sparkles |
| **Rescue / Warning** | `#FFF7ED` / `#2A1F0F` | Broken streak recovery card (with `#F97316` border) |

---

## 5. UI Layout & Typography Rules for Consistency

1. **Card Radius Consistency**:
   - Large Containers / Stat Cards: `borderRadius: 16`
   - List Items / Habit & Task Cards: `borderRadius: 12`
   - Chips & Badges: `borderRadius: 20` (Pill shape)
   - Action Buttons: `borderRadius: 12`

2. **Spacing Grid**:
   - Base 4pt/8pt grid: Standard container padding `16pt`, card internal padding `14pt`, vertical gaps `8pt` or `12pt`.

3. **Typography Hierarchy**:
   - Header 1 (Screen Titles): `28pt`, `FontWeight: '700'`
   - Header 2 (Section Titles): `18pt`, `FontWeight: '600'`
   - Item Titles: `15pt` or `16pt`, `FontWeight: '500'`
   - Badges & Metadata: `12pt` or `13pt`, `FontWeight: '600'`
   - Secondary / Timestamps: `12pt`, `FontWeight: '400'`

---

## 6. Implementation Roadmap (When Ready to Execute)

When you decide to implement these UI enhancements, the recommended non-breaking order is:

1. **Phase 1: Design Tokens & Theme Foundation**
   - Update `constants/theme.ts` with the unified Light & Dark palette, text tokens, and streak tier gradient colors.
   - Update `useAppTheme` to expose typed semantic tokens (`colors.card`, `colors.border`, `colors.streakTier[0..5]`).

2. **Phase 2: Habit Consistency Gradient & Card Redesign**
   - Implement `getStreakTier(streakCount)` utility in `utils/streak.ts`.
   - Update Habit rows on Today and Habits screens to use the tier color for streak badges and completion glows.
   - Update 14-day consistency dots on Stats screen to reflect the 5-level green gradient.

3. **Phase 3: Task Priority & Time Tags**
   - Add Priority selector chips to the Task add bar.
   - Render priority dots and reminder time chips on Task cards.

4. **Phase 4: Stats Screen Visual Polish**
   - Enhance the 4 metric cards with soft tinted backgrounds and icons.
   - Style the Weekly Activity chart with rounded pill tops and gradient heights.

5. **Phase 5: Bottom Sheets & Micro-interactions**
   - Add quick-time preset chips to `ReminderDrawer.tsx`.
   - Enhance `AskHabitsSheet.tsx` with markdown text styles.

---
*Document prepared for DockDaily • August 2026*
