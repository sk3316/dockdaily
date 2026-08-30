# DOCKDAILY — AGENT HANDOFF & ARCHITECTURAL STATE

```yaml
schema_version: "1.0.0"
handoff_created_at: "2026-08-30T17:00:00+05:30"
project:
  name: "dockdaily"
  slug: "dockdaily"
  version: "1.0.0"
  bundle_identifier: "com.sk3316.dockdaily"
  package_name: "com.sk3316.dockdaily"
  framework: "React Native 0.81.5 / Expo SDK 54.0.37"
  navigation: "expo-router 6.0.23"
  state_management: "zustand 5.0.14"
  local_database: "expo-sqlite 16.0.10"
  remote_backend: "Supabase (PostgreSQL + Auth + Storage + Edge Functions)"
  monitoring: "@sentry/react-native 7.2.0"
git_state:
  branch: "main"
  head_commit: "03e38a9d57524c990d1091ca172592b17d16b9ae"
  modified_files:
    - "app/(tabs)/challenges.tsx"
    - "app/(tabs)/habits.tsx"
    - "app/(tabs)/stats.tsx"
    - "app/_layout.tsx"
    - "app/about.tsx"
    - "app/challenge/[id].tsx"
    - "app/profile.tsx"
    - "components/AcceptChallengeSheet.tsx"
    - "components/BugReportSheet.tsx"
    - "store/useHabitStore.ts"
  new_untracked_files:
    - "components/HabitHistorySheet.tsx"
    - "HANDOFF.md"
  clean_working_tree: false
```

---

## 1. Executive Summary & Core Philosophy

**DockDaily** is an offline-first personal productivity and habit tracking mobile application built for iOS and Android using Expo SDK 54, React Native (New Architecture enabled), React 19, and TypeScript.

### Primary Design Principles
1. **Offline-First Resilience**: All core user data (Tasks, Habits, Daily Logs, Tombs/Deleted Records) lives primarily in a local SQLite database (`dockdaily.db`). The app operates seamlessly without an internet connection.
2. **Asynchronous Background Cloud Sync**: When authenticated via Supabase (Google OAuth / Session), data changes are debounced (`800ms`) and pushed/pulled to Supabase PostgreSQL without blocking the UI thread.
3. **Social & Challenge Architecture**: Peer habit challenges (formal/informal) with photo proof verification (Cloudinary CDN), friend invitation codes, and social timelines.
4. **AI-Assisted Guidance**: Integrated AI capabilities (Groq/OpenAI Edge Functions) for habit coaching (`ask-habits`), habit streak rescue detection (`habit-rescue`), weekly trend analysis (`weekly-insights`), and smart habit matching (`match-habit`).

---

## 2. Directory Tree & File Inventory

