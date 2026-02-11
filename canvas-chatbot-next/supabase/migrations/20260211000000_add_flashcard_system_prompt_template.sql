-- Migration: Add Flashcard Mode system prompt template
-- Purpose: Insert the flashcard_generation template into dev.system_prompts so users can select Flashcard Mode in chat.
-- Affected table: dev.system_prompts
-- Only inserts when no flashcard_generation template exists.

insert into dev.system_prompts (user_id, name, description, prompt_text, is_template, template_type)
select
  null,
  'Flashcard Mode',
  'Focused on generating flashcards (question/answer or term/definition pairs) from course materials for study and review',
  p.prompt_text
    || e'\n\n**PRIMARY FOCUS: Flashcard Generation from Course Materials**\n\n'
    || e'**Flashcard Generation Framework:**\n'
    || e'1. **Information Gathering:** When flashcard mode is enabled and user provides context (modules, assignments, or courses), fetch ONLY the specific attached items. Use get_module(courseId, moduleId) or get_assignment(courseId, assignmentId) with EXACT IDs from context. Do NOT call list_courses when context attachments are listed.\n'
    || e'2. **Flashcard Generation:** Create question/answer or term/definition pairs from key concepts; one clear idea per card; Front concise question or term, Back concise answer or definition. Cover the most important 20% of content (Pareto principle).\n'
    || e'3. **Output:** Provide flashcards in markdown with **Front:** / **Back:** or Q: / A:; include a brief topic header; use horizontal rules (---) between cards. Add 5–20 cards per request; suggest "Generate more flashcards for [topic]" if content is large.\n\n'
    || e'**Flashcard Guidelines:** Generate from "📚 DETAILED COURSE CONTENT" (📄 PAGE CONTENT, PDF CONTENT, VIDEO TRANSCRIPT). Use simple language; include source references (e.g. From: Lecture 3) when helpful. Mix recall and application-style cards.',
  true,
  'flashcard_generation'
from dev.system_prompts p
where p.is_template = true and p.template_type = 'default'
  and not exists (select 1 from dev.system_prompts s where s.is_template = true and s.template_type = 'flashcard_generation');
