---
name: Assignment Planning Workflow MVP
overview: "Transform the app from simple prompting to a structured problem-solving workflow. The MVP will implement an \"Assignment Planning & Drafting\" feature that guides users through: problem understanding → plan creation → step-by-step execution → iterative refinement."
todos: []
---

# Assignment Planning & Drafting Workflow MVP

## Big Picture Analysis

### Current State

The app currently follows a **"Prompt → Generate Artifact"** pattern:

- User prompts → AI generates artifact (quiz/note/rubric) → User views/saves
- Quiz generation has a plan approval step (good pattern)
- Notes and rubric analysis are direct generation (no planning phase)
- Artifacts are JSON-structured (quiz, rubric_analysis, note)
- Notes already support markdown content in sections
- `MessageResponse` component renders markdown using Streamdown

### Vision: "Prompting to Design Workflow"

Transform to a **"Problem → Understand → Plan → Execute → Refine"** workflow that:

1. **Understands the problem**: AI generates multiple markdown artifacts to help user understand:

    - Assignment summary (requirements, rubric, key points)
    - Rubric analysis (if available)
    - Course content summary (relevant materials)
    - Research notes (key concepts, sources)

2. **Designs a master plan**: AI creates a comprehensive markdown master plan

    - Based on proven 6-step methodology (Understand → Plan → Research → Draft → Revise → Submit)
    - User can review and approve
    - Plan is a markdown file that can be viewed as rendered markdown OR generative UI

3. **Guides execution**: Step-by-step assistance with checkpoints
4. **Enables iteration**: User can refine, ask questions, get feedback at each step
5. **Produces deliverables**: Final draft, study notes, or structured output

### Research-Based Methodology

Based on academic best practices, the workflow follows this proven 6-step process:

1. **Understand the Assignment**: Read prompt, check rubrics, clarify requirements
2. **Plan & Break It Down**: Estimate time, break into sub-tasks, create schedule
3. **Research & Gather Materials**: Collect sources, take organized notes
4. **Drafting Structure**: Brainstorm, outline, write first draft
5. **Revise & Edit**: Big picture revision, paragraph-level edits, proofreading
6. **Final Review & Submission**: Get feedback, final read-through, submit

### Why This Matters

- **Better outcomes**: Structured planning prevents missing requirements
- **Reduced overwhelm**: Breaking large tasks into steps makes them manageable
- **Active learning**: Users understand the process, not just receive outputs
- **Iterative improvement**: Users can refine based on feedback

## Feature Breakdown

### Core Components

#### 1. **Problem Understanding Phase**

- User describes assignment/problem (e.g., "I need to write an essay on X")
- AI asks clarifying questions or extracts requirements from Canvas assignments
- AI identifies key components: topic, requirements, deadline, rubric criteria
- Output: Structured problem definition

#### 2. **Plan Generation Phase** (MVP Focus)

- AI analyzes problem and generates structured plan
- Plan includes: breakdown of steps, timeline, resources needed, checkpoints
- User can review, modify, or approve plan
- Similar to quiz plan approval workflow

#### 3. **Step-by-Step Execution** (MVP)

- AI guides user through each step of the plan
- Provides templates, examples, and resources for current step
- Tracks progress: which steps are complete, in progress, or pending
- User can request help for specific step
- AI provides step-specific guidance and deliverables
- Progress stored in artifact data

#### 4. **Iterative Refinement** (MVP)

- User can request feedback on drafts at any step
- AI reviews work and suggests improvements
- User can revise and iterate on each step
- Draft generation: AI helps write sections based on plan
- Feedback loop: Continuous improvement cycle
- Version tracking: Keep history of revisions

### MVP Scope: Assignment Planning Workflow

For the MVP, we'll focus on **Phase 1, 2, 3 & 4**: Problem Understanding + Plan Generation + Step-by-Step Execution + Iterative Refinement

**MVP Feature: "Assignment Planning & Execution Mode"**