```
dockdaily/
├── .github/
│   └── skills/
│       └── expo-rn-feature/
│           └── SKILL.md                 # Expo SDK 54 development guidelines & checklist
├── app/                                 # Expo Router File-Based Routing
│   ├── (tabs)/
│   │   ├── _layout.tsx                  # Tab bar configuration & iconography
│   │   ├── index.tsx                    # Today Screen (greeting, progress, rescue cards, habits, tasks)
│   │   ├── tasks.tsx                    # Tasks Screen (drag-and-drop sort, filter, reminders, CRUD)
│   │   ├── habits.tsx                   # Habits Screen (streaks, boolean/count/time habits, logs)
│   │   ├── challenges.tsx               # Challenges Screen (active/invited challenges, leaderboard)
│   │   └── stats.tsx                    # Stats Screen (weekly bars, streaks, AI insights)
│   ├── challenge/
│   │   └── [id].tsx                     # Challenge Detail Screen (timeline, photo proof, verify/flag)
│   ├── _layout.tsx                      # Root layout, Sentry wrap, DB/Auth/Notif init, theme provider
│   ├── about.tsx                        # App information, architecture summary, privacy
│   ├── create-challenge.tsx             # Modal form to launch peer habit challenge
│   ├── friends.tsx                      # Friends management, invite code generation & redemption
│   ├── google-auth.tsx                  # Google OAuth redirect callback handler
│   ├── modal.tsx                        # Modal presentation starter stub
│   └── profile.tsx                      # User profile, Google Auth, theme settings, JSON export/import
├── components/                          # Reusable UI & Modal Sheets
│   ├── ui/
│   │   ├── icon-symbol.ios.tsx          # SF Symbols mapping for iOS
│   │   └── icon-symbol.tsx              # MaterialIcons fallback
│   ├── AISuggestionSheet.tsx            # AI sheet suggesting complementary habits/tasks
│   ├── AcceptChallengeSheet.tsx         # Sheet linking local habit to incoming challenge
│   ├── AskHabitsSheet.tsx               # Habit AI coach chat interface
│   ├── BugReportSheet.tsx               # In-app bug report & Sentry user feedback modal
│   ├── HabitHistorySheet.tsx            # 21-day habit history matrix & 48h backfill modal sheet
│   ├── HabitRescueCard.tsx              # Today screen motivational card for broken streaks
│   ├── ReminderDrawer.tsx               # Time (HH:MM) and date picker drawer
│   ├── external-link.tsx                # External URL opener with WebBrowser
│   ├── haptic-tab.tsx                   # Tab button with tactile haptics on press
│   ├── hello-wave.tsx                   # Wave animation stub
│   ├── parallax-scroll-view.tsx         # Parallax header wrapper stub
│   ├── themed-text.tsx                  # Text themed with typography variants
│   └── themed-view.tsx                  # View wrapper respecting light/dark theme
├── constants/
│   └── theme.ts                         # Unified color palette (dark/light tokens, tint, surface)
├── db/
│   ├── database.ts                      # SQLite instance lifecycle, migrations, clear tables
│   └── schema.ts                        # DDL statements (tasks, habits, habit_logs, deleted_records)
├── hooks/
│   ├── use-animated-progress.ts         # Animated width transition hook for progress bars
│   ├── use-app-theme.ts                 # Unified theme resolution hook (system / dark / light)
│   ├── use-celebration.ts               # Completion celebration animations (flash, scale, haptic)
│   ├── use-color-scheme.ts              # Native color scheme listener
│   ├── use-color-scheme.web.ts          # Web hydration-safe color scheme hook
│   └── use-theme-color.ts               # Legacy theme color resolver
├── lib/
│   └── supabase.ts                      # Supabase singleton client with fallback safety
├── store/                               # Zustand State Management
│   ├── challengeSync.ts                 # Bidirectional bridge between local habits and challenges
│   ├── syncScheduler.ts                 # Debounced sync caller (avoids circular imports)
│   ├── useAIStore.ts                    # AI habit suggestions state
│   ├── useAuthStore.ts                  # Supabase session, Google OAuth, profile, delete account
│   ├── useChallengeStore.ts             # Challenge mode state, check-ins, reactions, timeline
│   ├── useChatStore.ts                  # AI habit coach chat state
│   ├── useFriendsStore.ts               # Social friends, invite code generation/redemption
│   ├── useHabitStore.ts                 # SQLite Habits CRUD, daily logs, streak computation
│   ├── useInsightsStore.ts              # AI weekly insight generation & SecureStore cache
│   ├── usePreferenceStore.ts            # User theme, notification settings, reminder times
│   ├── useRescueStore.ts                # Broken streak detection & AI rescue motivation
│   ├── useSyncStore.ts                  # Full SQLite ↔ Supabase bidirectional sync engine
│   └── useTaskStore.ts                  # SQLite Tasks CRUD, reordering, status toggles
├── types/
│   └── index.ts                         # Core entity TypeScript definitions (Task, Habit, HabitLog)
├── utils/
│   ├── challengeProof.ts                # Expo ImagePicker & Cloudinary photo proof uploader
│   ├── notifications.ts                 # Local Expo Notifications scheduling & smart reminder logic
│   ├── pushNotify.ts                    # Remote friend push notification trigger via Edge Function
│   └── streak.ts                        # Date formatting (YYYY-MM-DD), current & longest streak algorithms
├── AGENTS.md                            # Rule: Mandate Expo SDK 54 versioned documentation
├── CODE_REVIEW.md                       # Comprehensive code review report & backlog
├── README.md                            # High-level product overview
├── app.json                             # Expo configuration, plugins, splash, icons, bundle ID
├── eas.json                             # EAS build profiles (development, preview, production)
└── package.json                         # Dependencies & project metadata
```

