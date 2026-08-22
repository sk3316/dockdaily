import { supabase } from "@/lib/supabase";
import { getLocalDateString } from "@/utils/streak";
import { create } from "zustand";

export type ChallengeParticipant = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  habitId: string | null;
  status: "invited" | "accepted" | "declined" | "left";
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
};

export type TimelineEntry = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  date: string;
  createdAt: string;
  proofPhotoUrl: string | null;
  verifiedCount: number;
  flaggedCount: number;
  myReaction: 'verified' | 'flagged' | null;
};

export type Challenge = {
  id: string;
  title: string;
  mode: "formal" | "informal";
  startDate: string;
  endDate: string | null;
  status: "active" | "completed" | "cancelled";
  requiresProof: boolean;
  createdBy: string;
  winnerUserId: string | null;
  participants: ChallengeParticipant[];
};

type ChallengeStore = {
  challenges: Challenge[];
  loading: boolean;
  error: string | null;
  matchSuggestion: { habitId: string | null; reason: string } | null;
  matching: boolean;
  loadChallenges: () => Promise<void>;
  createChallenge: (params: {
    title: string;
    mode: "formal" | "informal";
    endDate: string | null;
    requiresProof: boolean;
    myHabitId: string;
    friendIds: string[];
  }) => Promise<{ success: boolean; error?: string }>;
  acceptChallenge: (challengeId: string, habitId: string) => Promise<void>;
  declineChallenge: (challengeId: string) => Promise<void>;
  leaveChallenge: (challengeId: string) => Promise<void>;
  submitCheckin: (
    challengeId: string,
    proofPhotoUrl?: string | null,
  ) => Promise<{ success: boolean; error?: string }>;
  hasCheckedInToday: (challengeId: string) => Promise<boolean>;
  timeline: TimelineEntry[];
  timelineLoading: boolean;
  loadTimeline: (challengeId: string) => Promise<void>;
  reactToCheckin: (checkinId: string, challengeId: string, reaction: 'verified' | 'flagged') => Promise<void>;
  suggestHabitMatch: (
    challengeTitle: string,
    myHabits: { id: string; title: string }[],
  ) => Promise<void>;
  clearMatchSuggestion: () => void;
};

