## Goal
- Verify the new context-limiting changes improve speed, cost, and answer quality on long sessions.

## Metrics
- Latency: end-to-end (UI submit→final token), server `response_time_ms`.
- Token usage: `prompt_tokens`, `completion_tokens`, `total_tokens`.
- Cost: USD per request (from usage + model pricing).
- Context size: number of turns included and approximate input tokens.
- Streaming UX: time-to-first-token (TTFR) and time-to-last-chunk (TTLC).
- Accuracy proxy: simple win/lose rubric on a small eval set (manual or scripted).

## Instrumentation
- Server (already available):
  - Use `ai_provider_usage` entries written in `src/lib/ai-provider-service.ts:276–301` to track tokens, cost, and `response_time_ms`.
- Server (add lightweight counters):
  - In `src/app/api/chat/route.ts`, log `uiMessages.length` and an approximate input-token count before the model call; attach to the assistant message `metadata` (e.g., `{ contextTurns, approxInputTokens }`).
- Client:
  - In `protected/chat/page.tsx`, start a timer on submit and stop when the stream finishes; record TTFR and TTLC; optionally display in UI for quick spot-checks.
- Feature flag:
  - Add env toggles to enable/disable sliding-window and summary (`NEXT_PUBLIC_ENABLE_CONTEXT_LIMITS`) to run A/B comparisons.

## A/B Procedure
- A: Disable context-limiting; run 20 long-session queries (≥20 turns).
- B: Enable context-limiting with defaults; run the same queries.
- Record per-request metrics and compare distributions (median and p95) for latency, tokens, and cost.

## Queries and Reporting
- Supabase SQL (examples):
  - Average latency by day/model: `SELECT model_name, AVG(response_time_ms) FROM ai_provider_usage WHERE request_type='chat' GROUP BY model_name;`
  - Token reduction: `SELECT AVG(prompt_tokens) FROM ai_provider_usage WHERE created_at BETWEEN <A_range>;` vs `<B_range>`.
  - Cost per request: `SELECT AVG(cost_usd) FROM ai_provider_usage WHERE ...;`
- Optional dashboard: small page that charts latency and tokens over time for a selected session.

## Tests
- Extend `e2e/openrouter-integration.spec.ts` to:
  - Simulate a long chat and measure TTFR/TTLC with `performance.now()`.
  - Assert TTLC decreases and prompt tokens drop when context-limiting is ON.
- Unit tests exist for token budgeting; keep them as guardrails.

## Success Criteria
- ≥30% reduction in `prompt_tokens` on long sessions.
- ≥20% reduction in `response_time_ms` and TTLC.
- Stable or improved answer quality on the eval set (no regressions).

## Notes
- Ensure the app builds cleanly before testing (module path/casing issues can skew results). If a "Module not found" error appears, verify the file path matches the alias and casing.

Do you want me to proceed to add the server/client instrumentation, A/B flag, and an e2e test that captures TTFR/TTLC and compares before/after?