---

## 3. Database Schema & Data Models

### 3.1 Local SQLite Schema (`dockdaily.db`)

```sql
-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  due_date TEXT,                      -- ISO date string
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high'
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT '',
  synced INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  reminder_time TEXT,                 -- HH:MM format
  reminder_date TEXT                  -- YYYY-MM-DD format
);

-- Habits Table
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'boolean', -- 'boolean' | 'count' | 'duration'
  target INTEGER NOT NULL DEFAULT 1,
  frequency TEXT NOT NULL DEFAULT 'daily', -- 'daily' | 'weekly'
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TEXT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  reminder_time TEXT,                 -- HH:MM format
  reminder_date TEXT,                 -- YYYY-MM-DD format
  last_known_streak INTEGER NOT NULL DEFAULT 0
);

-- Habit Daily Logs Table
CREATE TABLE IF NOT EXISTS habit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,                 -- YYYY-MM-DD format (local timezone)
  value INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
);

-- Tombstones Table (for sync deletions)
CREATE TABLE IF NOT EXISTS deleted_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  UNIQUE(table_name, record_id)
);

-- Unique constraint index
CREATE UNIQUE INDEX IF NOT EXISTS habit_logs_habit_date ON habit_logs(habit_id, date);
```

### 3.2 Remote Supabase PostgreSQL Schema

| Table Name | Primary Key | Foreign Keys / Relations | Purpose |
| :--- | :--- | :--- | :--- |
| `profiles` | `id` (UUID) | `auth.users(id)` | User display name, avatar URL, push token |
| `tasks` | `id` (TEXT) | `user_id -> profiles(id)` | Remote mirror for tasks with RLS |
| `habits` | `id` (TEXT) | `user_id -> profiles(id)` | Remote mirror for habits with RLS |
| `habit_logs` | `id` (TEXT) | `habit_id -> habits(id)`, `user_id -> profiles(id)` | Remote mirror for daily habit logs |
| `deleted_records` | `id` (BIGINT) | `user_id -> profiles(id)` | Remote tombstones to propagate deletions across devices |
| `friendships` | `(user_id, friend_id)` | `user_id -> profiles(id)`, `friend_id -> profiles(id)` | Bidirectional friendship links |
| `invite_links` | `code` (TEXT) | `created_by -> profiles(id)` | 7-character friend invitation codes |
| `challenges` | `id` (UUID) | `created_by -> profiles(id)` | Shared habit challenges (formal/informal) |
| `challenge_participants`| `(challenge_id, user_id)` | `challenge_id`, `user_id`, `habit_id` | Participant status, streaks, local habit link |
| `challenge_checkins` | `id` (UUID) | `challenge_id`, `user_id` | Daily check-in log with optional proof photo |
| `challenge_reactions` | `(checkin_id, user_id)` | `checkin_id`, `user_id` | Peer reactions (`verified` / `flagged`) |

---

## 4. State Management & Data Flow Architecture

### 4.1 Sync Engine (`store/useSyncStore.ts` & `store/syncScheduler.ts`)
- **Write-Through Caching**: User actions (e.g. `addTask`, `logHabit`, `deleteHabit`) write directly to SQLite and update Zustand local state immediately for instant UI response.
- **Debounced Push**: `scheduleSync()` in `store/syncScheduler.ts` triggers after `800ms` of quiet time.
- **Tombstones**: Deletions record a row in `deleted_records` (local + remote) to ensure deletions synchronize across multi-device setups.
- **Account Isolation**: On user logout or account switch, `clearDatabase()` in `db/database.ts` purges all local tables to prevent data leakage between sessions.

### 4.2 Streak Engine (`utils/streak.ts`)
- Strict local date calculation using `YYYY-MM-DD` formatting (avoiding UTC timezone drift bugs).
- Calculates:
  - `calculateStreak(logs, habitId)`: Consecutive active days up to yesterday or today.
  - `calculateLongestStreak(logs, habitId)`: All-time historical consecutive streak.
  - `checkForBrokenStreaks()` in `useHabitStore`: Identifies if a habit with previous streak > 0 was missed yesterday, triggering rescue intervention.

