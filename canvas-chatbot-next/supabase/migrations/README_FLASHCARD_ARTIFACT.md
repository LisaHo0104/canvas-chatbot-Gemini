# Why quiz and note save to artifacts but flashcard does not

The `artifacts` table has a **CHECK constraint** on `artifact_type` that only allows values that have been added by migrations:

- Original: `'quiz'`, `'rubric_analysis'`
- Then `'note'` was added (migration `20260124000000_add_note_artifact_type.sql`)
- **`'flashcard'`** is added by `20260211100001_add_flashcard_artifact_type.sql`

If that flashcard migration has **not** been applied to your database, inserts with `artifact_type = 'flashcard'` fail with a constraint violation. Quiz and note work because their migrations were already applied.

## Fix: apply the flashcard migration

**Option A – Supabase CLI**

```bash
cd canvas-chatbot-next
supabase db push
```

Or run pending migrations only:

```bash
supabase migration up
```

**Option B – Supabase Dashboard (SQL Editor)**

1. Open your project → **SQL Editor**.
2. Paste and run the contents of `20260211100001_add_flashcard_artifact_type.sql`.

The migration updates the constraint in both `dev` and `public` (for the schema where your `artifacts` table lives), so it works whether `NEXT_PUBLIC_SUPABASE_SCHEMA` is `dev` or `public`.

After the migration is applied, saving flashcards to artifacts will work.
