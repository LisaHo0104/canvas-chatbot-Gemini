## Overview
- When “Enable Web Search” is on, answers are grounded in real web pages and always include link citations. No speculative content is allowed.
- If the user pastes a URL (e.g. `https://ai-sdk.dev/docs/ai-sdk-core/embeddings`), the assistant fetches and reads that page before answering.

## Server Changes (API)
- Read `webSearch` from the request body in `src/app/api/chat/route.ts`.
- When `webSearch` is true, extend the `tools` used by `streamText` to include web tools alongside existing Canvas tools.
- Strengthen the system prompt for web-search mode: require sources to be cited as clickable links, forbid unsupported claims, and limit information to fetched content.

## Web Tools
- Add `src/lib/web-tools.ts` providing two tools:
  1. `search_web(query: string)`
     - Uses a provider (Tavily or Brave Search) selected via env vars (`TAVILY_API_KEY`, `BRAVE_API_KEY`).
     - Returns only website results (`https://…`), each with `title`, `url`, and a short snippet.
     - Limits results (e.g. top 5) and filters out non-web types (PDFs if undesired, non-http).
  2. `fetch_page(url: string)`
     - Fetches HTML over `http(s)`, rejects other schemes.
     - Extracts readable text (prefer `jsdom` + `@mozilla/readability`; fallback to lightweight tag stripping if libs absent).
     - Returns `{ url, title, content, wordCount }` with size limits and timeouts.
- Register these tools in `streamText` when `webSearch` is enabled; `toolChoice: 'auto'` so the model can call them.

## URL Paste Handling
- Detect if `effectiveQuery` is a URL. If yes and `webSearch` is enabled:
  - Hint tool usage via `prepareStep`: require `fetch_page` first if no prior page content is available.
  - Allow the model to reference the fetched content directly.
- If `webSearch` is disabled but a URL is pasted, optionally fetch the page in a single step (configurable) or prompt the user to enable web search.

## Response Formatting
- In web-search mode, instruct the model to:
  - State findings with inline citations like `[1]`, `[2]` and a “Sources” section with full `https://` links.
  - Only include facts present in fetched `content` or search snippets; otherwise, explicitly say “No reliable source found”.
- Optionally attach a compact list of used sources in message metadata for future UI enhancements.

## Safety & Limits
- Enforce `http(s)` only, domain blacklist/allowlist hooks, and max URL fetch size (e.g. 1–2 MB) with graceful truncation.
- Add request timeouts and retries for `search_web` and `fetch_page` (e.g. 10s timeout, up to 2 retries).
- Limit pages fetched per answer (e.g. top 3) and parallelize safely.
- Sanitize HTML and strip scripts/styles; do not execute remote code.

## Verification
- Test: normal Q&A with “Search: Off” (no web usage).
- Test: query with “Search: On” returns grounded facts plus citations.
- Test: paste `https://ai-sdk.dev/docs/ai-sdk-core/embeddings` with “Search: On”; ensure the assistant reads the page and cites it.
- Test: no API key configured → assistant politely disables web search and asks to configure a key.

## Configuration
- Add env vars and docs: `TAVILY_API_KEY` (preferred) or `BRAVE_API_KEY`.
- Provide sensible defaults (web search disabled if no key; fetch_page still works if allowed).
- Keep existing Canvas tools behavior unchanged; combine tools when both Canvas and Web are enabled.