### 4.3 Habit ↔ Challenge Sync Bridge (`store/challengeSync.ts`)
- When a user logs a local habit that is bound to an active challenge, `syncHabitToChallenge(habitId)` automatically checks in on the challenge (prompting for photo proof if `requiresProof: true`).
- When a user checks in via the challenge screen, `syncChallengeToHabit(habitId)` completes today's local habit log.

### 4.4 Key Strategic & Architectural Decisions (Confirmed)
- **Photo Storage Pipeline**: Retain Cloudinary for challenge photo proofs; migrate credentials from hardcoded literals to dedicated project environment variables (`EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME`, `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET`).
- **Supabase Realtime**: Add Supabase Realtime (`postgres_changes`) channel listeners for challenge timelines, check-ins, and peer reactions so friend interactions reflect live without requiring manual refresh.
- **Screen Architecture**: Maintain separate, independent implementations for [`app/(tabs)/tasks.tsx`](file:///d:/Users/K%20M%20Nehru/Desktop/github%20repos/DockDaily/dockdaily/app/(tabs)/tasks.tsx) and [`app/(tabs)/habits.tsx`](file:///d:/Users/K%20M%20Nehru/Desktop/github%20repos/DockDaily/dockdaily/app/(tabs)/habits.tsx) to preserve specialized gestures, steppers, and feature autonomy.

---

## 5. Remote Services & Supabase Edge Functions

All Edge Functions reside under the Supabase project endpoint `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/<name>` and expect `Bearer ${session.access_token}` authorization:

```json
{
  "edge_functions": [
    {
      "name": "habit-suggestions",
      "invoked_from": "store/useAIStore.ts",
      "payload": { "newHabit": "object", "existingHabits": "array", "openTasks": "array" },
      "purpose": "Generates 2 complementary habits, 2 actionable tasks, and a 1-sentence insight upon creating a habit."
    },
    {
      "name": "ask-habits",
      "invoked_from": "store/useChatStore.ts",
      "payload": { "question": "string", "habitStats": "array", "taskList": "array", "conversationHistory": "array" },
      "purpose": "Conversational AI habit coach analyzing recent 14-day performance."
    },
    {
      "name": "weekly-insights",
      "invoked_from": "store/useInsightsStore.ts",
      "payload": { "habitStats": "array", "taskStats": "object" },
      "purpose": "Produces a personalized weekly progress review, cached in SecureStore."
    },
    {
      "name": "habit-rescue",
      "invoked_from": "store/useRescueStore.ts",
      "payload": { "habitTitle": "string", "previousStreak": "number" },
      "purpose": "Generates an empathetic motivational message when a streak is broken."
    },
    {
      "name": "match-habit",
      "invoked_from": "store/useChallengeStore.ts",
      "payload": { "challengeTitle": "string", "myHabits": "array" },
      "purpose": "Suggests which existing local habit matches an incoming challenge invitation."
    },
    {
      "name": "accept-invite",
      "invoked_from": "store/useFriendsStore.ts",
      "payload": { "code": "string" },
      "purpose": "Validates invite code and creates bidirectional friendship records in Supabase."
    },
    {
      "name": "send-push",
      "invoked_from": "utils/pushNotify.ts",
      "payload": { "recipientUserId": "string", "title": "string", "body": "string", "data": "object" },
      "purpose": "Sends an Expo push notification to another user using their stored push token."
    },
    {
      "name": "delete-account",
      "invoked_from": "store/useAuthStore.ts",
      "payload": {},
      "purpose": "GDPR-compliant account deletion (cascades remote profile and auth user)."
    }
  ]
}
```

---

## 6. Environment & Configuration Matrix

### 6.1 Environment Variables

| Variable | Target File | Purpose | Sensitivity |
| :--- | :--- | :--- | :--- |
| `EXPO_PUBLIC_SUPABASE_URL` | `.env.local` / `eas.json` | Supabase Project URL | Public |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` / `eas.json` | Supabase Anon Key (Protected by RLS) | Public/Client Key |
| `SENTRY_DSN` | `app/_layout.tsx` | Sentry Crash Reporting Ingestion URL | Public |
| `CLOUDINARY_CLOUD_NAME` | `utils/challengeProof.ts` | Cloudinary CDN Account Name (`diqfxv3h1`) | Client Public |
| `CLOUDINARY_UPLOAD_PRESET`| `utils/challengeProof.ts` | Unsigned Upload Preset (`dockdaily_challenge_proof`) | Client Public |

### 6.2 EAS Project & Configuration (`app.json` & `eas.json`)
- **EAS Project ID**: `c9a82720-1133-49c7-97ea-d9ab5fed5108`
- **Owner**: `sk3316`
- **Bundle Identifier (iOS)**: `com.sk3316.dockdaily`
- **Package Name (Android)**: `com.sk3316.dockdaily`
- **Runtime Policy**: `fingerprint`

---

## 7. Current Work Status & Uncommitted Changes

### 7.1 Uncommitted Working Directory State
- [components/HabitHistorySheet.tsx](file:///d:/Users/K%20M%20Nehru/Desktop/github%20repos/DockDaily/dockdaily/components/HabitHistorySheet.tsx) `[NEW]`: 21-day completion matrix modal sheet with 48h grace window (Today & Yesterday editable with haptics, days 3–21 locked).
- [store/useHabitStore.ts](file:///d:/Users/K%20M%20Nehru/Desktop/github%20repos/DockDaily/dockdaily/store/useHabitStore.ts): Added `logHabitForDate(habitId, date, value, target)` to support retroactive habit logging without creating fake historical challenge entries, and auto-dismisses active rescue cards when yesterday is backfilled.
- [app/(tabs)/habits.tsx](file:///d:/Users/K%20M%20Nehru/Desktop/github%20repos/DockDaily/dockdaily/app/(tabs)/habits.tsx): Added `21-Day History` button in header row and wired `HabitHistorySheet` modal. Removed unused `cancelTitleEdit`.
- [app/(tabs)/challenges.tsx](file:///d:/Users/K%20M%20Nehru/Desktop/github%20repos/DockDaily/dockdaily/app/(tabs)/challenges.tsx): Added `loadFriends()` into the screen mount `useEffect` so that friend avatars and names resolve immediately on challenges; removed unused `acceptChallenge` import.
- [app/challenge/[id].tsx](file:///d:/Users/K%20M%20Nehru/Desktop/github%20repos/DockDaily/dockdaily/app/challenge/[id].tsx): Fixed empty timeline state style to use `styles.metaText`.
- [app/profile.tsx](file:///d:/Users/K%20M%20Nehru/Desktop/github%20repos/DockDaily/dockdaily/app/profile.tsx): Removed "Coming soon" badge from the Friends menu item now that social & friends management is active.
- [app/_layout.tsx](file:///d:/Users/K%20M%20Nehru/Desktop/github%20repos/DockDaily/dockdaily/app/_layout.tsx): Cleaned up unused `Text` import.
- [app/(tabs)/stats.tsx](file:///d:/Users/K%20M%20Nehru/Desktop/github%20repos/DockDaily/dockdaily/app/(tabs)/stats.tsx): Fixed unescaped JSX quotes in error messages.
- [app/about.tsx](file:///d:/Users/K%20M%20Nehru/Desktop/github%20repos/DockDaily/dockdaily/app/about.tsx): Fixed unescaped JSX quotes in intro text.
- [components/AcceptChallengeSheet.tsx](file:///d:/Users/K%20M%20Nehru/Desktop/github%20repos/DockDaily/dockdaily/components/AcceptChallengeSheet.tsx): Fixed unescaped JSX quotation marks in template string.
- [components/BugReportSheet.tsx](file:///d:/Users/K%20M%20Nehru/Desktop/github%20repos/DockDaily/dockdaily/components/BugReportSheet.tsx): Fixed unescaped JSX apostrophes in feedback messages.
- [HANDOFF.md](file:///d:/Users/K%20M%20Nehru/Desktop/github%20repos/DockDaily/dockdaily/HANDOFF.md) `[NEW]`: Master architectural handoff document.

### 7.2 Recent Milestone Highlights
1. **Challenge Mode & Social Timeline**: Full support for formal (strict end-date / winner) and informal (continuous streak) habit challenges, camera photo proof capture, and verify/flag peer reactions.
2. **Friends & Invite System**: 7-character non-ambiguous invite codes (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`), share sheet integration, and server-side invite redemption.
3. **Smart Reminder Engine**: Per-task and per-habit reminder times + smart daily notification that auto-cancels if the user completes all items before the trigger time.
4. **Streak Rescue System**: Automatic detection of broken streaks upon app launch/foreground with AI encouragement cards.
5. **21-Day Habit History & 48-Hour Backfill**: 3-week completion matrix sheet (`HabitHistorySheet.tsx`), interactive 48h grace window (Today & Yesterday editable with haptic feedback, days 3–21 locked), and isolated streak recalculation.

