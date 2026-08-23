import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { code = '' } = await req.json();
    const cleanCode = String(code).trim().toUpperCase();

    if (!cleanCode) {
      return new Response(JSON.stringify({ error: 'Invite code is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: invite, error: inviteError } = await adminClient
      .from('invite_links')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: 'Invalid invite code' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'This invite code has expired' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
      return new Response(JSON.stringify({ error: 'This invite code has already been used' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (invite.created_by === user.id) {
      return new Response(JSON.stringify({ error: "You can't use your own invite code" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: existing } = await adminClient
      .from('friendships')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', invite.created_by)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: 'You are already friends with this person' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error: insertError } = await adminClient.from('friendships').insert([
      { user_id: user.id, friend_id: invite.created_by },
      { user_id: invite.created_by, friend_id: user.id },
    ]);

    if (insertError) {
      console.error('[accept-invite] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create friendship' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await adminClient
      .from('invite_links')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id);

    const { data: inviterProfile } = await adminClient
      .from('profiles')
      .select('display_name')
      .eq('id', invite.created_by)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        friendName: inviterProfile?.display_name ?? 'your new friend',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[accept-invite] Error:', err);
    return new Response(JSON.stringify({ error: 'Server error', errorMessage: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});