export const useChallengeStore = create<ChallengeStore>((set, get) => ({
  challenges: [],
  loading: false,
  error: null,
  matchSuggestion: null,
  matching: false,
  timeline: [],
  timelineLoading: false,

  loadChallenges: async () => {
    set({ loading: true, error: null });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        set({ challenges: [], loading: false });
        return;
      }

      const { data: myRows, error: myRowsError } = await supabase
        .from("challenge_participants")
        .select("challenge_id")
        .eq("user_id", user.id);

      if (myRowsError) throw myRowsError;

      const challengeIds = [
        ...new Set((myRows ?? []).map((r) => r.challenge_id)),
      ];
      if (challengeIds.length === 0) {
        set({ challenges: [], loading: false });
        return;
      }

      const { data: challengeRows, error: challengeError } = await supabase
        .from("challenges")
        .select("*")
        .in("id", challengeIds)
        .order("created_at", { ascending: false });

      if (challengeError) throw challengeError;

      const { data: participantRows, error: participantError } = await supabase
        .from("challenge_participants")
        .select("*")
        .in("challenge_id", challengeIds);

      if (participantError) throw participantError;

      const userIds = [
        ...new Set((participantRows ?? []).map((p) => p.user_id)),
      ];
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      const challenges: Challenge[] = (challengeRows ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        mode: c.mode,
        startDate: c.start_date,
        endDate: c.end_date,
        status: c.status,
        requiresProof: c.requires_proof,
        createdBy: c.created_by,
        winnerUserId: c.winner_user_id,
        participants: (participantRows ?? [])
          .filter((p) => p.challenge_id === c.id)
          .map((p) => {
            const profile = profileRows?.find((pr) => pr.id === p.user_id);
            return {
              userId: p.user_id,
              displayName: profile?.display_name ?? "DockDaily user",
              avatarUrl: profile?.avatar_url ?? null,
              habitId: p.habit_id,
              status: p.status,
              currentStreak: p.current_streak,
              bestStreak: p.best_streak,
              totalCompletions: p.total_completions,
            };
          }),
      }));

      set({ challenges, loading: false });
    } catch (err: any) {
      console.error("[Challenge] loadChallenges error:", err);
      set({
        error: err.message ?? "Failed to load challenges",
        loading: false,
      });
    }
  },

  createChallenge: async ({
    title,
    mode,
    endDate,
    requiresProof,
    myHabitId,
    friendIds,
  }) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not signed in" };

      const { data: challenge, error: challengeError } = await supabase
        .from("challenges")
        .insert({
          created_by: user.id,
          title,
          mode,
          start_date: getLocalDateString(),
          end_date: mode === "formal" ? endDate : null,
          requires_proof: requiresProof,
        })
        .select()
        .single();

      if (challengeError || !challenge) {
        return {
          success: false,
          error: challengeError?.message ?? "Failed to create challenge",
        };
      }

      const participantRows = [
        {
          challenge_id: challenge.id,
          user_id: user.id,
          habit_id: myHabitId,
          status: "accepted",
        },
        ...friendIds.map((friendId) => ({
          challenge_id: challenge.id,
          user_id: friendId,
          habit_id: null,
          status: "invited",
        })),
      ];

      const { error: participantsError } = await supabase
        .from("challenge_participants")
        .insert(participantRows);

      if (participantsError) {
        return { success: false, error: participantsError.message };
      }

      // Notify invited friends
      if (friendIds.length > 0) {
        const { sendPush } = await import("@/utils/pushNotify");
        void sendPush(
          friendIds,
          "🏆 New challenge!",
          `You've been invited to "${title}"`,
          { type: "invite", challengeId: challenge.id },
        );
      }

      await get().loadChallenges();
      return { success: true };
    } catch (err: any) {
      console.error("[Challenge] createChallenge error:", err);
      return { success: false, error: "Network error — try again" };
    }
  },

  acceptChallenge: async (challengeId, habitId) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("challenge_participants")
        .update({ status: "accepted", habit_id: habitId })
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id);

      await get().loadChallenges();
    } catch (err) {
      console.error("[Challenge] acceptChallenge error:", err);
    }
  },

  declineChallenge: async (challengeId) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("challenge_participants")
        .update({ status: "declined" })
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id);

      await get().loadChallenges();
    } catch (err) {
      console.error("[Challenge] declineChallenge error:", err);
    }
  },

  leaveChallenge: async (challengeId) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("challenge_participants")
        .delete()
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id);

      await get().loadChallenges();
    } catch (err) {
      console.error("[Challenge] leaveChallenge error:", err);
    }
  },

  submitCheckin: async (challengeId, proofPhotoUrl = null) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not signed in" };

      const today = getLocalDateString();

      const { error: insertError } = await supabase
        .from("challenge_checkins")
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          date: today,
          completed: true,
          proof_photo_url: proofPhotoUrl,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          return { success: false, error: "You've already checked in today" };
        }
        return { success: false, error: insertError.message };
      }

      // Recompute and push this participant's own summary numbers.
      // Streak = consecutive days ending today; total = all-time count.
      const { data: allCheckins } = await supabase
        .from("challenge_checkins")
        .select("date")
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      const dates = (allCheckins ?? []).map((c) => c.date);
      let streak = 0;
      let cursor = new Date();
      for (const d of dates) {
        const cursorStr = getLocalDateString(cursor);
        if (d === cursorStr) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }

      const { data: currentRow } = await supabase
        .from("challenge_participants")
        .select("best_streak")
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id)
        .single();

      const bestStreak = Math.max(streak, currentRow?.best_streak ?? 0);

      // Detect anyone we just passed in total completions (fire BEFORE we update
      // our own row so we can compare against the previous state).
      const myNewTotal = dates.length;
      const { data: othersBeforeUpdate } = await supabase
        .from("challenge_participants")
        .select("user_id, total_completions")
        .eq("challenge_id", challengeId)
        .eq("status", "accepted")
        .neq("user_id", user.id);

      const justPassed = (othersBeforeUpdate ?? []).filter(
        (o) => o.total_completions >= myNewTotal - 1 && o.total_completions < myNewTotal,
      );

      await supabase
        .from("challenge_participants")
        .update({
          current_streak: streak,
          best_streak: bestStreak,
          total_completions: dates.length,
          last_synced_at: new Date().toISOString(),
        })
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id);

      if (justPassed.length > 0) {
        const passedTitle =
          get().challenges.find((c) => c.id === challengeId)?.title ?? "Challenge";
        const { sendPush } = await import("@/utils/pushNotify");
        void sendPush(
          justPassed.map((p) => p.user_id),
          passedTitle,
          "You've just been passed! Time to catch up 😤",
          { type: "passed", challengeId },
        );
      }

      await get().loadChallenges();

      // Notify other accepted participants about the new check-in
      const thisChallenge = get().challenges.find((c) => c.id === challengeId);
      if (thisChallenge) {
        const otherUserIds = thisChallenge.participants
          .filter((p) => p.status === "accepted" && p.userId !== user.id)
          .map((p) => p.userId);
        if (otherUserIds.length > 0) {
          const { sendPush } = await import("@/utils/pushNotify");
          void sendPush(
            otherUserIds,
            `${thisChallenge.title}`,
            "Someone just checked in 🔥",
            { type: "activity", challengeId },
          );
        }
      }

      // Sync completion back to the linked local habit, if any
      const updated = get().challenges.find((c) => c.id === challengeId);
      const myParticipant = updated?.participants.find((p) => p.userId === user.id);
      if (myParticipant?.habitId) {
        const { syncChallengeToHabit } = await import('./challengeSync');
        syncChallengeToHabit(myParticipant.habitId).catch((err) =>
          console.error('[Challenge] habit sync error:', err)
        );
      }

      return { success: true };
    } catch (err: any) {
      console.error("[Challenge] submitCheckin error:", err);
      return { success: false, error: "Network error — try again" };
    }
  },

  loadTimeline: async (challengeId) => {
    set({ timelineLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: checkins, error } = await supabase
        .from('challenge_checkins')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = [...new Set((checkins ?? []).map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const checkinIds = (checkins ?? []).map((c) => c.id);
      const { data: reactions } = checkinIds.length
        ? await supabase.from('checkin_reactions').select('*').in('checkin_id', checkinIds)
        : { data: [] };

      const timeline: TimelineEntry[] = (checkins ?? []).map((c) => {
        const profile = profiles?.find((p) => p.id === c.user_id);
        const checkinReactions = (reactions ?? []).filter((r) => r.checkin_id === c.id);
        return {
          id: c.id,
          userId: c.user_id,
          displayName: profile?.display_name ?? 'DockDaily user',
          avatarUrl: profile?.avatar_url ?? null,
          date: c.date,
          createdAt: c.created_at,
          proofPhotoUrl: c.proof_photo_url,
          verifiedCount: checkinReactions.filter((r) => r.reaction === 'verified').length,
          flaggedCount: checkinReactions.filter((r) => r.reaction === 'flagged').length,
          myReaction: checkinReactions.find((r) => r.user_id === user?.id)?.reaction ?? null,
        };
      });

      set({ timeline, timelineLoading: false });
    } catch (err) {
      console.error('[Challenge] loadTimeline error:', err);
      set({ timelineLoading: false });
    }
  },

  reactToCheckin: async (checkinId, challengeId, reaction) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('checkin_reactions').upsert(
        { checkin_id: checkinId, user_id: user.id, reaction },
        { onConflict: 'checkin_id,user_id' }
      );

      await get().loadTimeline(challengeId);
    } catch (err) {
      console.error('[Challenge] reactToCheckin error:', err);
    }
  },

  hasCheckedInToday: async (challengeId) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from("challenge_checkins")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id)
      .eq("date", getLocalDateString())
      .maybeSingle();

    return !!data;
  },

  suggestHabitMatch: async (challengeTitle, myHabits) => {
    set({ matching: true, matchSuggestion: null });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/match-habit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ challengeTitle, myHabits }),
        },
      );

      const data = await response.json();
      if (response.ok) {
        set({
          matchSuggestion: {
            habitId: data.suggestedHabitId,
            reason: data.reason,
          },
          matching: false,
        });
      } else {
        set({ matching: false });
      }
    } catch (err) {
      console.error("[Challenge] suggestHabitMatch error:", err);
      set({ matching: false });
    }
  },

  clearMatchSuggestion: () => set({ matchSuggestion: null }),
}));