---

## 8. Prioritized Technical Backlog & Action Items

```json
{
  "priorities": [
    {
      "level": "P0 - Immediate / Bug Fixes",
      "items": [
        {
          "id": "TASK-001",
          "title": "Clean up Map leak in useCelebration",
          "file": "hooks/use-celebration.ts",
          "description": "flashAnims and scaleAnims Animated.Value references are never deleted after animation completes. Add anim.delete(id) in timing callbacks to prevent memory growth across long sessions."
        },
        {
          "id": "TASK-002",
          "title": "Deploy / verify habit-suggestions Edge Function",
          "file": "store/useAIStore.ts",
          "description": "Ensure the remote habit-suggestions Supabase Edge Function is deployed and returning valid JSON schema."
        },
        {
          "id": "TASK-003",
          "title": "Clean up redundant Google Auth route stub",
          "file": "app/google-auth.tsx",
          "description": "Ensure routing transitions cleanly after WebBrowser OAuth completion."
        }
      ]
    },
    {
      "level": "P1 - High Impact Architectural Improvements",
      "items": [
        {
          "id": "TASK-004",
          "title": "SQLite Schema Versioning / PRAGMA user_version",
          "file": "db/database.ts",
          "description": "Replace try/catch (ALTER TABLE) pattern with a deterministic user_version PRAGMA migration registry."
        },
        {
          "id": "TASK-005",
          "title": "Consolidate Shared ChecklistRow UI Component",
          "file": "app/(tabs)/tasks.tsx and app/(tabs)/habits.tsx",
          "description": "Extract shared item row, action buttons, and drag-handle UI into a reusable ChecklistRow component to reduce ~400 lines of duplicated code."
        },
        {
          "id": "TASK-006",
          "title": "Optimize Live Greeting Interval",
          "file": "app/(tabs)/index.tsx",
          "description": "Ensure useLiveGreeting interval is properly cleaned up on unmount."
        }
      ]
    },
    {
      "level": "P2 - Quality, Testing & Hardening",
      "items": [
        {
          "id": "TASK-007",
          "title": "Unit Tests for Pure Calculations",
          "file": "utils/streak.ts, utils/notifications.ts",
          "description": "Add Jest unit tests covering streak calculation edge cases (month rollovers, leap years, missed days, same-day multiple logs)."
        },
        {
          "id": "TASK-008",
          "title": "React Native Error Boundaries",
          "file": "app/_layout.tsx",
          "description": "Implement an ErrorBoundary component around tab views to prevent full-app crashes on unhandled render exceptions."
        },
        {
          "id": "TASK-009",
          "title": "Accessibility Attributes",
          "file": "components/ and app/(tabs)/",
          "description": "Add accessibilityRole, accessibilityLabel, and accessibilityHint to custom touchables and chips."
        }
      ]
    }
  ]
}
```

---

## 9. Verification & Command Runbook

Whenever resuming or verifying work on this repository:

```bash
# 1. Dependency check & Expo doctor
npx expo-doctor

# 2. TypeScript static type validation
npx tsc --noEmit

# 3. Linter validation
npx expo lint

# 4. Start local development server
npx expo start

# 5. Native builds via EAS (when modifying native plugins or app.json)
eas build --profile development --platform android
eas build --profile development --platform ios
```

> **Mandatory Rule Reference**: Always cross-reference any Expo API changes against the exact versioned documentation at `https://docs.expo.dev/versions/v54.0.0/` before writing code.
