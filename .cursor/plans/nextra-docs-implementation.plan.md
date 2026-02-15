---
name: Nextra Docs Implementation
overview: Implement Nextra at /docs to showcase technology and system design for the audience.
todos:
  - id: install-nextra
    content: Install nextra and nextra-theme-docs, configure next.config
    status: completed
  - id: docs-route
    content: Create app/docs catch-all route and docs layout
    status: completed
  - id: content-structure
    content: Add content/ structure with system design docs
    status: completed
  - id: navbar-link
    content: Add Docs link to MainNavBar
    status: completed
  - id: verify-build
    content: Run bun run build to verify compilation
    status: completed
isProject: false
---

# Nextra Implementation: System Design Documentation

**Goal:** Use Nextra as the quickest way to showcase technology and system design documents for the audience to understand how the system works.

**Target:** `/docs` route inside the existing canvas-chatbot-next app.

---

## 1. Install Dependencies

```bash
cd canvas-chatbot-next && bun add nextra nextra-theme-docs
```

---

## 2. Configure next.config

Update [canvas-chatbot-next/next.config.ts](canvas-chatbot-next/next.config.ts):

- Import Nextra and wrap config with `withNextra`
- Set `contentDirBasePath: '/docs'` so content is served at `/docs`

Note: Nextra typically uses `next.config.mjs` for ESM. May need to rename to `.mjs` or ensure TypeScript config supports the Nextra plugin.

---

## 3. Create Docs Route and Layout

- Create `canvas-chatbot-next/src/app/docs/[[...mdxPath]]/page.tsx` as catch-all route
- Create `canvas-chatbot-next/src/app/docs/layout.tsx` to wrap docs in Nextra theme layout

Nextra's Docs Theme provides the Layout component; the catch-all page delegates to it.

---

## 4. Content Structure for System Design

Create `canvas-chatbot-next/content/` (or `content/docs/` depending on Nextra 4 convention):

```
content/
  index.mdx              # /docs - Overview / welcome
  system-design/
    index.mdx            # /docs/system-design - Architecture overview
    architecture.mdx     # High-level architecture diagrams
    tech-stack.mdx       # Technology choices and rationale
  api/
    overview.mdx         # API design (if relevant)
```

Use **meta.json** or frontmatter for sidebar configuration. Nextra supports Mermaid diagrams and code blocks for architecture visuals.

---

## 5. Add Docs Link to MainNavBar

Update [MainNavBar.tsx](canvas-chatbot-next/src/components/MainNavBar.tsx):

- Add a "Docs" NavigationMenuLink (visible to all users, not just authenticated)
- Point to `/docs`
- Use `pathname.startsWith('/docs')` for active state

---

## 6. Verify Build

```bash
cd canvas-chatbot-next && bun run build
```

Per workspace rules, ensure the project compiles.

---

## Suggested Initial Content (index.mdx)

```mdx
# Lulu System Documentation

Welcome to the system design and technology documentation for **Lulu** — the Canvas chatbot and study assistant.

## Contents

- [System Design](/docs/system-design) — Architecture and component overview
- [Tech Stack](/docs/system-design/tech-stack) — Technologies and design decisions
```

---

## References

- [Nextra Docs Theme Start](https://nextra.site/docs/docs-theme/start)
- [Nextra content directory](https://nextra.site/docs/file-conventions/content-directory)
