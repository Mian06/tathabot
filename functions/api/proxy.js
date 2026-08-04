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
  let query;
  try {
    const body = await context.request.json();
    query = body.query;
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!query || typeof query !== 'string') {
    return new Response('Missing or invalid query', { status: 400 });
  }

  // System prompt that defines role + citation rules
  const systemMessage = {
    role: 'system',
    content:
      'You are a helpful research assistant. Always provide accurate, up-to-date information and cite your sources. Use the format [1], [2], etc. immediately after the relevant information to refer to the sources listed at the end. Always include a "Sources:" section at the end with numbered URLs.',
  };

  const userMessage = {
    role: 'user',
    content: query,
  };

  // Build the request to Perplexity Sonar
  const perplexityReq = {
    model: 'sonar',
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
    // Forward the request to Perplexity
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(perplexityReq),
    });

    // Stream the response back to the client as Server-Sent Events
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        // CORS headers (not required for same-origin, but safe to add)
        'Access-Control-Allow-Origin': '*',
      },
      status: response.status,
    });
  } catch (err) {
    return new Response('Error contacting Perplexity API', { status: 502 });
  }
}