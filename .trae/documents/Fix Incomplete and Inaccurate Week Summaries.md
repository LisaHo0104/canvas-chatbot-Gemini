## Root Causes
- Tool call cap truncates retrieval: current `stopWhen: stepCountIs(20)` can end the chain before all pages/files are fetched, leading to partial context and missed items.
- Files not parsed: `File` items only return metadata and a download link; PDFs aren’t converted to text, so summaries ignore their content.
- External links ignored: `ExternalUrl` and `ExternalTool` items are skipped in content assembly, omitting readings/videos hosted outside Canvas.
- Fragile page fetch fallback: `getPageContent` treats `pageUrl` as either a full URL or a slug. If it’s an API URL or HTML URL that doesn’t match expectations, fallback can fail and skip the page.
- Module filtering gaps: week detection relies on strict name patterns; modules named “Week Two” or custom formats may not match, so the wrong module or none is summarized.
- Item caps: builder slices to 20 items per module, potentially dropping content in larger weeks.
- Hallucination risk: the prompt doesn’t strictly forbid inventing details; when context is partial, the model may fill gaps.

## Targeted Fixes
1. Increase tool step limit
   - Update `canvas-chatbot-next/src/app/api/chat/route.ts` to raise `stepCountIs(20)` → `stepCountIs(60)` so the model can fetch all module items.

2. Parse file content (PDFs)
   - Add a new tool `get_file_text(fileId)` that downloads the file and, for PDFs, uses `pdf-parse` to extract text.
   - Expand content builder to include “📄 PDF CONTENT” blocks for file items and link back to the original resource.

3. Handle external items
   - In content builder (and tool-driven path), include `ExternalUrl` and `ExternalTool` items with titles, direct URLs, and any available descriptions.

4. Harden page fetch
   - Improve `getPageContent` to:
     - Detect and extract the slug if the input is an API page URL (`.../courses/:id/pages/:slug`).
     - Prefer `item.html_url` when available; otherwise use API `item.url`.
     - Add robust error logging per page with course/module/item identifiers.

5. Broaden week detection
   - Enhance matching to include variations like `week two`, `wk 2`, `w2`, roman numerals, and numeric-only patterns when paired with “week/module/unit”.
   - Fallback: list available module names and proceed with closest matches.

6. Remove hard caps
   - In server-side builder, remove `slice(0, 20)` limits on items or paginate through all items to avoid dropping content.

7. Tighten anti-hallucination instructions
   - Strengthen the system prompt to explicitly forbid inventing details and require citing content from retrieved Canvas data with links.

## Implementation Steps
- Update chat route step cap in `src/app/api/chat/route.ts`.
- Extend `CanvasAPIService` with `downloadFile` usage and a PDF parsing utility.
- Add `get_file_text` tool in `src/lib/canvas-tools.ts`.
- Update `buildContentContext` in `src/lib/canvas-context.ts` to:
  - Include `ExternalUrl` and `ExternalTool` items.
  - Remove item caps and iterate all items.
  - Use improved page fetching logic.
  - Add PDF text extraction output.
- Adjust `SYSTEM_PROMPT` in `src/lib/system-prompt.ts` to forbid guessing and require link-backed facts.
- Add unit tests for page parsing, PDF extraction, external item inclusion, and module matching variations.

## Verification
- Run e2e test: ask "summarize week 2 2025-HS1-MKT20021-Integrated Marketing Communication".
- Confirm all module pages, files (PDF text included), and external links are present.
- Check that the AI doesn’t invent unsupported details and provides correct links.

## QnA
- Want the summary to show per-page bullets under the Pareto core concepts or only aggregate core concepts with a consolidated resources section? We can support both formats by toggling a display option in the builder.