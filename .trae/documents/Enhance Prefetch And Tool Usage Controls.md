## How Prefetch Works
- Chat route prefetches: `canvas-chatbot-next/src/app/api/chat/route.ts:188–200` builds `canvasContext` using `CanvasContextService.buildContext(query, userId)` and injects it as a second system message labeled `STUDENT'S CANVAS DATA`.
- Content assembly: `canvas-chatbot-next/src/lib/canvas-context.ts:347–454` fetches modules, filters week, and iterates all items.
  - Pages: `getPageContent` with robust slug handling (`canvas-chatbot-next/src/lib/canvas-api.ts:265–295`).
  - Files: metadata (`canvas-chatbot-next/src/lib/canvas-api.ts:297–308`) and text via `getFileText` (dynamic `pdf-parse`).
  - External links/tools: included with direct URLs (`canvas-chatbot-next/src/lib/canvas-context.ts:396–447`).
  - Assignment details: `getAssignments` and description inclusion.
- Cleaned text: `cleanText` strips HTML and limits size (`canvas-chatbot-next/src/lib/canvas-context.ts:630–639`).
- Model settings: tool choice remains `auto`, but step cap increased so tools can be used when needed (`canvas-chatbot-next/src/app/api/chat/route.ts:213–219`).

## Proposed Enhancements
1. Force Tool Usage Toggle
- Add a query intent check: for content requests, set `toolChoice: 'required'` and explicitly enumerate `get_page_content` and `get_file_text` for all module items.
- Provide a per-session toggle to choose server-prefetch vs strict tool-calling.

2. Prefetch Caching
- Cache per-course/module-week context keyed by user+course+week for 15 minutes to avoid repeated fetches and speed up responses.

3. Coverage Metrics
- Log a summary: items found vs items included (pages/files/external/assignments), and include a brief coverage line in the response footer.

4. Pagination And Large Items
- Add pagination for modules with >50 items and chunk very long page/PDF content across multiple sections.

5. Prompt Guardrails
- Add a guard that tells the model: “Use prefetch first; only call tools if coverage <100% or links missing.”

## Outcome
- Accurate, link-backed summaries whether the model calls tools or not; faster replies via caching; explicit coverage reporting to detect gaps.