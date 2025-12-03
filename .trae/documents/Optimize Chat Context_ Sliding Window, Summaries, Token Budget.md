## Objective
- Improve speed, cost, and answer quality by limiting how much conversation history is sent while preserving essential context.

## Approach
- Keep only the most relevant recent turns under a strict token budget.
- Maintain a rolling session summary and key facts as durable memory.
- Enforce per-request token caps and trim noisy content.

## Phase 1 — Immediate Improvements (no vectors)
- Sliding window with token budget:
  - Build context from `system` + `session_summary` + last N relevant turns until reaching a configurable token cap (use `tokenlens`).
  - Drop acknowledgements and short filler messages automatically.
- Rolling summary:
  - When history exceeds thresholds, generate a concise summary and store it with the session; prepend it as a `system` memory in future requests.
- Trim tool/file parts:
  - Cap large text/file parts; include short digest plus a link/ID to full data.
- Config flags:
  - `MAX_CONTEXT_TOKENS`, `MAX_HISTORY_TURNS`, `ENABLE_AUTO_SUMMARY` with sensible defaults.

## Phase 2 — Optional Relevance Retrieval (vectors)
- Add embeddings table (e.g., `chat_message_embeddings`) and pgvector extension in Supabase.
- Embed each message; at request time, embed the new query and fetch top-k similar prior messages to include alongside the sliding window.
- Backfill embeddings for existing sessions.

## Touchpoints (Files/Functions)
- Context assembly:
  - `src/app/api/chat/route.ts:169-191` — replace direct spread of `incomingMessages`/`history` with a helper `buildContext({ systemPrompt, summary, incoming, history, budget, model })` that returns capped `uiMessages`.
  - `src/app/api/chat/route.ts:193` — continue using `convertToModelMessages(uiMessages)`.
- Model call & persistence:
  - `src/app/api/chat/route.ts:195-256` — after `onFinish`, update session summary when thresholds met; persist both user and assistant messages as today.
- Provider path (alternative call site):
  - `src/lib/openrouter-service.ts:56-71` — same strategy if using this service; prepend `session_summary` and cap history before `messages` are posted.
- Optional structured summarization:
  - Reuse `generateObject` pattern from `src/app/api/suggestions/route.ts` to produce `{ summary, facts }` objects.

## Data Model
- Add nullable columns to `chat_sessions`:
  - `summary TEXT` — rolling summary of the conversation.
  - Optionally `facts JSONB` — stable key facts/preferences.
- Optional vector store:
  - `chat_message_embeddings(message_id UUID, embedding VECTOR(1536))` and indexes;
  - pgvector extension enabled.

## Configuration
- `MAX_CONTEXT_TOKENS`: default 8000 (adjust per model context).
- `MAX_HISTORY_TURNS`: default 12.
- `SUMMARY_UPDATE_EVERY`: default 6 turns.
- `SUMMARY_MAX_TOKENS`: default 1200.

## Verification
- Token budgeting unit tests (small, medium, large histories) asserting kept turns and total token counts.
- Load tests measuring latency and cost before/after with long sessions.
- Manual checks on http://localhost:3000 to verify responses remain coherent across long chats.

## Rollout
- Implement Phase 1 behind config flags; migrate DB for `summary`.
- Monitor token usage (`ai_provider_usage`) and response times; tune budgets.
- Optionally proceed to Phase 2 if sessions remain very long or domain requires deep recall.

Would you like me to proceed with Phase 1 implementation and the minimal DB migration for `chat_sessions.summary`?