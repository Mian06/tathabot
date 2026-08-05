export async function onRequest(context) {
  // Only accept POST requests
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = context.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return new Response('Server configuration error', { status: 500 });
  }

  // Parse the user’s JSON body (expects { query: string, lang?: 'ar'|'en' })
  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { query, lang = 'en' } = body;

  if (!query || typeof query !== 'string') {
    return new Response('Missing or invalid query', { status: 400 });
  }

  // --- FIX 1: Language-Aware System Prompt ---
  const getSystemPrompt = (language) => {
    if (language === 'ar') {
      return 'أنت مساعد بحث مفيد. قدم دائمًا معلومات دقيقة ومحدثة واستشهد بمصادرك. استخدم التنسيق [1]، [2]، إلخ مباشرة بعد المعلومات ذات الصلة للإشارة إلى المصادر المدرجة في النهاية. قم دائمًا بتضمين قسم "المصادر:" في النهاية مع عناوين URL المرقمة.';
    }
    return 'You are a helpful research assistant. Always provide accurate, up-to-date information and cite your sources. Use the format [1], [2], etc. immediately after the relevant information to refer to the sources listed at the end. Always include a "Sources:" section at the end with numbered URLs.';
  };

  const systemMessage = {
    role: 'system',
    content: getSystemPrompt(lang),
  };

  const userMessage = {
    role: 'user',
    content: query,
  };

  // --- FIX 2: Upgrade to Sonar Pro ---
  const perplexityReq = {
    model: 'sonar-pro',
    messages: [systemMessage, userMessage],
    temperature: 0,
    search_recency_filter: 'month',
    search_domain_filter: [
      'wikipedia.org',
      'arxiv.org',
      'github.com',
      'stackoverflow.com',
      'developer.mozilla.org',
    ],
    stream: true,
  };

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(perplexityReq),
    });

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
      status: response.status,
    });
  } catch (err) {
    return new Response('Error contacting Perplexity API', { status: 502 });
  }
}
