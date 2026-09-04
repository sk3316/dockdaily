import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getLocalDateString } from "@/utils/streak";
import { HabitReminderConfig } from "@/types";

export const NOTIFICATION_CHANNEL_ID = "dockdaily-reminders";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DAILY_REMINDER_ID = "dockdaily-daily-reminder";

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: "DockDaily Reminders",
        description: "Notifications for daily habits and task reminders",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6366f1",
      });
    } catch (err) {
      console.warn("[Notifications] Failed to set notification channel:", err);
    }
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  await setupNotificationChannels();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function registerPushToken(): Promise<string | null> {
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  try {
    const projectId = 'c9a82720-1133-49c7-97ea-d9ab5fed5108'; // your EAS projectId
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (err) {
    console.error('[Notifications] Failed to get push token:', err);
    return null;
  }
}

export async function scheduleDailyReminder(
  reminderTime: string,
): Promise<void> {
  await setupNotificationChannels();
  const [hour, minute] = reminderTime.split(":").map(Number);
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(
    () => {},
  );
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: "🎯 DockDaily",
      body: "Time to check in on your habits and tasks!",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: NOTIFICATION_CHANNEL_ID,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(
    () => {},
  );
}

export async function handleSmartNotification(
  reminderTime: string,
  hasIncomplete: boolean,
): Promise<void> {
  const [hour, minute] = reminderTime.split(":").map(Number);
  const now = new Date();
  const reminderToday = new Date();
  reminderToday.setHours(hour, minute, 0, 0);
  const isBeforeReminderTime = now < reminderToday;

  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(
    () => {},
  );

  if (!hasIncomplete && isBeforeReminderTime) {
    const tomorrow = new Date(reminderToday);
    tomorrow.setDate(tomorrow.getDate() + 1);
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: "🎯 DockDaily",
        body: "Time to check in on your habits and tasks!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: tomorrow,
      },
    });
  } else {
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: "🎯 DockDaily",
        body: hasIncomplete
          ? "You still have habits and tasks to complete today!"
          : "Time to check in on your habits and tasks!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }
}

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Per-item reminders (habits & tasks)
// ─────────────────────────────────────────────

function habitReminderPrefix(habitId: string) {
  return `dockdaily-habit-${habitId}`;
}

function taskReminderId(taskId: string) {
  return `dockdaily-task-${taskId}`;
}

/**
 * Generates an array of "HH:MM" 24h strings starting from startTime up to endTime
 * at stepMinutes intervals (e.g. 10:00 to 20:00, step 120 -> 10:00, 12:00, 14:00, 16:00, 18:00, 20:00).
 * Capped at 12 slots to avoid overflowing iOS 64-notification limits.
 */
export function generateIntervalSlots(
  startTime: string,
  endTime: string,
  stepMinutes: number
): string[] {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    return [startTime];
  }

  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  if (endTotal <= startTotal) {
    return [startTime];
  }

  const slots: string[] = [];
  const step = Math.max(15, stepMinutes); // Minimum 15-minute floor

  for (let cur = startTotal; cur <= endTotal; cur += step) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    if (slots.length >= 12) break;
  }

  return slots;
}

/**
 * Resolves any HabitReminderConfig or legacy reminder_time into an array of discrete "HH:MM" times.
 */
export function resolveHabitReminderTimes(
  config?: HabitReminderConfig | null,
  fallbackTime?: string | null
): string[] {
  if (!config) {
    return fallbackTime ? [fallbackTime] : [];
  }

  if (config.mode === "single") {
    return config.time ? [config.time] : (fallbackTime ? [fallbackTime] : []);
  }

  if (config.mode === "times") {
    if (config.times && config.times.length > 0) {
      return config.times;
    }
    return config.time ? [config.time] : (fallbackTime ? [fallbackTime] : []);
  }

  if (config.mode === "interval") {
    if (config.interval?.startTime && config.interval?.endTime) {
      return generateIntervalSlots(
        config.interval.startTime,
        config.interval.endTime,
        config.interval.stepMinutes || 120
      );
    }
    return config.time ? [config.time] : (fallbackTime ? [fallbackTime] : []);
  }

  return fallbackTime ? [fallbackTime] : [];
}

/**
 * Cancels all scheduled notifications associated with a habit (both legacy and multi-slot).
 */
export async function cancelHabitReminder(habitId: string): Promise<void> {
  try {
    const prefix = habitReminderPrefix(habitId);
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.identifier === prefix || item.identifier.startsWith(`${prefix}-`)) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => {});
      }
    }
  } catch (err) {
    console.error("[Notifications] Error canceling habit reminders:", err);
  }
}

/**
 * Schedules one or more daily recurring reminders for a habit.
 */