- New mode similar to quiz/note/rubric modes
- User attaches assignment from Canvas or describes problem
- **AI generates multiple markdown artifacts** to help understand:
                                - Assignment summary (markdown)
                                - Rubric analysis (markdown, can reuse existing rubric_analysis type)
                                - Course content summary (markdown, can reuse note type)
                                - Research notes (markdown, can reuse note type)
- **AI generates master plan** as markdown file
                                - Follows 6-step methodology
                                - Includes breakdown, timeline, resources, success criteria
                                - Can be viewed as rendered markdown OR parsed into generative UI components
- User can approve/modify plan
- Plan can be saved as artifact (markdown-based)
- **Step-by-step execution**: AI guides through each step, tracks progress
- **Iterative refinement**: User can get feedback, revise drafts, iterate on each step

## Implementation Plan

### 1. Database Schema

**File**: `canvas-chatbot-next/supabase/migrations/[timestamp]_add_assignment_plan_artifact_type.sql`

- Add `'assignment_plan'` to artifacts table `artifact_type` CHECK constraint
- No new tables needed (reuse artifacts table)

### 2. Backend: Tool Definition

**File**: `canvas-chatbot-next/src/lib/canvas-tools.ts`

- Add `generate_assignment_plan` tool (similar to `generate_quiz_plan`)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Input: assignment context, user requirements, deadline info
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Output: structured plan with steps, timeline, resources
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Requires approval (needsApproval: true)
- Add `provide_assignment_plan_output` tool (similar to `provide_quiz_output`)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Input: final plan structure
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Output: renders in AssignmentPlanUI component
- Add `execute_assignment_step` tool (NEW - for step-by-step execution)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Input: stepId, planId, userProgress, userRequest
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Output: step guidance, templates, examples, next actions
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Allows AI to provide step-specific help
- Add `review_assignment_draft` tool (NEW - for iterative refinement)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Input: stepId, draftContent, planContext, rubricCriteria
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Output: feedback, suggestions, improvements, rubric alignment
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Enables AI to review and provide constructive feedback
- Add `generate_step_draft` tool (NEW - for draft generation)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Input: stepId, planContext, userInput, previousSteps
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Output: draft content for the step (e.g., essay outline, introduction paragraph)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Helps users get started on each step

### 3. Backend: System Prompt Enhancement

**File**: `canvas-chatbot-next/src/app/api/chat/route.ts`

- Add `analysisMode === 'assignment_plan'` handling
- Add enforcement prompt similar to quiz mode
- Guide AI through: gather info → generate plan → wait approval → provide output

**File**: `canvas-chatbot-next/src/lib/system-prompt-templates.ts`

- Add `ASSIGNMENT_PLAN_PROMPT` template
- Define markdown plan structure following 6-step methodology:

                                1. Understand the Assignment
                                2. Plan & Break It Down
                                3. Research & Gather Materials
                                4. Drafting Structure
                                5. Revise & Edit
                                6. Final Review & Submission

- Each step should include: objectives, tasks, resources, deliverables, success criteria
- Plan should be comprehensive markdown with clear sections, checklists, timelines

### 4. Frontend: UI Components

#### Assignment Plan UI Component

**File**: `canvas-chatbot-next/src/components/assignment-plan/assignment-plan-ui.tsx`

- Display plan structure: steps, timeline, resources
- Show progress indicators (completed/in-progress/pending steps)
- Interactive step cards with:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Status badges (pending/in-progress/completed/reviewed)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - "Start Step" / "Get Help" buttons
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - "Get Feedback" button (when draft exists)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - "Generate Draft" button (AI-assisted writing)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Draft content editor (textarea for user input)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Feedback display (shows AI feedback when available)
- Progress bar showing overall completion
- Timeline visualization with milestones
- Allow editing/refinement
- Similar structure to NoteUI/QuizUI but with interactive step management

#### Editable Assignment Plan UI

**File**: `canvas-chatbot-next/src/components/artifacts/EditableAssignmentPlanUI.tsx`

- Allow manual editing of plan steps
- Add/remove steps
- Modify timelines and resources

#### Plan Viewer in Tool Renderer

