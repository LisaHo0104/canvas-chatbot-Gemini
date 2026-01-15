# Structured Summary Notes (SSN)

## Content Structure
- Header: Title (required), meta (estimated time, due date, difficulty, course/module/author if provided).
- Tabs: Overview, Content, Activities, Assessment, Checklist, Resources, Notes.
- Overview: Key Concepts, Progress, Success Criteria.
- Content: Collapsible section cards with headers/subheaders, bullets, code blocks.
- Activities: Practice tasks with description or Success Criteria, time estimates, prerequisites, CTA.
- Assessment: Type, weight, due date, description or Success Criteria, CTA (e.g., View Rubric).
- Checklist: Interactive items with priorities, optional due dates, progress percentage.
- Resources: Preview cards with type badges, tags, optional description.
- Notes: Add, timestamp, search/filter.

## Validation Rules
- Every section must include either a concise description (1–2 sentences) or Success Criteria (action-oriented outcomes).
- Filter null, empty, or malformed items.
- Normalize Success Criteria to begin with “You can …” or “You are able to …”.
- Hide empty subcards; show friendly empty states with reasons and suggested next steps.
- Derive Key Concepts from section titles, bullets, criteria, and resource tags when missing (capped to 8 chips).

## Accessibility
- Keyboard navigable tabs and CTAs with `aria-label`s.
- Semantic headings and labels; sufficient color contrast via design tokens.

## Analytics (Minimal)
- Track events: page/tab changes, activity/assessment CTAs, checklist toggles.
- Stored in `window.__summaryAnalytics` for future forwarding to analytics backend.

## Error Handling
- EmptyState component explains missing content, next steps, and alternatives.
- Validation utilities enforce structure and normalize criteria.

## Tool Inputs
- `meta`, `sections`, `activities`, `assessments`, `checklist`, `resources`, `pages` (multi-page).
- Per-page equivalents supported for activities and assessments.
