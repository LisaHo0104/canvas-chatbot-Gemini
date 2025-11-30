# Unified Settings Page

## Summary
- Merged the tabbed Settings into a single page with two sections: General Settings and AI Providers Configuration.
- Preserved Canvas configuration and AI provider management. Added local navigation and smooth section transitions.

## Implementation
- File updated: `src/app/settings/page.tsx`
  - Removed Radix Tabs; introduced stacked sections separated by `Separator`.
  - Section 1: Canvas Configuration (`Card`) retains existing form and handlers.
  - Section 2: AI Providers Configuration (`Card`) embeds `AIProvidersSettings`.
  - Local nav: two `Button`s to scroll to `#general` and `#providers` using `scrollIntoView`.
- Supporting components: Shadcn `Card`, `Button`, `Input`, `Select`, `Label`, `Separator`.
- Responsive container: `w-full max-w-4xl mx-auto p-6` with consistent spacing.

## Code References
- Settings page unified layout: `src/app/settings/page.tsx:196-286`
- AI Providers component: `src/app/settings/ai-providers/page.tsx`
- Separator: `src/components/ui/separator.tsx`

## Accessibility
- Maintains labeled inputs and semantic section headings.
- Buttons are focusable; smooth scroll preserves keyboard navigation.

## Transitions
- In-page transitions implemented via `scrollIntoView({ behavior: 'smooth' })`.

## Notes
- No functional changes to form handlers or provider logic.
- Supabase auth and loading flows are unchanged.