**File**: `canvas-chatbot-next/src/components/canvas-tools/tool-renderer.tsx`

- Add case for `generate_assignment_plan`
- Display plan in Plan component (reuse existing Plan UI)
- Show approval buttons

### 5. Frontend: Mode Integration

**File**: `canvas-chatbot-next/src/app/protected/chat/page.tsx`

- Add "assignment_plan" to mode options
- Add mode badge/colors (use `getModeColors`)
- Add suggestions for assignment planning mode

**File**: `canvas-chatbot-next/src/lib/mode-colors.ts`

- Add assignment_plan mode colors

### 6. Artifact Integration

**File**: `canvas-chatbot-next/src/components/artifacts/ArtifactPanel.tsx`

- Add case for `artifactType === 'assignment_plan'`
- Render AssignmentPlanUI in view mode
- Render EditableAssignmentPlanUI in edit mode

**File**: `canvas-chatbot-next/src/app/api/artifacts/route.ts`

- Add `'assignment_plan'` and `'assignment_summary'` to artifact_type validation
- Support markdown content in `artifact_data.content` field
- Validate markdown structure if metadata is provided

**File**: `canvas-chatbot-next/src/app/protected/artifacts/[id]/page.tsx`

- Support viewing assignment plan artifacts

### 7. Type Definitions

**File**: `canvas-chatbot-next/src/app/protected/chat/types.ts`

- Add `AssignmentPlanOutput` interface
- Add assignment_plan to artifact types

## Data Structure

### Markdown-Based Artifact Structure

**Primary Format: Markdown Files**

Artifacts store markdown content with optional metadata for UI parsing:

```typescript
// Assignment Plan Artifact
interface AssignmentPlanArtifact {
  content: string // Markdown content of the master plan
  metadata?: {
    assignmentId?: number
    courseId?: number
    assignmentName?: string
    dueDate?: string
    totalPoints?: number
    // Optional structured data for UI parsing
    steps?: Array<{
      id: string
      title: string
      order: number
      status?: 'pending' | 'in_progress' | 'completed' | 'reviewed'
      draft?: string // Markdown draft content
      feedback?: Array<{
        id: string
        timestamp: string
        feedback: string // Markdown feedback
      }>
      completedAt?: string
      startedAt?: string
    }>
    currentStepId?: string
    overallProgress?: number
  }
}

// Assignment Summary Artifact
interface AssignmentSummaryArtifact {
  content: string // Markdown summary of assignment requirements
  metadata?: {
    assignmentId?: number
    courseId?: number
    keyPoints?: string[]
    requirements?: string[]
  }
}
```

### Markdown Plan Structure

The master plan markdown should follow this structure:

```markdown
# Assignment Master Plan: [Assignment Name]

## Overview
[Brief description, due date, points, etc.]

## Step 1: Understand the Assignment
### Objectives
- [Objective 1]
- [Objective 2]

### Tasks
- [ ] Task 1
- [ ] Task 2

### Resources
- [Resource 1](url)
- [Resource 2](url)

### Deliverables
- [Deliverable 1]
- [Deliverable 2]

### Success Criteria
- [Criterion 1]
- [Criterion 2]

---

## Step 2: Plan & Break It Down
[Same structure...]

---

## Step 3: Research & Gather Materials
[Same structure...]

---

## Step 4: Drafting Structure
[Same structure...]

---

## Step 5: Revise & Edit
[Same structure...]

---

## Step 6: Final Review & Submission
[Same structure...]

---

## Timeline
- [Date]: Step 1 milestone
- [Date]: Step 2 milestone
...

## Resources
[Comprehensive resource list]

## Progress Tracking
- Step 1: [ ] Pending / [x] In Progress / [x] Completed
- Step 2: [ ] Pending / [x] In Progress / [x] Completed
...
```

## User Flow (MVP)

1. **User starts assignment planning**:

            - Selects "Assignment Plan" mode
            - Attaches Canvas assignment OR describes problem
            - Prompts: "Help me plan this assignment" or "Create a plan for writing an essay on X"

