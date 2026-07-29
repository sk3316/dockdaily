import * as Notifications from "expo-notifications";

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
): Promise<void> {
  const [hour, minute] = reminderTime.split(":").map(Number);
  const identifier = habitReminderId(habitId);

  await Notifications.cancelScheduledNotificationAsync(identifier).catch(
    () => {},
  );
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

export async function cancelHabitReminder(habitId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    habitReminderId(habitId),
  ).catch(() => {});
}

export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  reminderTime: string,
): Promise<void> {
  const [hour, minute] = reminderTime.split(":").map(Number);
  const identifier = taskReminderId(taskId);

  // Tasks are one-time — schedule for the next occurrence of this time (today or tomorrow)
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  await Notifications.cancelScheduledNotificationAsync(identifier).catch(
    () => {},
  );
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
