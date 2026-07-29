import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Habit, Task } from '@/types';

export type AISuggestedHabit = {
  title: string;
  type: Habit['type'];
  target: number;
  reason: string;
};

export type AISuggestedTask = {
  title: string;
  reason: string;
};

export type AISuggestions = {
  habits: AISuggestedHabit[];
  tasks: AISuggestedTask[];
  insight: string;
};

type AIStore = {
  suggestions: AISuggestions | null;
  loading: boolean;
  error: string | null;
  sheetVisible: boolean;
  triggerHabit: Habit | null;
  fetchSuggestions: (
    newHabit: Habit,
    existingHabits: Habit[],
    openTasks: Task[]
  ) => Promise<void>;
  dismissSheet: () => void;
  clearSuggestions: () => void;
};

export const useAIStore = create<AIStore>((set) => ({
  suggestions: null,
  loading: false,
  error: null,
  sheetVisible: false,
  triggerHabit: null,

  fetchSuggestions: async (newHabit, existingHabits, openTasks) => {
    set({ loading: true, error: null, sheetVisible: true, triggerHabit: newHabit, suggestions: null });

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/habit-suggestions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            newHabit: { title: newHabit.title, type: newHabit.type, target: newHabit.target },
            existingHabits: existingHabits.filter((h) => h.id !== newHabit.id),
            openTasks,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        set({ error: data.error ?? 'Something went wrong', loading: false });
        return;
      }

      set({ suggestions: data, loading: false });
    } catch (err) {
      console.error('[AI] fetchSuggestions error:', err);
      set({ error: 'Network error — try again', loading: false });
    }
  },

  dismissSheet: () => set({ sheetVisible: false, suggestions: null, error: null, triggerHabit: null }),
  clearSuggestions: () => set({ suggestions: null, error: null }),
}));