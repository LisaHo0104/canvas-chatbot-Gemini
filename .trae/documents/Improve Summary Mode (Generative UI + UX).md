## Objectives
- Make Summary mode clear, engaging, and easy to scan.
- Ensure every section has either a concise description (1–2 lines) or Success Criteria (“You can… / You are able to…”).
- Standardize structure, reduce cognitive load, and support multi-page notes.

## Information Architecture
- Single block layout with sticky tabs: Overview, Content, Activities, Assessment, Checklist, Resources, Notes.
- Always show module header with meta (estimated time, due date, difficulty) and primary actions.
- Progressive disclosure for Content via collapsible section cards.
- Group practice tasks under Activities; graded tasks under Assessment.

## Data Model & Tool Schema
- Extend `provide_summary_output` to support richer data:
  - `meta: { estimatedTime, date, difficulty, course?, module?, author? }`
  - `activities: [{ title, description?, successCriteria?, timeEstimate?, prerequisites?, ctaLabel? }]`
  - `assessments: [{ type: 'assignment'|'quiz'|'project', title, description?, successCriteria?, dueDate?, weight?, ctaLabel? }]`
  - Per-page equivalents: `pages[].activities`, `pages[].assessments`.
- Enforce Summary-mode instructions server-side: require tool call and structured outputs.
- Files to update:
  - `canvas-chatbot-next/src/lib/canvas-tools.ts` (schema additions)
  - `canvas-chatbot-next/src/app/api/chat/route.ts` (summary enforcement text)

## Rendering & Components
- Summary container with header + meta row: `canvas-chatbot-next/src/components/summary/summary-ui.tsx`.
- Sticky tab list for quick navigation; each tab renders:
  - Overview: key concepts chips; progress; Success Criteria card.
  - Content: accordion sections; headers/subheaders; bullets; code blocks.
  - Activities: practice task cards with description or Success Criteria, estimates, prerequisites, CTA.
  - Assessment: type badge, weight, due date, description or Success Criteria, CTA.
  - Checklist: interactive, priority labels, due dates, progress.
  - Resources: preview cards (pdf/video/web) with tags.
  - Notes: add/search, timestamped entries.
- Tool rendering switch: `canvas-chatbot-next/src/components/canvas-tools/tool-renderer.tsx` → add case for `provide_summary_output` and pass structured data to Summary UI.

## Empty States & Derived Content
- Filter out invalid/blank items before rendering.
- Derive Key Concepts from section titles, bullets, criteria, and resource tags if not provided.
- Show purposeful empty-state copy (e.g., “No activities added”).

## Microcopy & Labels
- Buttons: “Begin learning”, “Start Practice”, “View Rubric”, “Save note”, “Expand section”.
- Helper text: estimated time, due guidance, success criteria explainer.
- Success Criteria format: action-oriented outcomes with measurable phrasing.

## Accessibility & Usability
- Keyboard and screen-reader friendly: labeled controls, semantic headings, focus states.
- Sticky tabs maintain context; reduce scrolling burden.
- Color contrast aligned with academic-friendly palette via existing tokens.

## Performance & Streaming
- Keep streaming of text-delta minimal in Summary mode; collapse noisy UI while assistant is streaming.
- Avoid rendering heavy components until output is available.

## Validation & Testing
- Unit tests for rendering and empty-state logic: `src/components/summary/__tests__` (new).
- E2E scenario: load Summary tool output, navigate tabs, interact with checklist and notes.
- Ensure `artifact_type: 'summary_note'` is accepted by `/api/artifacts` (verify and update if needed).

## Analytics & Debugging
- Minimal debug logs (per workspace rule): render counts, page/tab changes, CTA clicks.
- Optional: event hooks for Save Artifact and CTA usage.

## Rollout Plan
- Phase 1: Schema + UI rendering (Overview, Content, Checklist, Resources, Notes).
- Phase 2: Activities + Assessment tabs; success criteria enforcement.
- Phase 3: Accessibility pass, tests, and artifact save verification.
- Phase 4: Polish microcopy, theming, and performance tuning.

## References (for implementation)
- Add Summary rendering: `canvas-chatbot-next/src/components/canvas-tools/tool-renderer.tsx:375`
- Summary UI main component: `canvas-chatbot-next/src/components/summary/summary-ui.tsx:98`
- Summary mode mapping & picker: `canvas-chatbot-next/src/app/protected/chat/page.tsx:1655`, `1691`
- Summary schema/tool: `canvas-chatbot-next/src/lib/canvas-tools.ts:607`
- Server prompt enforcement: `canvas-chatbot-next/src/app/api/chat/route.ts:548`

If approved, I’ll implement Phase 1–2 in one pass and deliver Phase 3–4 iteratively with tests and accessibility checks.