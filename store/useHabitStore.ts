import { create } from 'zustand';
import { getDatabase } from '../db/database';
import { getLocalDateString, calculateStreak } from '../utils/streak';
import { Habit, HabitLog, HabitReminderConfig } from '../types';
import { randomUUID } from 'expo-crypto';
import { scheduleSync } from './syncScheduler';
import {
  scheduleHabitReminder,
  cancelHabitReminder,
  resolveHabitReminderTimes,
} from '../utils/notifications';

function todayStr() {
  return getLocalDateString();
}

export type BrokenStreak = {
  habit: Habit;
  previousStreak: number;
};

type HabitStore = {
  habits: Habit[];
  logsToday: HabitLog[];
  allLogs: HabitLog[];
  loading: boolean;
  loadHabits: () => Promise<void>;
  loadTodayLogs: () => Promise<void>;
  loadAllLogs: () => Promise<void>;
  addHabit: (title: string, type?: Habit['type'], target?: number) => Promise<void>;
  updateHabitTitle: (id: string, title: string) => Promise<void>;
  logHabit: (habitId: string, value: number, target: number) => Promise<void>;
  logHabitForDate: (
    habitId: string,
    date: string,
    value: number,
    target: number
  ) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  reorderHabits: (orderedIds: string[]) => Promise<void>;
  setHabitReminder: (
    id: string,
    configOrTime: HabitReminderConfig | string | null,
    date?: string | null
  ) => Promise<void>;
  checkForBrokenStreaks: () => Promise<BrokenStreak[]>;
};

