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
  reminder_time?: string | null; // HH:MM format
  last_known_streak?: number; // used for rescue detection
};

export type HabitLog = {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  value: number;
  completed: boolean;
};