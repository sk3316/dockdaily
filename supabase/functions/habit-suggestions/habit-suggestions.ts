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

  // Default to empty arrays to prevent crashes if they are omitted in the test
  const { newHabit, existingHabits = [], openTasks = [] } = await req.json();

  const prompt = `You are a habit coach helping a user build better habits.

The user just added this new habit: "${newHabit.title}" (type: ${newHabit.type}, target: ${newHabit.target})

Their existing habits: ${existingHabits.length > 0 ? existingHabits.map((h: any) => h.title).join(', ') : 'none yet'}

Their current open tasks: ${openTasks.length > 0 ? openTasks.slice(0, 5).map((t: any) => t.title).join(', ') : 'none'}

Suggest 2 supporting habits and 2 setup tasks that would help them succeed with this new habit.
Do NOT duplicate any existing habits or tasks.
Keep suggestions short, specific, and actionable.

Respond ONLY with valid JSON in this exact format, no markdown, no explanation:
{
  "habits": [
    { "title": "habit title here", "type": "boolean", "target": 1, "reason": "one sentence why" },
    { "title": "habit title here", "type": "count", "target": 3, "reason": "one sentence why" }
  ],
  "tasks": [
    { "title": "task title here", "reason": "one sentence why" },
    { "title": "task title here", "reason": "one sentence why" }
  ],
  "insight": "one sentence of habit science relevant to this habit"
}`;

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.4,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
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
  const rawText = groqData?.choices?.[0]?.message?.content ?? '';

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const clean = jsonMatch ? jsonMatch[0] : rawText;

    if (!clean) {
      throw new Error("Empty response from AI");
    }

    const parsed = JSON.parse(clean);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[Groq] Parse error, raw:', rawText, 'Data:', groqData);

    return new Response(JSON.stringify({
      error: 'Failed to parse AI response',
      errorMessage: err.message,
      groqData: groqData,
      rawText: rawText
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});