import { supabase } from "@/lib/supabase";
import { create } from "zustand";

export type Friend = {
  friendId: string;
  displayName: string;
  avatarUrl: string | null;
};

type FriendsStore = {
  friends: Friend[];
  loading: boolean;
  error: string | null;
  myInviteCode: string | null;
  generatingCode: boolean;
  redeeming: boolean;
  loadFriends: () => Promise<void>;
  generateInviteCode: () => Promise<string | null>;
  redeemInviteCode: (
    code: string,
  ) => Promise<{ success: boolean; error?: string; friendName?: string }>;
  removeFriend: (friendId: string) => Promise<void>;
};

function generateCode(): string {
  // No 0/O/1/I/L — avoids ambiguous characters when typed by hand
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 7; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const useFriendsStore = create<FriendsStore>((set, get) => ({
  friends: [],
  loading: false,
  error: null,
  myInviteCode: null,
  generatingCode: false,
  redeeming: false,

  loadFriends: async () => {
    set({ loading: true, error: null });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        set({ friends: [], loading: false });
        return;
      }

      const { data: friendshipRows, error: friendshipError } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user.id);

      if (friendshipError) throw friendshipError;

      const friendIds = (friendshipRows ?? []).map((r) => r.friend_id);

      if (friendIds.length === 0) {
        set({ friends: [], loading: false });
        return;
      }

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", friendIds);

      if (profileError) throw profileError;

      const friends: Friend[] = friendIds.map((id) => {
        const profile = profileRows?.find((p) => p.id === id);
        return {
          friendId: id,
          displayName: profile?.display_name ?? "DockDaily user",
          avatarUrl: profile?.avatar_url ?? null,
        };
      });

      set({ friends, loading: false });
    } catch (err: any) {
      console.error("[Friends] loadFriends error:", err);
      set({ error: err.message ?? "Failed to load friends", loading: false });
    }
  },

  generateInviteCode: async () => {
    set({ generatingCode: true, error: null });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const code = generateCode();

      const { error } = await supabase.from("invite_links").insert({
        code,
        created_by: user.id,
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });

      if (error) throw error;

      set({ myInviteCode: code, generatingCode: false });
      return code;
    } catch (err: any) {
      console.error("[Friends] generateInviteCode error:", err);
      set({
        error: err.message ?? "Failed to generate code",
        generatingCode: false,
      });
      return null;
    }
  },

  redeemInviteCode: async (codeInput) => {
    set({ redeeming: true, error: null });
    try {
      const code = codeInput.trim().toUpperCase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        set({ redeeming: false });
        return { success: false, error: "Not signed in" };
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/accept-invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ code }),
        },
      );

      const data = await response.json();
      set({ redeeming: false });

      if (!response.ok) {
        return { success: false, error: data.error ?? "Failed to redeem code" };
      }

      await get().loadFriends();
      return { success: true, friendName: data.friendName };
    } catch (err) {
      console.error("[Friends] redeemInviteCode error:", err);
      set({ redeeming: false });
      return { success: false, error: "Network error — try again" };
    }
  },

  removeFriend: async (friendId) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("friendships")
        .delete()
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`,
        );

      await get().loadFriends();
    } catch (err) {
      console.error("[Friends] removeFriend error:", err);
    }
  },
}));
