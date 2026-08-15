---
name: expo-rn-feature
description: "Use when: building a new feature or screen in an Expo + React Native app — adding routes, components, native modules, state, or Supabase-backed data. Covers Expo SDK 54, expo-router, zustand, expo-sqlite, Supabase, and EAS. Triggers: 'add a screen', 'new feature', 'expo router route', 'react native component', 'add a tab', 'expo SQLite', 'supabase edge function', 'EAS build profile'."
---

# Expo + React Native — Build a New Feature

A repeatable workflow for adding a feature or screen to an Expo + React Native app. Anchored to the exact versions installed in `package.json` and the official versioned docs at `https://docs.expo.dev/versions/v54.0.0/`.

## When to Use

- New screen, modal, or tab under `app/` using `expo-router`
- New feature module that spans `app/`, `components/`, `store/`, `db/`, `supabase/`
- Adding native capability (camera, notifications, secure store, haptics, etc.)
- Adding a Supabase Edge Function + wiring it into the app
- New EAS build profile or distribution target

## When NOT to Use

- Pure web work with no Expo dependency
- Debugging a specific runtime error (use the default agent with logs)
- Reviewing/editing non-Expo tooling (Node, pnpm, etc.)

---

## Workflow

### 1. Read the versioned Expo docs FIRST

Before writing any Expo API call, open `https://docs.expo.dev/versions/v54.0.0/` and confirm:

- The package is in the **SDK 54** install range
- Import path is correct (Expo reorganizes exports between SDKs)
- Required config plugin is declared in `app.json` (not `app.config.js` unless the project uses one)
- For native modules: `npx expo install` is the only sanctioned install path

> Why: SDK 54 changed several APIs vs SDK 51/52/53. The repo's `AGENTS.md` mandates reading v54 docs before any code.

### 2. Cross-check `package.json`

Verify every dependency you'll touch is already declared. If something is missing, add it via:

```bash
npx expo install <package>
```

Never hand-edit a version pin. Never mix `npm install` and `npx expo install` for Expo-managed packages.

### 3. Pick the right layer for new code

| Concern            | Location                             | Notes                                                                       |
| ------------------ | ------------------------------------ | --------------------------------------------------------------------------- |
| Route / screen     | `app/`                               | File-based routing via `expo-router`. `_layout.tsx` is the layout root.     |
| Reusable UI        | `components/`                        | Stateless preferred. Theming via `themed-text.tsx` / `themed-view.tsx`.     |
| State (client)     | `store/`                             | zustand stores. One store per domain (see `useTaskStore`, `useHabitStore`). |
| Local DB           | `db/`                                | `expo-sqlite` + schema in `db/schema.ts`.                                   |
| Remote auth + data | `lib/supabase.ts`                    | Single client, exported.                                                    |
| Server logic       | `supabase/functions/<name>/index.ts` | Deno Edge Functions.                                                        |
| Hooks              | `hooks/`                             | Reusable cross-feature effects.                                             |
| Theme              | `constants/theme.ts`                 | Single source of truth for colors.                                          |

### 4. Build the route

1. Create the file under `app/` following the existing convention (e.g. `app/(tabs)/<name>.tsx` for a tab, `app/<name>.tsx` for a stack screen).
2. If it is a tab, add an entry to `app/(tabs)/_layout.tsx` `<Tabs.Screen>`.
3. If it needs a stack push, ensure `app/_layout.tsx` has the route registered (it usually inherits, but modals need an explicit group).
4. Use `Stack.Screen` options inside the route file for per-screen header config.

### 5. Add state (if needed)

- One new file in `store/use<Name>Store.ts` following the zustand pattern of the repo.
- Keep types in `types/index.ts` if shared.
- If the store touches Supabase, route writes through `store/syncScheduler.ts` rather than calling Supabase directly.

### 6. Wire data (if needed)

- **Local only**: extend `db/schema.ts` and add a migration helper. Read/write through a `db/database.ts` function.
- **Remote only**: use the singleton client from `lib/supabase.ts`. Wrap calls in `useEffect` inside a custom hook in `hooks/`.
- **Hybrid**: read from SQLite first, then trigger `syncScheduler` to reconcile. Never block the UI on Supabase.

### 7. Verify

Run in this order, fixing each before moving on:

```bash
npx expo-doctor
npx expo lint
npx tsc --noEmit
npx expo start --ios      # or --android / --web
```

Then:

- Confirm the new screen renders and the back/forward navigation works.
- Confirm the new state survives an app reload (zustand persist) and a hot restart.
- If native module added: `expo prebuild --clean` then a full dev-client build.

---

## Decision Points

**Pure UI feature (no data)?**
→ Skip steps 5 and 6. Just steps 1, 4, 7.

**Needs a Supabase Edge Function?**
→ Add a step 5.5: create `supabase/functions/<name>/index.ts` (Deno, `Deno.serve`), test locally with `supabase functions serve <name>`, deploy with `supabase functions deploy <name>`. Then wire from the app in step 6.

**New native permission (camera, notifications, location)?**
→ Add to step 1: confirm the SDK 54 permission flow, then to step 2: add the config plugin to `app.json`, then to step 7: test on a real device — Expo Go cannot exercise native permissions reliably.

**Replacing expo-router with manual React Navigation?**
→ Out of scope. Stop and ask the user.

---

## Quality Checklist (Completion Gate)

A feature is "done" only when all of the below are true:

- [ ] Every Expo API used was verified against `https://docs.expo.dev/versions/v54.0.0/`
- [ ] Every new dependency was added with `npx expo install`
- [ ] Route file is in the correct folder (`app/`, `app/(tabs)/`, or a modal group)
- [ ] If a tab, registered in `app/(tabs)/_layout.tsx`
- [ ] If new zustand store, it follows the existing pattern in `store/`
- [ ] If new Supabase call, it goes through the singleton in `lib/supabase.ts` and, where appropriate, `syncScheduler`
- [ ] `npx expo-doctor` and `npx tsc --noEmit` both pass
- [ ] Smoke-tested on at least one platform via `npx expo start`
- [ ] No hardcoded colors outside `constants/theme.ts`

---

## Common Pitfalls

- **Mixing Expo SDK versions.** SDK 54 ships specific `expo-*` versions. Don't pin to anything older without a clear reason — the versioned docs page is the source of truth.
- **Installing native packages with `npm i` instead of `npx expo install`.** This produces version drift and breaks prebuild.
- **Editing `app.config.js` when the repo uses `app.json`.** Adds friction with EAS.
- **Calling Supabase from inside zustand actions without going through `syncScheduler`.** Bypasses the offline queue.
- **Putting new colors inline.** `constants/theme.ts` exists for a reason; keep theme tokens centralized.
- **Forgetting `expo prebuild` after adding a config plugin.** The native folder won't pick it up otherwise.

---

## Bundled Assets

This skill ships **no bundled assets** — it is a pure workflow. If you find yourself repeatedly running the same scaffolding command, add it to `scripts/` and reference it here.

---

## References

- Expo SDK 54 docs: https://docs.expo.dev/versions/v54.0.0/
- `expo-router` docs: https://docs.expo.dev/router/introduction/
- zustand: https://zustand.docs.pmnd.rs/
- `expo-sqlite`: https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/
- Supabase JS: https://supabase.com/docs/reference/javascript
- EAS Build: https://docs.expo.dev/build/introduction/
