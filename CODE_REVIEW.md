# DockDaily — Complete Code Review

> Read-only review across ~50 source files. No code was modified.
> Date: 2026-08-22

---

## 🔴 Loose Points — Critical

| #   | Location                                                                                       | Issue                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | [supabase/functions/habit-suggestions/index.ts](supabase/functions/habit-suggestions/index.ts) | **Empty file (0 bytes)** but referenced by `useAIStore.ts` (`generateHabitSuggestions`). Every AI suggestion call hits a 404.                                                                                                               |
| L2  | [.env](.env)                                                                                   | **Committed credentials** — `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` exist as a real `.env` file. The anon key is also hardcoded in [eas.json](eas.json) for all three profiles. Should be `.env.local` (gitignored). |
| L3  | [app/\_layout.tsx:125](app/_layout.tsx#L125)                                                   | `handleSmartNotification` runs on **every AppState foreground transition**, cancelling and rescheduling every reminder. Causes redundant local-notification churn and possible notification-system throttling on rapid foregrounding.       |
| L4  | [hooks/use-celebration.ts](hooks/use-celebration.ts)                                           | `flashAnims` / `scaleAnims` Maps are keyed by item ID but **never cleaned up**. Over time this holds stale `Animated.Value` references for every task/habit ever celebrated → memory growth across long sessions.                           |
| L5  | [store/useTaskStore.ts / useHabitStore.ts](store/useTaskStore.ts)                              | `addHabit` and `addTask` mutate state, then call `loadTasks()`/`loadHabits()` which does a **full DB reload**. Race-condition window where the optimistic update can be overwritten if a sync push arrives mid-write.                       |

---

## 🟠 Loose Points — Warning

| #   | Location                                                                             | Issue                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L6  | [eas.json](eas.json)                                                                 | Same Supabase env vars duplicated across `development`, `preview`, and `production`. EAS supports `extends`-style inheritance via `cli.env` at the top level.               |
| L7  | [eas/](eas)                                                                          | Folder exists but is **empty** — looks like a remnant directory.                                                                                                            |
| L8  | [db/database.ts](db/database.ts)                                                     | Schema migrations use `try/catch (_)` on `ALTER TABLE`. **No version table** (e.g. `user_version` PRAGMA), so re-running migrations on a fresh DB or downgrading is unsafe. |
| L9  | [app/profile.tsx](app/profile.tsx)                                                   | "Coming soon" badge still attached to Friends row, yet [app/friends.tsx](app/friends.tsx) is fully wired. Cosmetic inconsistency.                                           |
| L10 | [utils/notifications.ts](utils/notifications.ts)                                     | Hardcoded EAS project ID (`c9a82720-1133-49c7-97ea-d9ab5fed5108`) in source — should come from `eas.json` / `Constants.easConfig`.                                          |
| L11 | [app/\_layout.tsx](app/_layout.tsx) + [store/useAuthStore.ts](store/useAuthStore.ts) | `WebBrowser.maybeCompleteAuthSession()` called in both places. Idempotent but redundant — single source of truth is preferable.                                             |
| L12 | [app/google-auth.tsx](app/google-auth.tsx)                                           | Pure redirect stub kept in the route tree. Confusing for nav (Stack still has it) — remove from `app.json` routes if unused.                                                |
| L13 | [utils/challengeProof.ts](utils/challengeProof.ts)                                   | Open **TODO** comment about Cloudinary credentials ("not project-specific unless a separate one was provisioned").                                                          |
| L14 | Multiple files                                                                       | `console.log` debug calls in stores (e.g. `useAuthStore`, `useSyncStore`) — should be wrapped in a logger or removed before production.                                     |
| L15 | [store/useSyncStore.ts](store/useSyncStore.ts)                                       | `toRemoteTask` / `toRemoteHabit` / `toRemoteHabitLog` mapper functions are duplicated between push and pull directions — drift risk.                                        |
| L16 | [store/useRescueStore.ts](store/useRescueStore.ts)                                   | `items` Map grows unbounded across days (no retention / dedupe-by-habit logic).                                                                                             |
| L17 | [hooks/use-animated-progress.ts](hooks/use-animated-progress.ts)                     | `useNativeDriver: false` on width interpolation — defeats the perf benefit of `Animated`. Could use `transform: scaleX` instead.                                            |
| L18 | [app/(tabs)/index.tsx](<app/(tabs)/index.tsx>)                                       | `useLiveGreeting` runs `setInterval(60_000)` **forever** — never cleared on unmount if the component re-mounts inside the same Stack screen.                                |
| L19 | [utils/streak.ts](utils/streak.ts)                                                   | Streak rules duplicate across client and Edge Functions — needs a single source of truth (DB function or shared module).                                                    |
| L20 | [store/useFriendsStore.ts](store/useFriendsStore.ts)                                 | 7-char invite codes generated client-side with no collision-check before insert — relies on DB unique constraint to retry, but retry UX is silent.                          |

---

## 🟡 Loose Points — Info

| #   | Location                                                                                          | Issue                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L21 | [app/(tabs)/tasks.tsx](<app/(tabs)/tasks.tsx>) + [app/(tabs)/habits.tsx](<app/(tabs)/habits.tsx>) | ~600 lines each with heavy duplicated structure (item row, counter row, check row, drag handle). Could share a generic `<ChecklistRow>`.                                                                                                                                                  |
| L22 | [app/(tabs)/index.tsx](<app/(tabs)/index.tsx>)                                                    | `renderItem` for task/habit lists is **re-created on every render** — causes needless re-renders in `DraggableFlatList`.                                                                                                                                                                  |
| L23 | [constants/theme.ts](constants/theme.ts) + screens                                                | Two parallel theming paths coexist: legacy `Colors[scheme]` via `ThemedText`/`ThemedView` AND newer `useAppTheme()` hook. Pick one.                                                                                                                                                       |
| L24 | [hooks/use-color-scheme.web.ts](hooks/use-color-scheme.web.ts)                                    | Hydration guard returns `'light'` before hydration → flash on web. Fine for native, suboptimal for web build.                                                                                                                                                                             |
| L25 | [components/BugReportSheet.tsx](components/BugReportSheet.tsx) etc.                               | All sheets use `Modal` + `presentationStyle="pageSheet"` — iOS-only behavior. Android falls back to full-screen modal. Consider `@gorhom/bottom-sheet`.                                                                                                                                   |
| L26 | [app/\_layout.tsx](app/_layout.tsx)                                                               | `Sentry.init()` hardcodes the DSN; should pull from `Constants.expoConfig.extra.sentryDsn` or env.                                                                                                                                                                                        |
| L27 | [components/AcceptChallengeSheet.tsx](components/AcceptChallengeSheet.tsx)                        | `useEffect` with `[]` deps triggers `suggestHabitMatch` on every mount → duplicate edge-function calls.                                                                                                                                                                                   |
| L28 | [components/AISuggestionSheet.tsx](components/AISuggestionSheet.tsx)                              | `accepted` index `Set` grows unbounded for the session — minor but accumulates references.                                                                                                                                                                                                |
| L29 | Template remnants                                                                                 | [components/parallax-scroll-view.tsx](components/parallax-scroll-view.tsx), [components/hello-wave.tsx](components/hello-wave.tsx), [components/ui/icon-symbol.ios.tsx](components/ui/icon-symbol.ios.tsx), [app/modal.tsx](app/modal.tsx) — Expo starter files never deleted. Dead code. |
| L30 | [tsconfig.json](tsconfig.json)                                                                    | `reactCompiler` experiment enabled but no `@babel/plugin-react-compiler` dependency declared. Verify build still passes.                                                                                                                                                                  |

---

## 🟢 Open Areas — Strategic / Larger Work

### High impact, low effort

- **Extract checklist row component** — single `<ChecklistRow type="task|habit">` would erase ~400 LOC between [tasks.tsx](<app/(tabs)/tasks.tsx>) and [habits.tsx](<app/(tabs)/habits.tsx>).
- **Delete template leftovers** — `parallax-scroll-view.tsx`, `hello-wave.tsx`, `modal.tsx`, `google-auth.tsx` (after route removal).
- **DRY the inline color literals** — replace `#1f2123`, `#2a2c2e`, `#ef4444`, `#f97316` with named theme tokens (`surface`, `border`, `danger`, `warning`).
- **Clean up `.env`** — rename to `.env.local`, add `.env*` to `.gitignore`, verify history isn't leaking it (`git log -- .env`).
- **Fix `eas.json` env inheritance** — hoist shared env to top-level, override only when needed.

### Medium impact, medium effort

- **Add a `schema_version` PRAGMA** in SQLite and a real migration registry. The current `try { ALTER TABLE } catch (_) {}` pattern silently swallows real errors.
- **Bound the celebration & rescue Maps** — call `flashAnims.delete(id)` in `celebrate`'s `Animated.timing` callback; dedupe rescue items by `(habitId, date)`.
- **Mappers consolidation** in [useSyncStore.ts](store/useSyncStore.ts) — single `toRemote` and `toLocal` per entity type, no duplicated logic.
- **Implement or remove** the empty `habit-suggestions` Edge Function — currently a 100% failure surface for the AI flow.
- **Move secrets out of source** — Sentry DSN, EAS project ID, Cloudinary cloud name. Use `expo-constants` `extra` field injected by `app.config.ts`/EAS.

### High impact, larger effort

- **Tests.** Zero coverage anywhere. At minimum:
  - Unit tests for [utils/streak.ts](utils/streak.ts) and [utils/notifications.ts](utils/notifications.ts) (pure functions).
  - Integration tests for the sync mapper round-trip.
  - Smoke tests via `detox` or `maestro` for OAuth + sync flows.
- **Error boundaries.** No `ErrorBoundary` anywhere — an unhandled render error in [tasks.tsx](<app/(tabs)/tasks.tsx>) takes down the whole tab.
- **Accessibility.** No `accessibilityLabel`, `accessibilityRole`, or `accessibilityHint` on custom interactive views (chips, toggles, drag handles).
- **Conflict-resolution UI.** Sync is "last write wins" silently. No UI for users when a remote change overwrites a local edit.
- **Supabase Realtime.** No realtime subscription — multi-device sync only happens on foreground / explicit `scheduleSync()`. A `postgres_changes` listener would make changes appear instantly on other devices.
- **Retry/backoff for AI Edge Functions.** All three AI stores (`useAIStore`, `useInsightsStore`, `useChatStore`) fire-and-forget with no retry on 429/5xx.
- **CI/CD pipeline.** No GitHub Actions, no EAS Update workflow, no automated builds on PR.
- **i18n.** Hardcoded English strings throughout (`"Sign out"`, `"Tasks"`, `"Coming soon"`, etc.).
- **Analytics / product metrics.** Only Sentry for crashes — no event telemetry (PostHog, Amplitude, etc.).
- **Image optimization pipeline.** [utils/challengeProof.ts](utils/challengeProof.ts) uploads raw camera images — no compression, no resize, no EXIF strip.
- **Backup/restore beyond Share.** [app/profile.tsx](app/profile.tsx) exports as JSON via `Share.share`, but there's no schema-version field, no diff import, and no merge strategy.
- **Migrate `presentationStyle="pageSheet"` → `@gorhom/bottom-sheet`** for consistent iOS/Android modal feel.

---

## 📊 Summary

| Severity      | Count |
| ------------- | ----- |
| 🔴 Critical   | 5     |
| 🟠 Warning    | 15    |
| 🟡 Info       | 10    |
| 🟢 Open Areas | 17    |

### Top 5 priorities to address first

1. **Implement or remove** the empty `supabase/functions/habit-suggestions/index.ts` — currently a guaranteed 404 on the AI flow.
2. **Rotate & relocate** the Supabase anon key — it's exposed in `.env` _and_ `eas.json` for all build profiles.
3. **Fix `useCelebration` Map leak** — a few lines, prevents long-session memory growth.
4. **Add a SQLite schema_version PRAGMA** — replace the silent `try/catch (_)` migration pattern.
5. **Delete Expo-template dead code** (`modal.tsx`, `parallax-scroll-view.tsx`, `hello-wave.tsx`, `google-auth.tsx` route) — zero-risk cleanup.

---

_Generated 2026-08-22 from a read-only scan of the DockDaily codebase. Expo SDK 54.0.37, React Native 0.81.5, React 19.1.0, expo-router 6.0.23, zustand 5.0.14, expo-sqlite 16.0.10, Supabase, Sentry 7.2.0, TypeScript 5.9.2._
