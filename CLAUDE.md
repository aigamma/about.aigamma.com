# Claude Code Project Instructions

See `AGENTS.md` for attribution discipline and the commit/deploy workflow. This file documents the architectural facts a Claude Code session needs to know on top of those policies.

## What this site is

about.aigamma.com is a single hand-authored static `index.html` plus a chat function. The chatbot in the page calls `netlify/functions/chat.mjs`, which proxies to Anthropic and augments the system prompt with two blocks:

1. `[AIGAMMA.COM SITE INDEX]` - a copy of the canonical aigamma.com site index, loaded at module init via `readFileSync` from `data/aigamma-site-index.txt`. The bundle opt-in lives in `netlify.toml` under `[functions.chat] included_files`. Re-copy after any aigamma site-structure change so the open-ended about chatbot stays consistent with the per-page aigamma chatbots.
2. `[Retrieved context]` - chunks pulled by similarity match from the **shared aigamma.com Supabase corpus** (`public.rag_documents`, 384-dim gte-small embeddings, HNSW + tsvector fallback). The about page is one of the indexed sources in that corpus, surface-pinned to `about`, alongside every per-page aigamma prompt and the global navigation/persona/behavior blocks.

The chat function on this site is unrestricted; the per-page chatbots on aigamma.com are scoped. This is the only "general purpose" surface in the aigamma chat domain.

## Self-updating RAG corpus (no human in the loop)

The about page's prose is one source in the shared aigamma.com Supabase corpus. The corpus is refreshed by a GitHub Actions workflow that lives in the **`aigamma/aigamma.com`** repository, not this one:

- **Workflow file**: `aigamma.com/.github/workflows/refresh-rag.yml`.
- **Triggers**: schedule (`0 4 * * *`, 04:00 UTC daily), push to `main` of aigamma.com, manual workflow_dispatch.
- **Cross-repo handling**: the aigamma.com workflow checks out **this repo** (`aigamma/about.aigamma.com`) into a sibling directory and points the ingest walker at it via the `RAG_ABOUT_PATH` env var. The walker's source-allowlist entry for `about.aigamma.com/index.html` honors `process.env.RAG_ABOUT_PATH` before falling back to the local Windows path used in dev.

What this means for edits to **this repo**:

- `.github/workflows/trigger-rag-refresh.yml` in this repo fires on push to main (filtered to `paths: ['index.html']` so README or CI-config edits do not trigger an unnecessary ingest) and dispatches a `repository_dispatch` event of type `rag-refresh-requested` to `aigamma/aigamma.com`. The aigamma.com `refresh-rag.yml` workflow listens for that event and runs the same ingest pipeline it runs on a push or a cron tick. End-to-end staleness window for an index.html edit: **~3-5 minutes** (the time the aigamma.com workflow needs to checkout both repos, npm ci, walk the sources, and upsert any changed chunks).
- The cross-repo dispatch requires a **fine-grained Personal Access Token** stored as the `AIGAMMA_RAG_DISPATCH_TOKEN` secret in this repo. If the secret is missing or the PAT is expired, this workflow fails fast on the dispatch step and the aigamma.com daily cron at 04:00 UTC is the safety net (corpus is at worst 24h stale even in the broken-PAT case). PAT setup is a one-time operation: generate at https://github.com/settings/personal-access-tokens/new with **Resource owner** `aigamma`, **Repository access** `aigamma.com` only, **Repository permissions** Contents=Read + Actions=Write, then add the secret under Settings -> Secrets and variables -> Actions in this repo.
- **Manual override**: from the aigamma.com Actions tab, click "Refresh RAG corpus" -> Run workflow. Or `gh workflow run refresh-rag.yml --repo aigamma/aigamma.com`. Either trigger checks out the current `main` of this repo and re-ingests the latest prose immediately. Useful when the dispatch is broken (PAT issues) or when you want to refresh without an underlying about-page edit.

For the rationale and the full pipeline (Supabase Edge Functions, idempotency on `content_hash`, the gte-small batch-size constraint, the secrets contract), read the "Self-updating RAG (daily cron + push trigger)" section of `aigamma.com/CLAUDE.md`.

## Editing the about page

When the prose in `index.html` changes substantively (a new bio paragraph, an updated service description, a new section), nothing here needs ingest configuration; the next cron pass picks it up. If the edit is urgent (a typo a visitor is going to read aloud in a demo), trigger the aigamma.com workflow manually as above.

When the chat function logic (`netlify/functions/chat.mjs`) changes, the deploy is automatic (Netlify builds from `main`) but the RAG corpus is unaffected - the chat function itself is not an indexed source.

When the SITE INDEX copy (`data/aigamma-site-index.txt`) needs an update, copy the latest contents from `aigamma.com/src/data/site-index.txt`. The chat function loads this file at cold start; no ingest needed (it's a runtime read, not a RAG source).

## Repo and domain

- GitHub: `aigamma/about.aigamma.com` → Netlify project `aboutaigamma` → `about.aigamma.com`.
- Sister repo: `aigamma/aigamma.com` → Netlify project `aigamma` → `aigamma.com`. The RAG corpus is owned by that project; this one only consumes it via the chat function.
