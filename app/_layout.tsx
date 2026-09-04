import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useRef } from "react";
import { View, ActivityIndicator, AppState } from "react-native";

import "react-native-reanimated";
import * as WebBrowser from "expo-web-browser";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { initDatabase, clearDatabase } from "@/db/database";
import { useAuthStore } from "@/store/useAuthStore";
import { useSyncStore } from "@/store/useSyncStore";
import { usePreferenceStore } from "@/store/usePreferenceStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useHabitStore } from "@/store/useHabitStore";
import { useRescueStore } from "@/store/useRescueStore";
import {
  handleSmartNotification,
  refreshHabitReminders,
  refreshTaskReminders,
  registerPushToken,
  setupNotificationChannels,
} from "@/utils/notifications";
import { supabase } from "@/lib/supabase";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://14e3e44fc2e3d09ecfdb06ca96383031@o4511783462436864.ingest.us.sentry.io/4511799902076928',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

WebBrowser.maybeCompleteAuthSession();

export const unstable_settings = { anchor: "(tabs)" };

export default Sentry.wrap(function RootLayout() {
  const systemScheme = useColorScheme();
  const [dbReady, setDbReady] = useState(false);
  const theme = usePreferenceStore((s) => s.theme);
  const user = useAuthStore((s) => s.user);

  const activeScheme = theme === "system" ? systemScheme : theme;

  // Initialize database + preferences + auth on mount (once only)
  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        await setupNotificationChannels();
        await usePreferenceStore.getState().loadPreferences();
        await useAuthStore.getState().loadSession();
        setDbReady(true);

        // Register the device's Expo push token and persist it on the user's
        // profile row so the server can target them with notifications.
        const session = useAuthStore.getState().session;
        if (session) {
          const token = await registerPushToken();
          if (token) {
            await supabase
              .from("profiles")
              .update({ push_token: token })
              .eq("id", session.user.id);
          }
        }

        // Check for broken streaks on cold start
        await useHabitStore.getState().loadAllLogs();
        await useRescueStore.getState().runRescueCheck();

        // Refresh per-item habit and task reminders
        await useHabitStore.getState().loadHabits();
        await refreshHabitReminders(useHabitStore.getState().habits);
        await useTaskStore.getState().loadTasks();
        await refreshTaskReminders(useTaskStore.getState().tasks);
      } catch (err) {
        console.error("[Init] Error:", err);
        setDbReady(true); // Still allow app to load even if there's an error
      }
    };
    init();
  }, []); // Empty deps — runs once on mount

  // Sync on app foreground (only once initialized)
  useEffect(() => {
    if (!dbReady) return;

    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        await useSyncStore.getState().syncAll();
        await useHabitStore.getState().loadAllLogs();
        await useRescueStore.getState().runRescueCheck(); // NEW

        // Refresh per-item habit and task reminders on every foreground too
        await useHabitStore.getState().loadHabits();
        await refreshHabitReminders(useHabitStore.getState().habits);
        await useTaskStore.getState().loadTasks();
        await refreshTaskReminders(useTaskStore.getState().tasks);

        // Smart notification check
        const { notificationsEnabled, reminderTime } =
          usePreferenceStore.getState();

        if (notificationsEnabled) {
          const tasks = useTaskStore.getState().tasks;
          const habits = useHabitStore.getState().habits;
          const logsToday = useHabitStore.getState().logsToday;

          const hasOpenTasks = tasks.some((t) => !t.completed);
          const hasIncompleteHabits = habits.some((h) => {
            const log = logsToday.find((l) => l.habit_id === h.id);
            return !log?.completed;
          });

          await handleSmartNotification(
            reminderTime,
            hasOpenTasks || hasIncompleteHabits,
          );
        }
      }
    });

    return () => sub.remove();
  }, [dbReady]); // Only re-run if dbReady changes

  const prevUserRef = useRef<any>(undefined);

  // Sync / Clear when user changes (auth state changes or switching accounts)
  useEffect(() => {
    if (!dbReady) return;

    const handleAuthChange = async () => {
      const prevUser = prevUserRef.current;

      // Execute only if not the initial mount transition
      if (prevUser !== undefined) {
        // If there was a user logged in, and now they signed out or switched accounts
        if (prevUser && (!user || prevUser.id !== user.id)) {
          console.log(
            "[Auth] User changed or signed out. Clearing local database.",
          );
          await clearDatabase();
          await useTaskStore.getState().loadTasks();
          await useHabitStore.getState().loadHabits();
          await useHabitStore.getState().loadAllLogs();
          await useHabitStore.getState().loadTodayLogs();
          useSyncStore.getState().resetSyncState();
        }
      }

      if (user) {
        console.log("[Auth] User signed in. Triggering sync.");
        await useSyncStore.getState().syncAll();
      }

      prevUserRef.current = user;
    };

    handleAuthChange();
  }, [user, dbReady]);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={activeScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="profile"
            options={{ presentation: "modal", headerShown: false }}
          />
          <Stack.Screen name="google-auth" options={{ headerShown: false }} />
          <Stack.Screen name="about" options={{ headerShown: false }} />
          <Stack.Screen name="friends" options={{ headerShown: false }} />
          <Stack.Screen
            name="create-challenge"
            options={{ presentation: "modal", headerShown: false }}
          />
          <Stack.Screen name="challenge/[id]" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
});