2. **AI generates understanding artifacts** (NEW):

            - Calls `generate_assignment_summary` tool
            - Generates markdown summary of assignment requirements
            - Optionally generates rubric analysis (if rubric exists)
            - Optionally generates course content summary (relevant materials)
            - User can review these artifacts to understand the assignment
            - These artifacts are saved and linked to the master plan

3. **AI generates master plan**:

            - Calls `generate_assignment_plan` tool
            - Uses understanding artifacts as context
            - Creates comprehensive markdown master plan following 6-step methodology
            - Plan includes: breakdown, timeline, resources, success criteria
            - Plan displayed in Plan UI component for approval

4. **User reviews and approves**:

            - Reviews plan in markdown preview OR interactive view
            - Can toggle between views
            - Can modify if needed (edit markdown directly)
            - Clicks "Approve" button

5. **AI provides final output**:

            - Calls `provide_assignment_plan_output` tool
            - Plan rendered in AssignmentPlanUI component
            - User can view as markdown OR interactive UI
            - User can save to Artifactory
            - All understanding artifacts are also saved and linked

6. **Step-by-Step Execution**:

            - User clicks "Start Step 1" or "Get Help with Step X"
            - AI provides step-specific guidance using `execute_assignment_step` tool
            - Guidance is in markdown format
            - User can request draft generation using `generate_step_draft` tool
            - User works on step and can save draft content (markdown)
            - User marks step as complete (updates artifact progress)

7. **Iterative Refinement**:

            - User clicks "Get Feedback" on a step with draft content
            - AI reviews draft using `review_assignment_draft` tool
            - AI provides markdown feedback, suggestions, and rubric alignment
            - User can revise based on feedback
            - Multiple feedback cycles per step (iterative improvement)
            - User can "Discuss with AI" to refine plan or get help

## Success Criteria

### Understanding Phase

- AI generates multiple markdown artifacts to help understand assignment
- Assignment summary provides clear overview of requirements
- Rubric analysis (if available) helps understand grading criteria
- Course content summary identifies relevant materials
- All artifacts are markdown-based and can be viewed/edited

### Plan Generation

- User can generate assignment plans from Canvas assignments
- Plan follows proven 6-step methodology
- Plan is markdown-based with clear structure
- Plan approval workflow works (similar to quiz plan)
- Plans can be saved and viewed as artifacts
- Dual view modes: markdown preview OR interactive UI
- UI is consistent with existing artifact types

### Step-by-Step Execution

- User can request help for any step
- AI provides step-specific guidance, templates, and resources
- User can generate drafts for steps
- Progress is tracked and persisted
- User can mark steps as complete
- Visual progress indicators work correctly

### Iterative Refinement

- User can request feedback on drafts
- AI provides constructive, actionable feedback
- Feedback includes rubric alignment (when available)
- User can revise and request feedback multiple times
- Feedback history is preserved
- Draft content is saved and retrievable

### Integration

- "Discuss with AI" works with assignment plans
- Progress persists across sessions
- Artifact editing API supports plan updates
- All features work seamlessly together

## Step-by-Step Execution Architecture

### Flow Diagram

```
User → "Help me with Step 2" 
  → AI calls execute_assignment_step(stepId: "step-2", planId, progress)
  → AI provides:
 - Step-specific guidance
 - Templates/examples
 - Resources to review
 - Deliverables checklist
  → User can:
 - Request draft generation
 - Work on step
 - Save draft
 - Mark complete
```

### Implementation Details

**Tool: `execute_assignment_step`**

- Purpose: Provide step-specific guidance and help
- Input:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `stepId`: Which step user needs help with
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `planId`: Reference to the assignment plan artifact
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `userProgress`: Current state of all steps
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `userRequest`: Specific question or request (optional)
- Output: Structured guidance including:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Step overview and objectives
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Detailed instructions
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Templates or examples
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Resources to review
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Deliverables checklist
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Next actions

**Tool: `generate_step_draft`**

- Purpose: Generate starting content for a step
- Input:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `stepId`: Which step to generate draft for
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `planContext`: Full plan context
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `userInput`: User's specific requirements or starting point
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `previousSteps`: Content from completed steps (for continuity)
- Output: Draft content that user can refine

