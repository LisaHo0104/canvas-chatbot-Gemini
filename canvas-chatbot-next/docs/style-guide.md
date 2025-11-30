# Style Guide

## Design Tokens
- Colors: background, foreground, primary, muted, border, ring, danger
- Typography: sans/mono, consistent text scales
- Spacing: 4/8px multiples; radius sm/md/lg

## Theming
- Light/Dark themes using CSS variables and `data-theme`

## Components
- Buttons: variants (solid/outline/ghost/link), sizes (sm/md/lg)
- Inputs: consistent focus states, labels, errors
- Modals/Dropdowns/Tooltips: Radix wrappers

## Accessibility
- Keyboard nav, focus visible, ARIA roles/labels, contrast ratios

## Consolidated Navigation System

### Information Architecture
- Primary navigation: Chat, Settings, Help
- Account menu: Profile, Settings, Logout
- Settings sub-navigation: General, AI Providers

### Components & Patterns
- Top bar: Shadcn `Button` links for primary nav; `DropdownMenu` for account actions
- Sidebar: Shadcn `Button` actions (New Chat, Settings, Logout) with consistent tokens
- Settings: Shadcn `Tabs` with `TabsList`, `TabsTrigger`, and `TabsContent`

### Styling & Tokens
- Colors: `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`
- Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- Spacing: `h-8/9`, `px-3/4`, `gap-2`

### Accessibility
- `aria-current="page"` on active top navigation items
- `aria-label` on Account trigger and upload controls
- `role="navigation"` for the header; `aria-live="polite"` for async feedback
- Keyboard support: Tab order preserved; Enter/Space activate Dropzone

### Implementation Locations
- Top navigation: `src/components/MainNavBar.tsx`
- Sidebar actions: `src/components/EnhancedSidebar.tsx`
- Settings tabs: `src/app/settings/page.tsx`
- Provider actions: `src/app/settings/ai-providers/page.tsx`

### Guidelines
- Use Shadcn `Button` for all navigation actions (default/outline/ghost variants)
- Avoid nested anchors inside interactive components; prefer `Button` inside `Link`
- Keep icon sizes consistent (`w-4 h-4`) and provide accessible names via `aria-label`