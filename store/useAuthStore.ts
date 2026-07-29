import { create } from "zustand";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";
import { useSyncStore } from "@/store/useSyncStore";
import type { Session, User } from "@supabase/supabase-js";

WebBrowser.maybeCompleteAuthSession();

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type AuthStore = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loadSession: () => Promise<void>;
  loadProfile: () => Promise<void>;
  updateProfile: (
    updates: Partial<Pick<Profile, "display_name">>,
  ) => Promise<void>;
  deleteAccount: () => Promise<{ error?: string }>;
};

// Keep a reference to the current auth subscription so we can
// unsubscribe before re-subscribing (prevents listener stacking
// on hot reloads or repeated loadSession calls).
let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,

  loadSession: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, loading: false });
    if (session?.user) await get().loadProfile();

    // Unsubscribe any existing listener before registering a new one
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) await get().loadProfile();
      else set({ profile: null });
    });

    authSubscription = subscription;
  },

  loadProfile: async () => {
    const user = get().user;
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) set({ profile: data as Profile });
  },

  signInWithGoogle: async () => {
    const redirectUri = makeRedirectUri({
      scheme: "dockdaily",
      path: "google-auth",
    });

    console.log("[Auth] Redirect URI:", redirectUri);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      console.error("[Auth] OAuth init error:", error);
      return;
    }

    // Pass redirectUri as the second param so the browser knows
    // when to close itself (when the URL starts with this prefix)
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

    console.log("[Auth] WebBrowser result type:", result.type);

    if (result.type !== "success" || !result.url) {
      console.log("[Auth] OAuth cancelled or failed");
      return;
    }

    // Don't use new URL() — it breaks on custom schemes like dockdaily://
    // Parse the hash fragment manually instead
    const rawUrl = result.url;
    let params: URLSearchParams;

    if (rawUrl.includes("#")) {
      // Supabase puts tokens in the hash: dockdaily://google-auth#access_token=...
      params = new URLSearchParams(rawUrl.split("#")[1]);
    } else if (rawUrl.includes("?")) {
      // Fallback: some flows use query params
      params = new URLSearchParams(rawUrl.split("?")[1]);
    } else {
      console.error("[Auth] No params found in callback URL:", rawUrl);
      return;
    }

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    console.log("[Auth] Got tokens:", !!access_token, !!refresh_token);

    if (access_token && refresh_token) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (sessionError) {
        console.error("[Auth] setSession error:", sessionError);
      }
    } else {
      console.error(
        "[Auth] Missing tokens — check Supabase redirect URL config",
      );
    }
  },

  signOut: async () => {
    await useSyncStore.getState().pushUnsynced();
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  updateProfile: async (updates) => {
    const user = get().user;
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();
    if (data) set({ profile: data as Profile });
  },

  deleteAccount: async () => {
    const session = get().session;
    if (!session) return { error: 'Not signed in' };

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error ?? 'Failed to delete account' };
      }

      // Clear local state after successful server deletion
      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null });
      return {};
    } catch (err) {
      console.error('[Auth] deleteAccount error:', err);
      return { error: 'Network error — try again' };
    }
  },
}));
