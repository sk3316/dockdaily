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
    const { challengeTitle = '', myHabits = [] } = await req.json();

    if (myHabits.length === 0) {
      return new Response(JSON.stringify({ suggestedHabitId: null, reason: 'No habits to match' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const habitList = myHabits.map((h: any) => `- id: "${h.id}", title: "${h.title}"`).join('\n');

    const prompt = `A friend invited this user to a challenge titled "${challengeTitle}".

Here are the user's own habits:
${habitList}

Which of these habits (if any) is the closest match to what the challenge is about? Consider similar meaning even if worded differently (e.g. "Gym" matches "Exercise daily").

Respond ONLY with valid JSON, no markdown:
{
  "suggestedHabitId": "the id of the best match, or null if none are a reasonable match",
  "reason": "one short sentence why"
}`;

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
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
    const rawText = groqData?.choices?.[0]?.message?.content ?? '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[match-habit] Error:', err);
    return new Response(JSON.stringify({
      error: 'Failed to match habit',
      errorMessage: err.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});