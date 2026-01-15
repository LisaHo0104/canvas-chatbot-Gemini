---
name: Workspace Feature Implementation
overview: Implement a workspace system that stores context, artifacts, and uploaded documents for assignment-specific workflows. Each workspace is tied to an assignment and contains chat sessions, supporting a guided workflow from rubric analysis → writing style capture → template creation → draft generation → revision.
todos:
  - id: db-migrations
    content: Create database migrations for workspaces, workspace_documents, workspace_artifacts, workspace_context tables, and add workspace_id to chat_sessions
    status: pending
  - id: api-endpoints
    content: Create API endpoints for workspace CRUD operations, document upload/management, and artifact linking
    status: pending
    dependencies:
      - db-migrations
  - id: document-processing
    content: Implement document upload to Supabase Storage and text extraction utilities for PDF/DOCX files
    status: pending
    dependencies:
      - api-endpoints
  - id: workspace-ui-components
    content: "Build workspace UI components: WorkspacePanel, WorkspaceDocuments, DocumentUploader, and workflow stage indicators"
    status: pending
    dependencies:
      - api-endpoints
  - id: workspace-pages
    content: Create workspace list page and workspace detail page with split-screen layout (chat + workspace panel)
    status: pending
    dependencies:
      - workspace-ui-components
  - id: chat-integration
    content: "Integrate workspace support into chat: workspace selector, auto-linking sessions, workspace context in prompts"
    status: pending
    dependencies:
      - workspace-pages
  - id: workflow-implementation
    content: "Implement workflow stages: rubric analysis → style capture → template creation → draft generation → revision"
    status: pending
    dependencies:
      - chat-integration
  - id: system-prompt-updates
    content: Update system prompts to be workspace-aware and include workspace context (documents, style, template)
    status: pending
    dependencies:
      - workflow-implementation
---

# Workspace Feature Implementation Plan

## Overview

Introduce a **workspace** concept that serves as a container for assignment-specific work. Each workspace is tied to a specific assignment and can contain:

- Selected context (courses, assignments, modules)
- Uploaded documents (previous papers, templates)
- Artifacts (rubric analyses, drafts)
- Chat sessions related to the assignment
- Writing style profile
- Template structure

The UI will be split-screen: **left side for chat**, **right side for workspace** showing all artifacts, documents, and context.

## Architecture

### Data Model

**New Tables:**

1. `dev.workspaces` - Main workspace table

- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users)
- `assignment_id` (INTEGER, Canvas assignment ID)
- `assignment_name` (TEXT)
- `course_id` (INTEGER, Canvas course ID)
- `title` (TEXT) - User-friendly workspace name
- `description` (TEXT, optional)
- `writing_style_profile` (JSONB) - Extracted writing style from uploaded papers
- `template_structure` (JSONB) - Generated or user-created template
- `workflow_stage` (TEXT) - Current stage: 'rubric_analysis', 'style_capture', 'template_creation', 'draft_generation', 'revision'
- `created_at`, `updated_at` (TIMESTAMPTZ)

2. `dev.workspace_documents` - Documents uploaded to workspace

- `id` (UUID, PK)
- `workspace_id` (UUID, FK to workspaces)
- `user_id` (UUID, FK to auth.users)
- `file_name` (TEXT)
- `file_type` (TEXT) - 'previous_paper', 'template', 'reference', 'other'
- `storage_path` (TEXT) - Path in Supabase Storage
- `file_size` (BIGINT)
- `extracted_content` (TEXT) - Text extracted from PDF/DOCX for AI processing
- `metadata` (JSONB) - Additional metadata
- `created_at`, `updated_at` (TIMESTAMPTZ)

3. `dev.workspace_artifacts` - Link artifacts to workspaces

- `id` (UUID, PK)
- `workspace_id` (UUID, FK to workspaces)
- `artifact_id` (UUID, FK to artifacts)
- `artifact_role` (TEXT) - 'rubric_analysis', 'draft', 'template', 'other'
- `created_at` (TIMESTAMPTZ)

