## Goal
Create two AI SDK tools that the model can call:
1) `get_assignment_grade` → returns the user’s grade/score for a specific assignment
2) `get_assignment_feedback_and_rubric` → returns submission comments and rubric assessment for that assignment

## Where to Integrate
- Define both tools in `src/lib/canvas-tools.ts` inside `createCanvasTools(...)` so they are available to `src/app/api/chat/route.ts` via the existing `tools` wiring.
- Extend `CanvasAPIService` in `src/lib/canvas-api.ts` to add the needed Canvas API endpoints.

## Canvas API Calls
- Grade & feedback are provided via Canvas Submissions:
  - `GET /courses/{courseId}/assignments/{assignmentId}/submissions/{userId}`
  - Include parameters for details:
    - `include[]=rubric_assessment`
    - `include[]=submission_comments`
- Points possible comes from the assignment:
  - `GET /courses/{courseId}/assignments/{assignmentId}`

## API Service Additions (`src/lib/canvas-api.ts`)
- Add a `CanvasSubmission` type capturing fields: `id`, `user_id`, `grade`, `score`, `graded_at`, `workflow_state`, `submitted_at`, `late`, optional `rubric_assessment`, `submission_comments`.
- Add `getAssignment(courseId: number, assignmentId: number)` → fetches a single assignment, returns `CanvasAssignment`.
- Add `getAssignmentSubmission(courseId: number, assignmentId: number, options?: { userId?: number; includeRubric?: boolean; includeComments?: boolean })`:
  - If `userId` is omitted, call `getCurrentUser()` to resolve `self.id`.
  - Build `include` array from booleans.
  - Perform `GET /courses/{cid}/assignments/{aid}/submissions/{uid}`.
  - Return `CanvasSubmission`.

## Tool Definitions (`src/lib/canvas-tools.ts`)
- `get_assignment_grade`:
  - description: "Get grade and score for an assignment"
  - inputSchema: `{ courseId: z.number(), assignmentId: z.number(), userId?: z.number().optional() }`
  - outputSchema: `{ grade: z.string().nullable(), score: z.number().nullable(), pointsPossible: z.number().nullable(), gradedAt: z.string().nullable(), workflowState: z.string(), submittedAt: z.string().nullable() }`
  - execute:
    - Call `api.getAssignmentSubmission(courseId, assignmentId, { userId })`.
    - Call `api.getAssignment(courseId, assignmentId)` to read `points_possible`.
    - Return combined object.

- `get_assignment_feedback_and_rubric`:
  - description: "Get submission comments and rubric assessment for an assignment"
  - inputSchema: `{ courseId: z.number(), assignmentId: z.number(), userId?: z.number().optional() }`
  - outputSchema: `{ rubricAssessment: z.any().nullable(), submissionComments: z.array(z.object({ author_id: z.number(), comment: z.string(), created_at: z.string() })).optional(), grade: z.string().nullable(), score: z.number().nullable() }`
  - execute:
    - Call `api.getAssignmentSubmission(courseId, assignmentId, { userId, includeRubric: true, includeComments: true })`.
    - Return `rubric_assessment` and `submission_comments` plus `grade`/`score` for context.

## Route Usage (`src/app/api/chat/route.ts`)
- No structural changes: the file already passes `tools` from `createCanvasTools(...)` into `streamText` (`tools` at around line 203).
- The model can now choose these tools via `toolChoice: 'auto'` as with others.

## Error Handling
- If submission is not found or grade is not posted, return `grade: null`/`score: null` with a consistent shape.
- Propagate Canvas errors with informative messages including status codes when available (same pattern as `getAssignments`).

## Tests
- Add tests in `src/lib/__tests__/canvas-api.test.ts` to:
  - Validate request URL and params for `getAssignment` and `getAssignmentSubmission`.
  - Mock axios responses for rubric/comments.
- Add tests in `src/lib/__tests__/canvas-tools.test.ts` to:
  - Ensure tools call service methods with correct inputs and return expected shapes.

## Example Calls (LLM-side)
- Grade:
  - name: `get_assignment_grade`
  - arguments: `{ "courseId": 123, "assignmentId": 456 }`
- Feedback & rubric:
  - name: `get_assignment_feedback_and_rubric`
  - arguments: `{ "courseId": 123, "assignmentId": 456 }`

## Notes on AI SDK Tool Definition
- Use `tool({ description, inputSchema, execute, outputSchema })`.
- `outputSchema` improves validation and typed responses for downstream usage.
- Keep input IDs numeric to match existing service methods and types.
