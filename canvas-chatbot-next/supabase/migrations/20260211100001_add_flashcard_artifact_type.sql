-- Migration: Add 'flashcard' artifact type to artifacts table
-- Updates the CHECK constraint to allow 'flashcard' as a valid artifact_type.
-- Applies to dev.artifacts (canonical) and public.artifacts if it exists,
-- so it works whether NEXT_PUBLIC_SUPABASE_SCHEMA is 'dev' or 'public'.

-- ============================================================================
-- For each schema (dev, public): if artifacts exists, update artifact_type check
-- ============================================================================

do $$
declare
  sch text;
  qualified_table text;
  conname text;
begin
  foreach sch in array array['dev', 'public']
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = sch and table_name = 'artifacts'
    ) then
      qualified_table := quote_ident(sch) || '.' || quote_ident('artifacts');

      select c.conname into conname
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = sch
        and t.relname = 'artifacts'
        and c.contype = 'c'
        and c.conname like '%artifact_type%'
      limit 1;

      if conname is not null then
        execute format('alter table %s drop constraint %I', qualified_table, conname);
      end if;

      execute format(
        'alter table %s add constraint artifacts_artifact_type_check check (artifact_type in (''quiz'', ''rubric_analysis'', ''note'', ''flashcard''))',
        qualified_table
      );
    end if;
  end loop;
end $$;