4. `dev.workspace_context` - Context items linked to workspace

- `id` (UUID, PK)
- `workspace_id` (UUID, FK to workspaces)
- `context_type` (TEXT) - 'course', 'assignment', 'module'
- `context_id` (INTEGER) - Canvas ID
- `context_name` (TEXT)
- `created_at` (TIMESTAMPTZ)

5. Update `dev.chat_sessions` table:

- Add `workspace_id` (UUID, FK to workspaces, nullable)

### File Storage

- Use **Supabase Storage** with bucket: `workspace-documents`
- Store files with path: `{user_id}/{workspace_id}/{file_name}`
- Extract text content for AI processing (PDF, DOCX, TXT)
- Store extracted content in `workspace_documents.extracted_content` for quick access

## Implementation Steps

### Phase 1: Database & API Foundation

1. **Create database migrations** (`supabase/migrations/`)

- Create `workspaces` table with RLS policies
- Create `workspace_documents` table with RLS policies
- Create `workspace_artifacts` junction table
- Create `workspace_context` table
- Add `workspace_id` to `chat_sessions`
- Create indexes for performance

2. **Create API endpoints** (`src/app/api/workspaces/`)

- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create new workspace
- `GET /api/workspaces/[id]` - Get workspace details
- `PATCH /api/workspaces/[id]` - Update workspace
- `DELETE /api/workspaces/[id]` - Delete workspace
- `POST /api/workspaces/[id]/documents` - Upload document to workspace
- `DELETE /api/workspaces/[id]/documents/[docId]` - Delete document
- `GET /api/workspaces/[id]/documents` - List workspace documents
- `POST /api/workspaces/[id]/artifacts` - Link artifact to workspace
- `POST /api/workspaces/[id]/context` - Add context to workspace

3. **Update chat API** (`src/app/api/chat/route.ts`)

- Accept `workspace_id` in request body
- Auto-create chat session with workspace link
- Include workspace context in system prompt

### Phase 2: Document Upload & Processing

1. **File upload handler** (`src/app/api/workspaces/[id]/documents/route.ts`)

- Accept multipart/form-data
- Upload to Supabase Storage
- Extract text from PDF/DOCX (use libraries like `pdf-parse`, `mammoth`)
- Store metadata in database
- Return document info

2. **Document processing utilities** (`src/lib/document-processor.ts`)

- PDF text extraction
- DOCX text extraction
- Text cleaning and normalization
- Writing style analysis (extract patterns, tone, structure)

### Phase 3: Workspace UI Components

1. **Workspace page** (`src/app/protected/workspaces/[id]/page.tsx`)

- Split-screen layout (50/50 or adjustable)
- Left: Chat interface (reuse existing chat components)
- Right: Workspace panel showing:
- Workspace header (title, assignment info, workflow stage)
- Context items (courses, assignments, modules)
- Documents section (uploaded files with preview)
- Artifacts section (rubric analyses, drafts)
- Template section (if created)
- Writing style profile (if captured)

2. **Workspace list page** (`src/app/protected/workspaces/page.tsx`)

- Grid/list view of all workspaces
- Filter by assignment, course, workflow stage
- Create new workspace button

3. **Workspace components** (`src/components/workspace/`)

- `WorkspaceHeader.tsx` - Title, assignment info, workflow stage indicator
- `WorkspaceContext.tsx` - Display linked context items
- `WorkspaceDocuments.tsx` - Document list with upload, preview, delete
- `WorkspaceArtifacts.tsx` - Display linked artifacts (rubric, drafts)
- `WorkspaceTemplate.tsx` - Template structure viewer/editor
- `WorkspaceStyleProfile.tsx` - Writing style analysis display
- `WorkspacePanel.tsx` - Main right-side panel container
- `DocumentUploader.tsx` - Drag-and-drop file upload
- `WorkflowStageIndicator.tsx` - Visual progress through workflow stages

### Phase 4: Chat Integration