**UI Interactions**:

- Step cards show status and action buttons
- Clicking "Get Help" triggers `execute_assignment_step`
- Clicking "Generate Draft" triggers `generate_step_draft`
- Draft editor allows user to write/edit content
- "Save Draft" updates artifact data
- "Mark Complete" updates step status and progress

## Iterative Refinement Architecture

### Flow Diagram

```
User → "Review my draft for Step 2"
  → AI calls review_assignment_draft(stepId, draftContent, planContext, rubric)
  → AI provides:
 - Overall assessment
 - Specific feedback points
 - Improvement suggestions
 - Rubric alignment check
  → User revises draft
  → Can request feedback again (iterative)
```

### Implementation Details

**Tool: `review_assignment_draft`**

- Purpose: Review user's work and provide constructive feedback
- Input:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `stepId`: Which step's draft to review
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `draftContent`: User's current draft
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `planContext`: Full plan for context
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `rubricCriteria`: Assignment rubric (if available)
- Output: Structured feedback including:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Overall assessment (strengths/weaknesses)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Specific feedback points with examples
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Actionable improvement suggestions
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Rubric alignment (how well it meets criteria)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Next steps for improvement

**Feedback Storage**:

- Each step can have multiple feedback entries
- Feedback stored in `step.feedback[]` array
- Each feedback has timestamp, feedback text, suggestions
- UI shows feedback history with most recent first

**UI Interactions**:

- "Get Feedback" button appears when step has draft content
- Feedback displayed in expandable card
- User can revise draft and request feedback again
- Feedback history shows iterative improvement

## Integration with Existing Features

### Leveraging "Discuss with AI"

- Existing `handleDiscussArtifactWithAI` function can be enhanced
- When discussing assignment plan artifact:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - AI has access to full plan context
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Can help with specific steps
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Can refine plan structure
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Can provide general guidance

### Artifact Editing API

- Existing `/api/artifacts/[id]/edit` endpoint can be used
- AI can update plan structure, step content, progress
- Maintains artifact version history

### Progress Persistence

- Progress stored in artifact `artifact_data`
- Updates when:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Step marked complete
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Draft saved
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Feedback received
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - Plan modified
- Allows resuming work across sessions

## Future Enhancements (Post-MVP)

1. **Version history**: Track all revisions and feedback cycles
2. **Template library**: Reusable plan templates for common assignment types
3. **Collaboration**: Share plans with study groups
4. **Export functionality**: Export final drafts to Word/PDF
5. **Integration with Canvas**: Submit assignments directly from app
6. **AI-powered research**: Automatically gather resources for steps
7. **Time tracking**: Track actual time spent vs estimated
8. **Reminders**: Notifications for upcoming milestones

## Files to Create/Modify

### New Files

- `canvas-chatbot-next/src/components/assignment-plan/assignment-plan-ui.tsx`
- `canvas-chatbot-next/src/components/artifacts/EditableAssignmentPlanUI.tsx`
- `canvas-chatbot-next/supabase/migrations/[timestamp]_add_assignment_plan_artifact_type.sql`

### Modified Files

- `canvas-chatbot-next/src/lib/canvas-tools.ts` - Add tools
- `canvas-chatbot-next/src/app/api/chat/route.ts` - Add mode handling
- `canvas-chatbot-next/src/lib/system-prompt-templates.ts` - Add prompt template
- `canvas-chatbot-next/src/components/canvas-tools/tool-renderer.tsx` - Add plan rendering
- `canvas-chatbot-next/src/components/artifacts/ArtifactPanel.tsx` - Add assignment_plan case
- `canvas-chatbot-next/src/app/api/artifacts/route.ts` - Add type validation
- `canvas-chatbot-next/src/app/protected/chat/page.tsx` - Add mode option
- `canvas-chatbot-next/src/lib/mode-colors.ts` - Add colors
- `canvas-chatbot-next/src/app/protected/chat/types.ts` - Add types