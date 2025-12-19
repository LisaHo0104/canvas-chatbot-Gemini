# Product Requirements Document (PRD): Canvas Context Pre-fetching

## 1. Problem Statement
Currently, the AI agent enters the conversation "blind" regarding the user's Canvas data. It does not know which courses the user is enrolled in, what assignments are due, or the structure of their modules until it explicitly calls tools (like `list_courses`). 

This leads to:
*   **Latency:** The agent often has to perform a "discovery" round of tool calls before it can answer a simple question like "What should I work on?".
*   **Redundant Questions:** The agent might ask "Which course are you referring to?" even if the user only has one active course.
*   **Poor UX:** The conversation feels less personalized and "smart".

## 2. Goals
*   **Proactive Awareness:** The agent should know the user's active courses, recent assignments, and key modules *before* the first user message is processed.
*   **Reduced Latency:** Eliminate the initial "tool call round-trip" for basic context gathering.
*   **Improved Relevance:** Enable the agent to give more specific answers immediately (e.g., "You have an assignment due in **Bio 101** tomorrow").

## 3. Technical Strategy

### 3.1. Overview
We will implement a "Context Pre-fetching" mechanism. When the chat application loads, the client will fetch a summary of the user's Canvas data. This summary will then be injected into the AI's **System Prompt** for the conversation.

### 3.2. Data to Pre-fetch
We will fetch a comprehensive "Static Entity Map" to ground user queries. This includes:

1.  **Courses:** List of active courses (ID, Name, Code).
2.  **Course Structure (Per Course):**
    *   **Assignments:** List of all assignment names and IDs (to resolve references like "Assignment 1").
    *   **Modules:** List of module names and IDs (to resolve references like "the Week 1 module").
    *   **Note:** We prioritize *names and IDs* over dynamic details (like specific grades or submission status) to keep the payload lightweight but semantically rich.

### 3.3. Architecture Changes

#### A. New API Endpoint: `/api/canvas/prefetch`
*   **Method:** `GET`
*   **Responsibility:** 
    *   Accepts the user's Canvas session/token.
    *   **Step 1:** Fetch Active Courses.
    *   **Step 2:** In parallel (with concurrency limit), fetch Assignments and Modules for these courses.
    *   **Step 3:** Return a structured "Context Graph".
*   **Output Format:**
    ```json
    {
      "courses": [
        { 
          "id": 101, 
          "name": "Biology 101", 
          "code": "BIO101",
          "assignments": [
             { "id": 505, "name": "Lab Report 1" },
             { "id": 506, "name": "Midterm Essay" }
          ],
          "modules": [
             { "id": 901, "name": "Week 1: Introduction" }
          ]
        }
      ]
    }
    ```

#### B. Frontend Updates (`src/app/protected/chat/page.tsx`)
*   **State:** Add `canvasContext` state.
*   **Effect:** On mount (and successful auth), call `/api/canvas/prefetch`.
*   **UI:** Show a subtle "Syncing Canvas data..." indicator (optional) or just do it in the background.
*   **Transmission:** When calling `useChat`, pass this context. 
    *   *Option 1 (Recommended):* Pass it in the `body` of the `messages` request (using `sendChatMessage({ ... }, { body: { canvasContext } })`).

#### C. Backend Updates (`src/app/api/chat/route.ts`)
*   **Reception:** Read `canvasContext` from the request body.
*   **Injection:** 
    *   Construct a context string: 
        ```text
        [Canvas Context]
        User is enrolled in 3 courses:
        
        1. Biology 101 (BIO101)
           - Assignments: Lab Report 1 (ID:505), Midterm Essay (ID:506)...
           - Modules: Week 1: Introduction (ID:901)...
           
        2. ...
        ```
    *   Append this to the `SYSTEM_PROMPT`.
*   **Result:** The agent can immediately understand "Help me with the Lab Report" refers to `Biology 101` / `ID: 505`.

## 4. User Flow
1.  **User Login:** User logs in and lands on the Chat page.
2.  **Background Sync:** The app silently fetches `/api/canvas/prefetch`.
3.  **User Query:** User types "When is the Lab Report due?".
4.  **AI Response:** The AI sees "Lab Report 1" in the context for Biology 101. It can now:
    *   Answer directly if the due date was pre-fetched (optional).
    *   OR call `get_assignment_details(courseId=101, assignmentId=505)` immediately, skipping the search step.

## 5. Implementation Steps (Guide)
1.  **Create Context Helper:** `src/lib/canvas-context.ts` to fetch Courses + Assignments + Modules in parallel.
2.  **Create API Route:** `/api/canvas/context/route.ts`.
3.  **Update Frontend:** `src/app/protected/chat/page.tsx` to fetch and store this context.
4.  **Update Chat API:** `src/app/api/chat/route.ts` to inject the structured context into the system prompt.
5.  **Verify:** Check that the AI recognizes assignment names without tools.

## 6. Constraints & Risks
*   **Payload Size:** Many courses * many assignments = large prompt. **Mitigation:** Truncate lists to top 20 items per course, or prioritizing active/recent ones.
*   **Rate Limits:** Canvas API rate limits. **Mitigation:** Use `Promise.all` with a concurrency limit (e.g., p-limit) or serial batches.

