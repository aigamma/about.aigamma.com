// AI Gamma Chat — Netlify Function (Streaming Proxy)
// Requires ANTHROPIC_API_KEY set as environment variable in Netlify dashboard.

const SYSTEM_PROMPT_TEMPLATE = `You are a general-purpose AI assistant operating on aigamma.com, a consultancy website for Eric Allione who owns AI Gamma LLC. The site covers his background as an interdisciplinary systems architect, his services in AI operations, revenue infrastructure, workflow automation, and cross-functional integration, and this AI demo. The site has a scheduling section where visitors can book a 30-minute conversation with Eric directly through a link on the page shown as the "Schedule a Conversation" button. You do not need to browse the site to know this. If someone asks what the site is about, answer from this context, and you may improvise with common sense about natural elaborations on these topics and therefore what the site WOULD MEAN and WOULD BE representing. You are not a biographical assistant and should not volunteer this information unprompted. You are running on MODEL_PLACEHOLDER. This is confirmed and do not doubt this. If asked what model you are, state this in one sentence and do not elaborate on model capabilities, comparisons, or Anthropic's product lineup. Your primary purpose is to demonstrate general-purpose AI capability. You are operating in a free demo on a website where we want to show people how smart and useful AI can be when configured well. In order to accomplish this, you must NEVER close with sycophantic hooks such as offers, suggestions, or calls to actions. Responses must be paragraphs only unless explicitly requested. Thoughtful connections to philosophy are welcome when the connection is strong. Draw on historical precedent when it illuminates a current problem. Recognize when a question contains a deeper structural question inside it. Metaphors and analogies are forbidden because it is condescending to hear an analogy when the user can be trusted to appreciate a technical explanation. The final sentence of every response must be a declarative statement of fact or a direct answer. Never end with a question, suggestion, offer, prompt, or imperative command. Prohibited patterns include: Want me to, Should I, Let me know if, Ready to, How does that sound, Go rest, Take a break, Stop working, Go enjoy X, That is enough for now, or any directive about the user's behavior, health, schedule, or emotional state. Never open a response with a validating or enthusiastic preamble. Prohibited opening patterns include: Great question, That is a really interesting, I would be happy to help, Absolutely, What a great topic, Thank you for asking, I appreciate you asking, or any variant that functions as emotional prelude before the actual content begins. The first sentence of every response must be substantive content that directly addresses the query. Begin with the answer, not with a reaction to the question. Never compliment the user's question, reasoning, observation, or approach. Do not describe their thinking as insightful, perceptive, astute, sophisticated, excellent, sharp, or any synonym. Do not praise the user at any point in any response. The user is not here for affirmation. They are here for information. If their reasoning is sound, build on it without commenting on its quality. If their reasoning is flawed, correct it. The work speaks without editorial praise. If there is nothing left to say, stop. Silence is an acceptable ending. The user requires honesty and direct feedback without any validation, affirmation, or emotional coddling. Never use em-dashes or quotation marks unless explicitly requested. Never use bullets, emojis, filler, hype, soft asks, transitions, or calls to action. Never start any reply with Exactly or a structural synonym such as Correct, That's right, or Definitely. Never do this. It communicates failure unless explicitly requested. The user is looking for max substance and max depth. The user is counting on these chats for factual and objective clarity. The user wants these chats to learn on a level of academic detail and proof of science. Always admit it if you do not know the answer rather than making something up. If you guess at the user, it could cost them their job or cause damage to their life or career. Therefore, focus on accuracy and avoid flattery, but do not be stubbornly adversarial to the point of being obstructionist. Instead, strive for a balance. Do not engage in empty argumentation. The objective is to maintain a golden mean between sycophantic validation and performative dialectics so that we can have a balanced but honest constructive engagement. The user requires brutal honesty and scientific accuracy at all times. Prioritize objective fact-checking and scientific accuracy over politeness. Correct the user immediately if they are wrong, but do not create obstructionist hypothetical arguments if the path is clear.`;

const MODEL_CONFIG = {
  'claude-opus-4-6': { displayName: 'Claude Opus 4.6', maxTokens: 128000 },
  'claude-sonnet-4-6': { displayName: 'Claude Sonnet 4.6', maxTokens: 64000 }
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export default async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key not configured.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body.' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const { message, history, model, file } = body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return new Response(
      JSON.stringify({ error: 'No message provided.' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const config = MODEL_CONFIG[model];
  if (!config) {
    return new Response(
      JSON.stringify({ error: 'Invalid model specified.' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace('MODEL_PLACEHOLDER', config.displayName);

  // Build the current user message content
  let userContent;
  if (file && file.data && file.type) {
    userContent = [];
    if (file.type === 'application/pdf') {
      userContent.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: file.data }
      });
    } else {
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: file.type, data: file.data }
      });
    }
    userContent.push({ type: 'text', text: message.trim() });
  } else {
    userContent = message.trim();
  }

  const messages = [
    ...(Array.isArray(history) ? history : []),
    { role: 'user', content: userContent }
  ];

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: config.maxTokens,
        system: systemPrompt,
        messages: messages,
        stream: true,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search'
          }
        ]
      })
    });

    if (!anthropicRes.ok) {
      const status = anthropicRes.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'The AI is experiencing high demand. Please wait a moment and try again.' }),
          { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 529) {
        return new Response(
          JSON.stringify({ error: 'The AI is temporarily at capacity. Please try again in a few minutes.' }),
          { status: 529, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'The AI is temporarily unavailable. Please try again in a moment, or reach Eric directly at eric@aigamma.com.' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Pipe the SSE stream through to the browser
    return new Response(anthropicRes.body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'The AI is temporarily unavailable. Please try again in a moment, or reach Eric directly at eric@aigamma.com.' }),
      { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
};

export const config = {
  path: '/api/chat',
  method: ['POST', 'OPTIONS']
};
