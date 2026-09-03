export type Task = {
  id: string;
  title: string;
  notes?: string;
  due_date?: string; // ISO date string
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  completed_at?: string;
  created_at: string;
  sort_order: number;
  reminder_time?: string | null; // HH:MM format
  reminder_date?: string | null; // YYYY-MM-DD
};

export type HabitReminderMode = 'single' | 'times' | 'interval';

export type HabitReminderConfig = {
  mode: HabitReminderMode;
  time?: string | null; // For 'single' mode (HH:MM)
  times?: string[]; // For 'times' mode (array of HH:MM)
  interval?: {
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    stepMinutes: number; // e.g. 60, 90, 120, 180, 240
  };
  startDate?: string | null; // YYYY-MM-DD
};

export type Habit = {
  id: string;
  title: string;
  type: 'boolean' | 'count' | 'duration';
  target: number; // e.g. 1 for boolean, 8 for "8 glasses", 10 for "10 min"
  frequency: 'daily' | 'weekly';
  color: string;
  created_at: string;
  sort_order: number;
  reminder_time?: string | null; // HH:MM format (primary/legacy time)
  reminder_date?: string | null; // YYYY-MM-DD, start date for daily reminders
  reminder_config?: string | null; // JSON-serialized HabitReminderConfig
  last_known_streak?: number; // used for rescue detection
};

export type HabitLog = {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  value: number;
  completed: boolean;
};