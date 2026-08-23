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
    const {
      question = '',
      habitStats = [],
      taskList = [],
      conversationHistory = [],
    } = await req.json();

    if (!question.trim()) {
      return new Response(JSON.stringify({ error: 'Question is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const habitSummary = habitStats.length > 0
      ? habitStats.map((h: any) =>
          `- "${h.title ?? 'Untitled'}" (${h.type ?? 'boolean'}): completed ${h.completedDays ?? 0}/14 days, current streak: ${h.currentStreak ?? 0}, longest streak: ${h.longestStreak ?? 0}`
        ).join('\n')
      : 'No habits tracked yet.';

    const openTasks = taskList.filter((t: any) => !t.completed);
    const completedTasks = taskList.filter((t: any) => t.completed);

    const openTaskSummary = openTasks.length > 0
      ? openTasks.map((t: any) =>
          `- "${t.title}" (priority: ${t.priority ?? 'medium'}, open for ${t.daysOpen ?? 0} days${t.due_date ? `, due ${t.due_date}` : ''})`
        ).join('\n')
      : 'No open tasks.';

    const recentCompletedSummary = completedTasks.length > 0
      ? `${completedTasks.length} tasks completed recently, including: ${completedTasks.slice(0, 5).map((t: any) => `"${t.title}"`).join(', ')}`
      : 'No tasks completed recently.';

    const systemContext = `You are a helpful assistant embedded in a habit tracking app called DockDaily. You answer questions about the user's ACTUAL habits and tasks using ONLY the data provided below — you know the real titles of their tasks and habits, not just counts.

You can:
- Reference specific tasks and habits by name
- Give advice on how to tackle a specific open task (breaking it down, prioritizing it, suggesting when to do it)
- Suggest NEW related tasks or habits that would help them make progress (e.g., if they have an open task "Buy running shoes" and no exercise habit, suggest adding one)
- Point out patterns (e.g., overdue tasks, habits that support or conflict with each other)

Be conversational, specific, and concise (2-5 sentences typically, use short lists only if genuinely helpful). If the data doesn't have enough information to answer confidently, say so honestly rather than guessing. Do not use markdown formatting — plain prose only, but you may use simple dashes for a short list if needed.

HABIT DATA (last 14 days):
${habitSummary}

OPEN TASKS:
${openTaskSummary}

RECENTLY COMPLETED:
${recentCompletedSummary}`;

    const messages = [
      { role: 'system', content: systemContext },
      ...conversationHistory.slice(-6).map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: question },
    ];

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.6,
        max_tokens: 2048,
        messages,
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
    const answer = groqData?.choices?.[0]?.message?.content?.trim() ?? '';

    if (!answer) {
      throw new Error('Empty response from AI');
    }

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[ask-habits] Error:', err);

    return new Response(JSON.stringify({
      error: 'Failed to generate answer',
      errorMessage: err.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});