export async function scheduleHabitReminder(
  habitId: string,
  title: string,
  reminderTimeOrTimes: string | string[],
  _reminderDate?: string | null // retained for interface compatibility
): Promise<void> {
  await setupNotificationChannels();
  await cancelHabitReminder(habitId);

  const times = Array.isArray(reminderTimeOrTimes)
    ? reminderTimeOrTimes
    : [reminderTimeOrTimes];

  if (times.length === 0) return;

  for (const timeStr of times) {
    const [hour, minute] = timeStr.split(":").map(Number);
    if (isNaN(hour) || isNaN(minute)) continue;

    const timeTag = `${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}`;
    const identifier = `${habitReminderPrefix(habitId)}-${timeTag}`;

    // Habit reminders are always scheduled as recurring DAILY notifications
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: "✅ Habit reminder",
        body: `Time for "${title}"`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    }).catch((err) => {
      console.warn(`[Notifications] Failed to schedule habit reminder ${identifier}:`, err);
    });
  }
}

export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  reminderTime: string,
  reminderDate?: string | null // YYYY-MM-DD
): Promise<void> {
  await setupNotificationChannels();
  const [hour, minute] = reminderTime.split(":").map(Number);
  const identifier = taskReminderId(taskId);

  await Notifications.cancelScheduledNotificationAsync(identifier).catch(
    () => {},
  );

  let target: Date;

  if (reminderDate) {
    const [year, month, day] = reminderDate.split("-").map(Number);
    target = new Date(year, month - 1, day, hour, minute, 0);
  } else {
    // Backward-compatible fallback for any reminder set before date picking existed
    const now = new Date();
    target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
  }

  // Safety: never schedule something already in the past
  if (target <= new Date()) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: "📋 Task reminder",
      body: title,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: target,
      channelId: NOTIFICATION_CHANNEL_ID,
    },
  }).catch((err) => {
    console.warn(`[Notifications] Failed to schedule task reminder ${identifier}:`, err);
  });
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    taskReminderId(taskId),
  ).catch(() => {});
}

// Re-evaluates every habit's reminder schedule — call this on app foreground/init.
export async function refreshHabitReminders(
  habits: {
    id: string;
    title: string;
    reminder_time?: string | null;
    reminder_date?: string | null;
    reminder_config?: string | null;
  }[],
): Promise<void> {
  for (const habit of habits) {
    let parsedConfig: HabitReminderConfig | null = null;
    if (habit.reminder_config) {
      try {
        parsedConfig = JSON.parse(habit.reminder_config);
      } catch (_) {}
    }

    const times = resolveHabitReminderTimes(parsedConfig, habit.reminder_time);
    const startDate = parsedConfig?.startDate ?? habit.reminder_date;

    if (times.length > 0) {
      await scheduleHabitReminder(habit.id, habit.title, times, startDate);
    } else {
      await cancelHabitReminder(habit.id);
    }
  }
}

export async function refreshTaskReminders(
  tasks: {
    id: string;
    title: string;
    reminder_time?: string | null;
    reminder_date?: string | null;
    completed?: boolean | number;
  }[],
): Promise<void> {
  for (const task of tasks) {
    if (task.reminder_time && !task.completed) {
      await scheduleTaskReminder(
        task.id,
        task.title,
        task.reminder_time,
        task.reminder_date,
      );
    }
  }
}

// ─────────────────────────────────────────────
// Habit rescue nudge (immediate, AI-generated)
// ─────────────────────────────────────────────

export async function fireRescueNotification(
  habitTitle: string,
  message: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔄 ${habitTitle}`,
      body: message,
      sound: true,
    },
    trigger: null, // fires immediately
  });
}

/**
 * Formats a habit's reminder configuration or time into a badge string.
 * Used in both Habits screen and Today dashboard screen.
 */
export function getReminderBadgeText(habit: {
  reminder_time?: string | null;
  reminder_config?: string | null;
}): string | null {
  if (!habit.reminder_time && !habit.reminder_config) return null;
  if (habit.reminder_config) {
    try {
      const cfg: HabitReminderConfig = JSON.parse(habit.reminder_config);
      if (cfg.mode === "interval" && cfg.interval) {
        const hrs = cfg.interval.stepMinutes / 60;
        return `Every ${hrs % 1 === 0 ? hrs : hrs.toFixed(1)}h`;
      }
      if (cfg.mode === "times" && cfg.times && cfg.times.length > 0) {
        const [h, m] = cfg.times[0].split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const hour12 = h % 12 || 12;
        if (cfg.times.length > 1) {
          return `${hour12}:${String(m).padStart(2, "0")} ${ampm} (+${cfg.times.length - 1})`;
        }
        return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
      }
    } catch {}
  }
  if (habit.reminder_time) {
    const [h, m] = habit.reminder_time.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const ampm = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 || 12;
      return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
    }
  }
  return null;
}

/**
 * Formats a task's reminder time into a badge string.
 */
export function getTaskReminderBadgeText(task: {
  reminder_time?: string | null;
}): string | null {
  if (!task.reminder_time) return null;
  const [h, m] = task.reminder_time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return task.reminder_time;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}
