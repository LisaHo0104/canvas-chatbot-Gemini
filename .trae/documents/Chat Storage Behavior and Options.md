## What I Found
- Supabase persists chats in two tables:
  - `chat_sessions`: created per user and updated with titles and `last_message_at` (supabase/migrations/20241122000000_initial_schema.sql:18–25).
  - `chat_messages`: each message row captures `session_id`, `user_id`, `role`, `content`, `metadata` (supabase/migrations/20241122000000_initial_schema.sql:28–36).
- Server inserts messages only when a real `X-Session-ID` is provided (not `default`) and updates the session title when needed (src/app/api/chat/route.ts:195–256).
- Client fetches sessions for the logged-in user (src/app/protected/chat/page.tsx:429–447) and loads messages for the selected session (src/app/protected/chat/page.tsx:552–557). Titles are updated client-side and persisted (src/app/protected/chat/page.tsx:256–263).
- Local storage is used for preferences and pointers, not full conversations:
  - `preferredModel` (src/app/protected/chat/page.tsx:344–346, 397–399).
  - `currentSessionId` (src/app/protected/chat/page.tsx:458–459, 493–496, 516–517, 579–582, 588–591, 602–605).
  - Canvas token/url (src/app/protected/chat/page.tsx:324–327, 625–631).
- Ephemeral chats (“no session”) are not persisted to Supabase; history exists only in memory.

## Recommended Options (if you want changes)
1. Add optional local caching of the last N conversations (e.g., IndexedDB) for offline resume.
2. Add a setting to choose between “Persist sessions to Supabase” vs “Ephemeral only”.
3. Add retention controls (e.g., auto-archive/prune old sessions) and server-side limits per user.

If you want any of these, I’ll implement them next.