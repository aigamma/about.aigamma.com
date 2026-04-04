// AI Gamma Chat — Netlify Function (Streaming Proxy with Tool Execution)
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

const TOOLS = [
  {
    type: 'web_search_20250305',
    name: 'web_search'
  },
  {
    name: 'web_fetch',
    description: 'Fetch and read the text content of a web page at a specific URL. Use this when someone provides a URL and asks you to read, analyze, or summarize its contents. Do not use this for general information gathering; use web_search for that instead.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The full URL to fetch, including the protocol (https://)'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'generate_image',
    description: 'Generate an image based on a text description. Use this when the user asks you to create, draw, generate, make, design, or visualize an image, picture, illustration, graphic, or visual. Write a detailed, specific prompt that will produce a high-quality image.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'A detailed description of the image to generate. Be specific about composition, style, colors, lighting, perspective, and subject details.'
        }
      },
      required: ['prompt']
    }
  }
];

const MAX_TOOL_ROUNDS = 5;

async function fetchUrl(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIGammaBot/1.0; +https://aigamma.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      return 'Failed to fetch URL: HTTP ' + res.status + ' ' + res.statusText;
    }

    const contentType = res.headers.get('content-type') || '';
    const isText = contentType.includes('text/') ||
                   contentType.includes('application/json') ||
                   contentType.includes('application/xml') ||
                   contentType.includes('application/javascript');

    if (!isText) {
      return 'Cannot read this content: the URL returned ' + contentType + ', which is not a text format.';
    }

    let text = await res.text();

    if (contentType.includes('text/html')) {
      text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
      text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
      text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
      text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
      text = text.replace(/<[^>]+>/g, ' ');
      text = text.replace(/&nbsp;/g, ' ');
      text = text.replace(/&amp;/g, '&');
      text = text.replace(/&lt;/g, '<');
      text = text.replace(/&gt;/g, '>');
      text = text.replace(/&#\d+;/g, '');
      text = text.replace(/\s+/g, ' ');
      text = text.trim();
    }

    if (text.length > 50000) {
      text = text.substring(0, 50000) + '\n\n[Content truncated at 50,000 characters]';
    }

    return text || 'The page returned no readable text content.';
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      return 'Failed to fetch URL: the request timed out after 10 seconds.';
    }
    return 'Failed to fetch URL: ' + e.message;
  }
}

async function executeTools(toolUseBlocks, sendEvent) {
  const results = [];
  for (const block of toolUseBlocks) {
    if (block.name === 'web_fetch') {
      const content = await fetchUrl(block.input.url);
      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: content
      });
    } else if (block.name === 'generate_image') {
      if (sendEvent) {
        sendEvent({ type: 'image_status', text: 'Generating image...' });
        sendEvent({ type: 'image_prompt', prompt: block.input.prompt });
      }
      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: 'The image was generated successfully and is now visible to the user below your text. Do not include any markdown image syntax, image links, or references to the image file. Simply describe in one or two sentences what the image depicts based on the prompt you wrote.'
      });
    }
  }
  return results;
}

export default async (req) => {
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

  const initialMessages = [
    ...(Array.isArray(history) ? history : []),
    { role: 'user', content: userContent }
  ];

  // Create a streaming response with a tool execution loop.
  // The function reads the Anthropic SSE stream, forwards text events
  // to the browser, and intercepts tool_use events for server-side execution.
  // After executing tools, it makes a follow-up API call and continues streaming.
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      async function callAnthropicStreaming(apiMessages, round) {
        if (round > MAX_TOOL_ROUNDS) {
          controller.enqueue(encoder.encode(
            'data: ' + JSON.stringify({
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: '\n\n[Tool execution limit reached]' }
            }) + '\n\n'
          ));
          return;
        }

        let anthropicRes;
        try {
          anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
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
              messages: apiMessages,
              stream: true,
              tools: TOOLS
            })
          });
        } catch (err) {
          controller.enqueue(encoder.encode(
            'data: ' + JSON.stringify({
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: 'The AI is temporarily unavailable. Please try again in a moment, or reach Eric directly at eric@aigamma.com.' }
            }) + '\n\n'
          ));
          return;
        }

        if (!anthropicRes.ok) {
          const status = anthropicRes.status;
          let errMsg = 'The AI is temporarily unavailable. Please try again in a moment, or reach Eric directly at eric@aigamma.com.';
          if (status === 429) errMsg = 'The AI is experiencing high demand. Please wait a moment and try again.';
          if (status === 529) errMsg = 'The AI is temporarily at capacity. Please try again in a few minutes.';
          controller.enqueue(encoder.encode(
            'data: ' + JSON.stringify({
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: errMsg }
            }) + '\n\n'
          ));
          return;
        }

        const reader = anthropicRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantContent = [];
        let currentTextContent = '';
        let currentToolUse = null;
        let stopReason = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Forward raw SSE bytes to the browser.
          // The browser only parses content_block_delta with text_delta
          // and ignores everything else (tool_use events, message events, etc).
          controller.enqueue(value);

          // Simultaneously parse the stream to detect tool use
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);

              if (event.type === 'content_block_start') {
                if (event.content_block.type === 'text') {
                  currentTextContent = '';
                } else if (event.content_block.type === 'tool_use') {
                  currentToolUse = {
                    id: event.content_block.id,
                    name: event.content_block.name,
                    inputJson: ''
                  };
                }
              }

              if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                  currentTextContent += event.delta.text;
                } else if (event.delta.type === 'input_json_delta') {
                  if (currentToolUse) {
                    currentToolUse.inputJson += event.delta.partial_json;
                  }
                }
              }

              if (event.type === 'content_block_stop') {
                if (currentToolUse) {
                  let parsedInput = {};
                  try { parsedInput = JSON.parse(currentToolUse.inputJson); } catch (e) {}
                  assistantContent.push({
                    type: 'tool_use',
                    id: currentToolUse.id,
                    name: currentToolUse.name,
                    input: parsedInput
                  });
                  currentToolUse = null;
                } else if (currentTextContent) {
                  assistantContent.push({
                    type: 'text',
                    text: currentTextContent
                  });
                  currentTextContent = '';
                }
              }

              if (event.type === 'message_delta') {
                if (event.delta && event.delta.stop_reason) {
                  stopReason = event.delta.stop_reason;
                }
              }
            } catch (e) {}
          }
        }

        // If the model invoked custom tools, execute them and continue
        if (stopReason === 'tool_use') {
          const customToolBlocks = assistantContent.filter(
            b => b.type === 'tool_use' && b.name !== 'web_search'
          );

          if (customToolBlocks.length > 0) {
            const sendEvent = (eventData) => {
              controller.enqueue(encoder.encode(
                'data: ' + JSON.stringify(eventData) + '\n\n'
              ));
            };

            const toolResults = await executeTools(customToolBlocks, sendEvent);

            const newMessages = [
              ...apiMessages,
              { role: 'assistant', content: assistantContent },
              { role: 'user', content: toolResults }
            ];

            await callAnthropicStreaming(newMessages, round + 1);
          }
        }
      }

      try {
        await callAnthropicStreaming(initialMessages, 1);
      } catch (err) {
        try {
          controller.enqueue(encoder.encode(
            'data: ' + JSON.stringify({
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: 'An unexpected error occurred. Please try again.' }
            }) + '\n\n'
          ));
        } catch (e) {}
      } finally {
        try { controller.close(); } catch (e) {}
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
};

export const config = {
  path: '/api/chat',
  method: ['POST', 'OPTIONS']
};
