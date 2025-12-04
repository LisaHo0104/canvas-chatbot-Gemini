## Goal
Ensure the model executes tools step‑by‑step (courses → modules → pages/files) and does not skip any required tool calls, using AI SDK multi‑step features and extracting all step results.

## Changes (Tool‑Driven Only)
- Keep tool calling and use AI SDK multi‑step with `stopWhen: stepCountIs(N)`.
- Capture all intermediate tool calls/results via `onStepFinish` and the `steps` log.
- Add a coverage checker that inspects the `steps` log to confirm every expected page/file from the selected module has a corresponding tool result.
- If coverage is incomplete, trigger an additional multi‑step generation prompting the model to call the missing tools.

## Implementation
### 1) Chat Route Enhancements (`src/app/api/chat/route.ts`)
- Set `stopWhen: stepCountIs(80)` for summarization queries.
- Provide `onStepFinish` to append each step’s toolCalls/toolResults to a `stepsLog` array (and optionally persist to Supabase).
- After `streamText` finishes, inspect `stepsLog` to:
  1. Find the target course and module from `get_modules` tool results.
  2. Derive expected `Page` and `File` items (and `ExternalUrl`, `ExternalTool`).
  3. Verify presence of `get_page_content` results for each `Page` and `get_file_text` for each `File`.
- If any items are missing, run a second `streamText` call with:
  - An instruction message: "You must call tools for these missing items: …"
  - Same `tools` object and `stopWhen`.
  - Continue capturing `stepsLog2` and re‑check.
- Return the final assistant text plus an attached `stepsLog` for transparency.

### 2) System Prompt Nudge (Without Disabling Tool Autonomy)
- Add a small section requiring this sequence for summarization:
  - "When asked to summarize a week/module: 1) list_courses, 2) get_modules, 3) for each Page → get_page_content, 4) for each File → get_file_text, 5) include ExternalUrl and ExternalTool links. Continue calling tools until all items in the target module are retrieved."
- Keep wording light so models still compute text after tools.

### 3) Helpers
- `isSummarizationQuery(query)` to apply stricter `stopWhen` and enable coverage checks.
- `extractExpectedItems(stepsLog)` to parse module items from `get_modules` tool results.
- `findToolResults(stepsLog, name)` to map tool outputs quickly.

### 4) UI (Optional)
- Show a collapsible "Tool Steps" panel in chat with step count, each tool call name, parameters, and result summaries for debugging.

## Verification
- Reproduce: "summarize week 2 Issues, Crisis and Risk Communication".
- Confirm steps include: `list_courses` → `get_modules` → many `get_page_content` and `get_file_text` calls.
- Confirm coverage check passes and no items are missing.
- Confirm the final answer includes all links.

## Notes
- This keeps the tool‑first workflow and uses AI SDK multi‑step features exactly as desired: explicit step limit, `onStepFinish` callbacks, and post‑run coverage enforcement. No deterministic prefetch is used; the model remains the caller, but we supervise and re‑prompt for any missing items.