1. **Update chat page** (`src/app/protected/chat/page.tsx`)

- Add workspace selector in header
- When workspace selected, show workspace panel on right
- Auto-link chat sessions to workspace
- Include workspace context in chat system prompt

2. **Workspace-aware chat** (`src/app/protected/workspaces/[id]/chat/page.tsx`)

- Chat interface with workspace context pre-loaded
- Workspace panel always visible on right
- Chat messages automatically linked to workspace

### Phase 5: Workflow Implementation

1. **Rubric Analysis Stage**

- When workspace created with assignment, auto-trigger rubric analysis
- Store rubric analysis as artifact linked to workspace
- Update `workflow_stage` to 'rubric_analysis'

2. **Writing Style Capture Stage**

- Chat prompts user to upload previous assignment papers
- Analyze uploaded documents for writing style
- Extract: tone, structure patterns, citation style, vocabulary level
- Store in `writing_style_profile` JSONB
- Update `workflow_stage` to 'style_capture'

3. **Template Creation Stage**

- Chat asks if user has template or wants one generated
- If generating: Use rubric + writing style to create template structure
- Store in `template_structure` JSONB
- Update `workflow_stage` to 'template_creation'

4. **Draft Generation Stage**

- Chat uses rubric + style + template to generate draft
- Store draft as artifact (new artifact_type: 'draft')
- Update `workflow_stage` to 'draft_generation'

5. **Revision Stage**

- User can edit draft via chat or direct editing
- Track draft versions
- Update `workflow_stage` to 'revision'

### Phase 6: System Prompt Integration

1. **Update system prompts** (`src/lib/system-prompt-templates.ts`)

- Add workspace-aware context
- Include workspace documents in context
- Reference workflow stage in prompts
- Guide user through workflow stages

2. **Workspace context builder** (`src/lib/workspace-context.ts`)

- Build context string from workspace data
- Include: assignment info, rubric analysis, writing style, template, documents
- Inject into system prompt

## Key Files to Modify/Create

### New Files

- `supabase/migrations/[timestamp]_create_workspaces.sql`
- `src/app/api/workspaces/route.ts`
- `src/app/api/workspaces/[id]/route.ts`
- `src/app/api/workspaces/[id]/documents/route.ts`
- `src/app/protected/workspaces/page.tsx`
- `src/app/protected/workspaces/[id]/page.tsx`
- `src/components/workspace/WorkspacePanel.tsx`
- `src/components/workspace/WorkspaceDocuments.tsx`
- `src/components/workspace/DocumentUploader.tsx`
- `src/lib/document-processor.ts`
- `src/lib/workspace-context.ts`

### Modified Files

- `supabase/migrations/[timestamp]_add_workspace_id_to_chat_sessions.sql`
- `src/app/api/chat/route.ts` - Add workspace support
- `src/app/protected/chat/page.tsx` - Add workspace selector and panel
- `src/lib/system-prompt-templates.ts` - Add workspace context
- `src/app/api/artifacts/route.ts` - Support 'draft' artifact type

## UI/UX Considerations

1. **Split-screen layout**: Use CSS Grid or Flexbox for 50/50 split, with resizable divider
2. **Responsive design**: On mobile, workspace panel becomes a drawer/modal
3. **Workflow guidance**: Show progress indicator and next steps
4. **Document preview**: Inline preview for PDFs, text files
5. **Drag-and-drop**: Support drag-and-drop for document uploads
6. **Real-time updates**: Use Supabase realtime for collaborative features (future)

## Security & Performance

1. **RLS policies**: Ensure users can only access their own workspaces
2. **File size limits**: Enforce max file size (e.g., 10MB per file)
3. **Storage quotas**: Track and limit storage per user
4. **Indexing**: Add indexes on frequently queried columns
5. **Caching**: Cache workspace data in client state

## Future Enhancements (Out of Scope)

- Version control for drafts
- Collaborative workspaces (multiple users)
- Template marketplace
- Integration with Google Docs/Word
- Mobile app
- Offline support