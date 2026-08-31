import * as Notifications from "expo-notifications";
import { getLocalDateString } from "@/utils/streak";

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

export async function requestNotificationPermissions(): Promise<boolean> {
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
// Per-item reminders (habits & tasks)
// ─────────────────────────────────────────────

function habitReminderId(habitId: string) {
  return `dockdaily-habit-${habitId}`;
}

function taskReminderId(taskId: string) {
  return `dockdaily-task-${taskId}`;
}

export async function scheduleHabitReminder(
  habitId: string,
  title: string,
  reminderTime: string,
  reminderDate?: string | null // YYYY-MM-DD, optional start date
): Promise<void> {
  const [hour, minute] = reminderTime.split(":").map(Number);
  const identifier = habitReminderId(habitId);

  await Notifications.cancelScheduledNotificationAsync(identifier).catch(
    () => {},
  );

  const todayKey = getLocalDateString();

  if (reminderDate && reminderDate > todayKey) {
    // Start date hasn't arrived yet — schedule a ONE-TIME reminder for that exact
    // date+time. Once the app is opened on/after that date, refreshHabitReminders()
    // will re-call this function and it'll fall into the daily-recurring branch below.
    const [year, month, day] = reminderDate.split("-").map(Number);
    const startDateTime = new Date(year, month - 1, day, hour, minute, 0);

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: "✅ Habit reminder",
        body: `Time for "${title}"`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: startDateTime,
      },
    });
  } else {
    // No start date, or the start date has arrived/passed — normal daily recurring
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
      },
    });
  }
}

export async function cancelHabitReminder(habitId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    habitReminderId(habitId),
  ).catch(() => {});
}

export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  reminderTime: string,
  reminderDate?: string | null // YYYY-MM-DD
): Promise<void> {
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
    },
  });
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    taskReminderId(taskId),
  ).catch(() => {});
}

// Re-evaluates every habit's reminder schedule — call this on app foreground/init.
// Habits with a future start date will self-correct into daily-recurring mode
// once that date arrives, with zero extra state tracking needed.
export async function refreshHabitReminders(
  habits: {
    id: string;
    title: string;
    reminder_time?: string | null;
    reminder_date?: string | null;
  }[],
): Promise<void> {
  for (const habit of habits) {
    if (habit.reminder_time) {
      await scheduleHabitReminder(
        habit.id,
        habit.title,
        habit.reminder_time,
        habit.reminder_date,
      );
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
