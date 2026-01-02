## Overview
Implement item-level quiz generation alongside module-wide generation in the quiz module view. Selecting an item highlights it with a green border and enables a “Generate Quiz” button. Keep module-wide generation available from the same card.

## UI Changes (Client)
### Course Modules Grid (modules list page)
- Add per-card selection state: `selectedItemId: number | null` for each module.
- Make each item row selectable:
  - Click toggles selection for that module only.
  - Apply green border and subtle background when selected.
- Add actions under the item list:
  - Primary: `Generate quiz for selected item` (disabled until an item is selected).
  - Secondary: `Generate quiz for this module`.
- On click:
  - Navigate to `protected/quiz/[courseId]/module/[moduleId]`.
  - For item generation, append `?itemId=<id>`.
- Add debug logs when selecting items and triggering generation.

### Module Q&A Page (question carousel)
- Read `itemId` from query using `useSearchParams`.
- Pass `itemId` through to the server API when present.
- Update loading text to reflect scope: “Generating questions for item” vs “module”.

## API Changes (Server)
### Extend existing route `GET /api/quiz/module-questions`
- Accept optional `itemId` (number).
- Fetch target module as today.
- If `itemId` is present:
  - Find the matching `CanvasModuleItem` (prefer `type === 'Page'`).
  - Retrieve page content via `CanvasAPIService.getPageContent(courseId, item.html_url)`.
  - Build a single-page corpus for prompt.
- Else:
  - Keep current behavior: aggregate all `Page` items in the module.
- Return the same shape `{ pages, summary, questions }`.
- Add debug logs: when `itemId` is used, which page is targeted, counts, and timing.
- For non-`Page` items:
  - Return a friendly error (`400`) indicating item-level quiz currently supports Pages only.

## Prompt Behavior
- Reuse current `generateObject` schema.
- When item-only:
  - Mention the specific page title in the system prompt context.
- When module-wide:
  - Behave as current.

## Visual Details
- Item row selected state:
  - Styles: `border border-green-600 bg-green-50 text-foreground` (subtle), rounded, hover unchanged.
  - Icon remains left; title text left-aligned.
- Action buttons section:
  - Sticky at the bottom of the card content.
  - Primary enabled only with selection; secondary always enabled.

## Files to Update
- `src/app/protected/quiz/[courseId]/page.tsx` (selection, actions, navigation, styling).
- `src/app/protected/quiz/[courseId]/module/[moduleId]/page.tsx` (read `itemId`, pass to API, scope-aware labels).
- `src/app/api/quiz/module-questions/route.ts` (handle `itemId`, single page generation).

## Testing
- Select various items across modules; verify green border and button enablement.
- Generate item-level quiz (with `Page` items) and ensure questions are relevant to the page.
- Generate module-wide quiz; confirm multiple pages are processed.
- Error path: selecting non-Page item should show a human-readable error toast.

## Logging
- Add at least one `console.debug` per interaction:
  - Item selection, action clicks, API scope (itemId/module).

## Rollout Notes
- No DB changes.
- Backward-compatible API: new param is optional.
- Gracefully handle missing or invalid `itemId`.

Do you want me to implement these changes now?