-- Add ui_parts to store full UIMessage parts and remove legacy content
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS ui_parts JSONB DEFAULT '[]'::jsonb;

-- Backfill ui_parts from existing metadata.parts when available
UPDATE public.chat_messages
SET ui_parts = metadata->'parts'
WHERE metadata ? 'parts';

-- Fallback: derive ui_parts from legacy content if still empty
UPDATE public.chat_messages
SET ui_parts = jsonb_build_array(jsonb_build_object('type','text','text',content))
WHERE (ui_parts IS NULL OR ui_parts = '[]'::jsonb) AND content IS NOT NULL;

-- Ensure ui_parts is not null going forward
ALTER TABLE public.chat_messages
  ALTER COLUMN ui_parts SET NOT NULL;

-- Drop legacy content column now that ui_parts is authoritative
ALTER TABLE public.chat_messages
  DROP COLUMN IF EXISTS content;

