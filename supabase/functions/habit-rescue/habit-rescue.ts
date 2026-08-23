const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const GROQ_MODEL = Deno.env.get('GROQ_MODEL') ?? 'openai/gpt-oss-20b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

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
    // Safe destructuring with fallbacks to prevent crashes on missing payloads
    const { habitTitle = 'this habit', previousStreak = 0 } = await req.json();

    const prompt = `You are a warm, encouraging habit coach. A user's streak for the habit "${habitTitle}" just broke after ${previousStreak} days in a row.

Write ONE short, warm, non-judgmental sentence (maximum 25 words) that:
- Acknowledges the streak breaking without any guilt or shame
- Does not apologize on their behalf or use words like "sorry" or "failed"
- Gently invites them to start again today
- Feels genuinely supportive, not generic or robotic

Write only the message itself. No quotes, no extra text, no explanation.`;

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.8,
        max_tokens: 100,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Groq] Error:', err);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const groqData = await response.json();
    const message = groqData?.choices?.[0]?.message?.content?.trim() ?? '';

    if (!message) {
      throw new Error('Empty response from AI');
    }

    return new Response(JSON.stringify({ message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[habit-rescue] Error:', err);

    return new Response(JSON.stringify({
      error: 'Failed to generate rescue message',
      errorMessage: err.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});