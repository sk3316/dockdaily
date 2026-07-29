import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { Habit, HabitLog, Task } from "@/types";
import {
  calculateStreak,
  calculateLongestStreak,
  getLastNDays,
  getLocalDateString,
  parseLocalDateString,
} from "@/utils/streak";
import { differenceInDays } from "date-fns";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatStore = {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (
    question: string,
    habits: Habit[],
    allLogs: HabitLog[],
    tasks: Task[],
  ) => Promise<void>;
  clearChat: () => void;
};

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  loading: false,
  error: null,

  sendMessage: async (question, habits, allLogs, tasks) => {
    const userMessage: ChatMessage = { role: "user", content: question };
    set((state) => ({
      messages: [...state.messages, userMessage],
      loading: true,
      error: null,
    }));

    try {
      const todayKey = getLocalDateString();
      const last14Days = getLastNDays(14, parseLocalDateString(todayKey));

      const habitStats = habits.map((h) => {
        const completedDays = last14Days.filter((date) =>
          allLogs.some(
            (l) => l.habit_id === h.id && l.date === date && l.completed,
          ),
        ).length;
        return {
          title: h.title,
          type: h.type,
          completedDays,
          currentStreak: calculateStreak(allLogs, h.id),
          longestStreak: calculateLongestStreak(allLogs, h.id),
        };
      });

      const taskList = tasks
        .filter((t) => {
          // Include all open tasks + tasks completed in the last 14 days
          if (!t.completed) return true;
          return (
            t.completed_at &&
            differenceInDays(new Date(), new Date(t.completed_at)) <= 14
          );
        })
        .map((t) => ({
          title: t.title,
          priority: t.priority,
          completed: t.completed,
          due_date: t.due_date ?? null,
          daysOpen: !t.completed
            ? differenceInDays(new Date(), new Date(t.created_at))
            : 0,
        }))
        .slice(0, 30); // cap to keep prompt size reasonable

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ask-habits`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            question,
            habitStats,
            taskList,
            conversationHistory: get().messages.slice(0, -1), // exclude the message we just added
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        set({ error: data.error ?? "Something went wrong", loading: false });
        return;
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.answer,
      };
      set((state) => ({
        messages: [...state.messages, assistantMessage],
        loading: false,
      }));
    } catch (err) {
      console.error("[Chat] sendMessage error:", err);
      set({ error: "Network error — try again", loading: false });
    }
  },

  clearChat: () => set({ messages: [], error: null }),
}));
