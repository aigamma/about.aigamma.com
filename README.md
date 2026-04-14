# about.aigamma.com

Production consultancy and bio site for [AI Gamma LLC](https://aigamma.com), deployed at https://about.aigamma.com. The apex aigamma.com domain hosts the React quant dashboard; this subdomain hosts the founder bio, capabilities overview, and the streaming Claude chat demo. Built and maintained by Eric Allione.

## Architecture

Single static HTML file with one Netlify Function. No frameworks, no build system, no component libraries. The entire frontend is `index.html`. The entire backend is `netlify/functions/chat.mjs`.

## Features

**Streaming AI Chat Widget** with dual model tabs (Claude Sonnet 4.6 for quick analysis, Claude Opus 4.6 for deep analysis). Responses stream token-by-token via Server-Sent Events through a Netlify Function proxy to the Anthropic Messages API.

**Web Search** via Anthropic's built-in web search tool. The model autonomously decides when current information is needed and searches the web before generating its response.

**Multimodal Input** supporting image (JPEG, PNG, GIF, WebP) and PDF uploads. Files are base64-encoded client-side and sent through the Netlify Function to the Anthropic API for analysis.

**Custom System Prompt** engineered for precision over agreeability. No sycophancy, no filler, no calls to action. Paragraphs only. Declarative endings. Philosophy connections welcome. The prompt is a deliberate demonstration of AI operations methodology.

## Stack

- Frontend: Vanilla HTML, CSS, JavaScript
- Backend: Netlify Functions (serverless)
- AI: Anthropic Messages API (Claude Opus 4.6, Claude Sonnet 4.6)
- Fonts: DM Sans, JetBrains Mono, Instrument Serif
- Deployment: Netlify

## Deployment

The site deploys via Netlify Drop (drag-and-drop) or Netlify CLI:

```
netlify deploy --prod
```

The `ANTHROPIC_API_KEY` environment variable must be set in the Netlify dashboard under Project Configuration > Environment Variables.

## Contact

- Email: eric@aigamma.com
- Web: [aigamma.com](https://aigamma.com)
- LinkedIn: [linkedin.com/in/aigamma](https://www.linkedin.com/in/aigamma)
- Schedule a conversation: [Google Calendar](https://calendar.app.google/iR8J2gEs8mUMxEct6)