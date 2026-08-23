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
    const { habitStats = [], taskStats = {} } = await req.json();

    // Format habit data safely
    const habitSummary = habitStats.length > 0
      ? habitStats.map((h: any) =>
          `- "${h.title ?? 'Untitled'}" (${h.type ?? 'boolean'}): completed ${h.completedDays ?? 0}/14 days, current streak: ${h.currentStreak ?? 0}, longest streak: ${h.longestStreak ?? 0}`
        ).join('\n')
      : 'No habit data recorded for the past 14 days.';

    // Format task data safely
    const completedTasks = taskStats.completedLast14Days ?? 0;
    const openTasks = taskStats.currentlyOpen ?? 0;
    const oldestOpenDays = taskStats.oldestOpenTaskDays ?? 0;

    const taskSummary = [
      `- ${completedTasks} tasks completed in the last 14 days`,
      `- ${openTasks} tasks currently open`,
      oldestOpenDays > 0
        ? `- Oldest open task has been sitting for ${oldestOpenDays} days`
        : '- No old open tasks',
    ].join('\n');

    const prompt = `You are a supportive habit coach analyzing a user's last 14 days of activity.

HABIT DATA:
${habitSummary}

TASK DATA:
${taskSummary}

Write a short, warm, personalized insight (3-4 sentences max) that:
1. Highlights what's working well (be specific, use their habit names)
2. Gently points out one area that could improve (if any — skip if everything is going great)
3. Gives one concrete, actionable suggestion

Keep it conversational, encouraging, and specific to their actual data. Do not use generic advice. Do not use markdown formatting. Write in plain prose only.`;

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.7,
        max_tokens: 500,
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
    const insight = groqData?.choices?.[0]?.message?.content?.trim() ?? '';

    if (!insight) {
      throw new Error('Empty response from AI');
    }

    return new Response(JSON.stringify({ insight }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[weekly-insights] Error:', err);

    return new Response(JSON.stringify({
      error: 'Failed to generate weekly insight',
      errorMessage: err.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});