export const useHabitStore = create<HabitStore>((set, get) => ({
  habits: [],
  logsToday: [],
  allLogs: [],
  loading: false,

  loadHabits: async () => {
    set({ loading: true });
    const database = await getDatabase();
    const rows = await database.getAllAsync<Habit>(
      'SELECT * FROM habits ORDER BY sort_order ASC, created_at ASC'
    );
    set({ habits: rows, loading: false });
  },

  loadTodayLogs: async () => {
    const database = await getDatabase();
    const rows = await database.getAllAsync<any>(
      'SELECT * FROM habit_logs WHERE date = ?',
      todayStr()
    );
    const logs: HabitLog[] = rows.map((r) => ({ ...r, completed: !!r.completed }));
    set({ logsToday: logs });
  },

  loadAllLogs: async () => {
    const database = await getDatabase();
    const rows = await database.getAllAsync<any>(
      'SELECT * FROM habit_logs ORDER BY date DESC'
    );
    const logs: HabitLog[] = rows.map((r) => ({ ...r, completed: !!r.completed }));
    set({ allLogs: logs });
  },

  addHabit: async (title, type = 'boolean', target = 1) => {
    const database = await getDatabase();
    const id = randomUUID();
    const created_at = new Date().toISOString();
    const result = await database.getFirstAsync<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM habits'
    );
    const nextOrder = (result?.max_order ?? -1) + 1;
    await database.runAsync(
      'INSERT INTO habits (id, title, type, target, frequency, color, created_at, synced, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
      id,
      title,
      type,
      target,
      'daily',
      '#6366f1',
      created_at,
      nextOrder
    );
    await get().loadHabits();
    scheduleSync();
  },

  updateHabitTitle: async (id, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE habits SET title = ?, synced = 0 WHERE id = ?',
      trimmed,
      id
    );
    await get().loadHabits();
  },

  logHabit: async (habitId, value, target) => {
    return get().logHabitForDate(habitId, todayStr(), value, target);
  },

  logHabitForDate: async (habitId, date, value, target) => {
    const database = await getDatabase();
    const existing = await database.getFirstAsync<any>(
      'SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?',
      habitId,
      date
    );
    const wasCompleted = existing ? !!existing.completed : false;
    const completed = value >= target ? 1 : 0;

    if (existing) {
      await database.runAsync(
        'UPDATE habit_logs SET value = ?, completed = ?, synced = 0 WHERE id = ?',
        value,
        completed,
        existing.id
      );
    } else {
      const id = randomUUID();
      await database.runAsync(
        'INSERT INTO habit_logs (id, habit_id, date, value, completed, synced) VALUES (?, ?, ?, ?, ?, 0)',
        id,
        habitId,
        date,
        value,
        completed
      );
    }

    if (date === todayStr()) {
      await get().loadTodayLogs();
    }
    await get().loadAllLogs();

    // Update last_known_streak after logging (keeps rescue detection accurate)
    const updatedStreak = calculateStreak(get().allLogs, habitId);
    await database.runAsync(
      'UPDATE habits SET last_known_streak = ? WHERE id = ?',
      updatedStreak,
      habitId
    );
    await get().loadHabits();

    scheduleSync();

    // Newly completed today — check for a linked active challenge
    if (date === todayStr() && !wasCompleted && completed === 1) {
      const { syncHabitToChallenge } = await import('./challengeSync');
      syncHabitToChallenge(habitId).catch((err) =>
        console.error('[Habit] challenge sync error:', err)
      );
    }

    // If completed a past day (e.g. yesterday), dismiss any active rescue card
    if (date !== todayStr() && completed === 1) {
      try {
        const { useRescueStore } = await import('./useRescueStore');
        useRescueStore.getState().dismiss(habitId);
      } catch (_) {}
    }
  },

  deleteHabit: async (id) => {
    const database = await getDatabase();
    const now = new Date().toISOString();
    await database.runAsync(
      "INSERT OR REPLACE INTO deleted_records (table_name, record_id, deleted_at) VALUES ('habits', ?, ?)",
      id,
      now
    );
    // Explicitly delete logs as a safety net (CASCADE should handle this,
    // but only if PRAGMA foreign_keys is active on the connection)
    await database.runAsync('DELETE FROM habit_logs WHERE habit_id = ?', id);
    await database.runAsync('DELETE FROM habits WHERE id = ?', id);
    await cancelHabitReminder(id);
    await get().loadHabits();
    await get().loadAllLogs();
    await get().loadTodayLogs();
    scheduleSync();
  },

  reorderHabits: async (orderedIds) => {
    const database = await getDatabase();
    for (let i = 0; i < orderedIds.length; i++) {
      await database.runAsync(
        'UPDATE habits SET sort_order = ?, synced = 0 WHERE id = ?',
        i,
        orderedIds[i]
      );
    }
    await get().loadHabits();
    scheduleSync();
  },

  setHabitReminder: async (id, configOrTime, date = null) => {
    const database = await getDatabase();
    let reminderTime: string | null = null;
    let reminderDate: string | null = null;
    let reminderConfigStr: string | null = null;
    let timesToSchedule: string[] = [];

    if (!configOrTime) {
      reminderTime = null;
      reminderDate = null;
      reminderConfigStr = null;
    } else if (typeof configOrTime === 'string') {
      reminderTime = configOrTime;
      reminderDate = date;
      const config: HabitReminderConfig = {
        mode: 'single',
        time: configOrTime,
        startDate: date,
      };
      reminderConfigStr = JSON.stringify(config);
      timesToSchedule = [configOrTime];
    } else {
      const config = configOrTime;
      timesToSchedule = resolveHabitReminderTimes(config);
      reminderTime = timesToSchedule[0] ?? null;
      reminderDate = config.startDate ?? date ?? null;
      reminderConfigStr = JSON.stringify(config);
    }

    await database.runAsync(
      'UPDATE habits SET reminder_time = ?, reminder_date = ?, reminder_config = ?, synced = 0 WHERE id = ?',
      reminderTime,
      reminderDate,
      reminderConfigStr,
      id
    );

    const habit = get().habits.find((h) => h.id === id);
    if (timesToSchedule.length > 0 && habit) {
      await scheduleHabitReminder(id, habit.title, timesToSchedule, reminderDate);
    } else {
      await cancelHabitReminder(id);
    }

    await get().loadHabits();
    scheduleSync();
  },

  // Compares each habit's current streak against its last known streak.
  // Returns any habits whose streak just dropped from 3+ to 0 (a "break").
  checkForBrokenStreaks: async () => {
    const database = await getDatabase();
    const { habits, allLogs } = get();
    const broken: BrokenStreak[] = [];

    for (const habit of habits) {
      const currentStreak = calculateStreak(allLogs, habit.id);
      const previousStreak = habit.last_known_streak ?? 0;

      if (previousStreak >= 3 && currentStreak === 0) {
        broken.push({ habit, previousStreak });
      }

      // Always update last_known_streak to current, so we don't re-trigger
      if (currentStreak !== previousStreak) {
        await database.runAsync(
          'UPDATE habits SET last_known_streak = ? WHERE id = ?',
          currentStreak,
          habit.id
        );
      }
    }

    if (broken.length > 0) {
      await get().loadHabits();
    }

    return broken;
  },
}));