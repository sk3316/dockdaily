import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '@/utils/notifications';

export type ThemePreference = 'system' | 'light' | 'dark';

type PreferenceStore = {
  theme: ThemePreference;
  notificationsEnabled: boolean;
  reminderTime: string; // HH:MM format e.g. "08:00"
  loaded: boolean;
  loadPreferences: () => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setReminderTime: (time: string) => Promise<void>;
};

const KEYS = {
  theme: 'pref_theme',
  notificationsEnabled: 'pref_notifications_enabled',
  reminderTime: 'pref_reminder_time',
  hasPromptedNotif: 'pref_has_prompted_notif',
};

export const usePreferenceStore = create<PreferenceStore>((set, get) => ({
  theme: 'system',
  notificationsEnabled: false,
  reminderTime: '08:00',
  loaded: false,

  loadPreferences: async () => {
    const [theme, notifEnabled, reminderTime, hasPrompted] = await Promise.all([
      SecureStore.getItemAsync(KEYS.theme),
      SecureStore.getItemAsync(KEYS.notificationsEnabled),
      SecureStore.getItemAsync(KEYS.reminderTime),
      SecureStore.getItemAsync(KEYS.hasPromptedNotif),
    ]);

    let isNotifEnabled = notifEnabled === 'true';
    const currentReminderTime = reminderTime ?? '08:00';

    if (!hasPrompted) {
      // First time user is opening the app (or first time since this feature was added)
      const granted = await requestNotificationPermissions();
      isNotifEnabled = granted;
      await SecureStore.setItemAsync(KEYS.hasPromptedNotif, 'true');
      await SecureStore.setItemAsync(KEYS.notificationsEnabled, String(granted));
      
      if (granted) {
        await scheduleDailyReminder(currentReminderTime);
      }
    }

    set({
      theme: (theme as ThemePreference) ?? 'system',
      notificationsEnabled: isNotifEnabled,
      reminderTime: currentReminderTime,
      loaded: true,
    });
  },

  setTheme: async (theme) => {
    await SecureStore.setItemAsync(KEYS.theme, theme);
    set({ theme });
  },

  setNotificationsEnabled: async (enabled) => {
    await SecureStore.setItemAsync(KEYS.notificationsEnabled, String(enabled));

    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        // Permission denied — revert the toggle silently
        await SecureStore.setItemAsync(KEYS.notificationsEnabled, 'false');
        set({ notificationsEnabled: false });
        return;
      }
      await scheduleDailyReminder(get().reminderTime);
    } else {
      await cancelDailyReminder();
    }

    set({ notificationsEnabled: enabled });
  },

  setReminderTime: async (time) => {
    await SecureStore.setItemAsync(KEYS.reminderTime, time);
    set({ reminderTime: time });

    // Reschedule if notifications are on
    if (get().notificationsEnabled) {
      await scheduleDailyReminder(time);
    }
  },
}));