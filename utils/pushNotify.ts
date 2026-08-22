import { supabase } from "@/lib/supabase";

export async function sendPush(
  userIds: string[],
  title: string,
  body: string,
  data: Record<string, any> = {},
) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-push`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userIds, title, body, data }),
      },
    );
  } catch (err) {
    console.error("[pushNotify] Failed to send:", err);
  }
}
