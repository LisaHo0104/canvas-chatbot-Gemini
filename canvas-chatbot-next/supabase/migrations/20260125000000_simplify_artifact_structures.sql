-- Migration: Simplify artifact data structures
-- This migration removes unnecessary/redundant fields from note and rubric_analysis artifacts

-- ============================================================================
-- STEP 1: Simplify Note artifacts
-- ============================================================================

-- Remove summary, successCriteria, practiceQuestions, metadata fields, and sections.keyPoints
UPDATE dev.artifacts
SET artifact_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      artifact_data - 'summary' - 'successCriteria' - 'practiceQuestions' - 'metadata',
      '{sections}',
      (
        SELECT jsonb_agg(
          section - 'keyPoints'
        )
        FROM jsonb_array_elements(artifact_data->'sections') AS section
      )
    ),
    '{sections}',
    COALESCE(
      (
        SELECT jsonb_agg(
          section - 'keyPoints'
        )
        FROM jsonb_array_elements(artifact_data->'sections') AS section
      ),
      '[]'::jsonb
    )
  ),
  '{sections}',
  COALESCE(
    (
      SELECT jsonb_agg(
        section - 'keyPoints'
      )
      FROM jsonb_array_elements(artifact_data->'sections') AS section
    ),
    '[]'::jsonb
  )
)
WHERE artifact_type = 'note'
  AND artifact_data IS NOT NULL;

-- Simplified version using a function for better readability
DO $$
DECLARE
  artifact_record RECORD;
  simplified_data JSONB;
  sections_array JSONB;
  section_item JSONB;
  cleaned_sections JSONB := '[]'::jsonb;
BEGIN
  FOR artifact_record IN 
    SELECT id, artifact_data 
    FROM dev.artifacts 
    WHERE artifact_type = 'note' 
      AND artifact_data IS NOT NULL
  LOOP
    simplified_data := artifact_record.artifact_data;
    
    -- Remove top-level fields
    simplified_data := simplified_data - 'summary';
    simplified_data := simplified_data - 'successCriteria';
    simplified_data := simplified_data - 'practiceQuestions';
    simplified_data := simplified_data - 'metadata';
    
    -- Clean sections array - remove keyPoints from each section
    IF simplified_data ? 'sections' AND jsonb_typeof(simplified_data->'sections') = 'array' THEN
      sections_array := simplified_data->'sections';
      cleaned_sections := '[]'::jsonb;
      
      FOR section_item IN SELECT * FROM jsonb_array_elements(sections_array)
      LOOP
        cleaned_sections := cleaned_sections || jsonb_build_array(section_item - 'keyPoints');
      END LOOP;
      
      simplified_data := jsonb_set(simplified_data, '{sections}', cleaned_sections);
    END IF;
    
    -- Update the artifact
    UPDATE dev.artifacts
    SET artifact_data = simplified_data
    WHERE id = artifact_record.id;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Simplify Rubric Analysis artifacts
-- ============================================================================

-- Remove criteria[].plainEnglishExplanation, criteria[].actionItems, criteria[].scoringTips
-- Remove scoringBreakdown, summary.keyRequirements, summary.gradeStrategy
DO $$
DECLARE
  artifact_record RECORD;
  simplified_data JSONB;
  criteria_array JSONB;
  criterion_item JSONB;
  cleaned_criteria JSONB := '[]'::jsonb;
  summary_obj JSONB;
BEGIN
  FOR artifact_record IN 
    SELECT id, artifact_data 
    FROM dev.artifacts 
    WHERE artifact_type = 'rubric_analysis' 
      AND artifact_data IS NOT NULL
  LOOP
    simplified_data := artifact_record.artifact_data;
    
    -- Remove top-level scoringBreakdown
    simplified_data := simplified_data - 'scoringBreakdown';
    
    -- Clean summary - remove keyRequirements and gradeStrategy, keep overview and howToGetHD
    IF simplified_data ? 'summary' AND jsonb_typeof(simplified_data->'summary') = 'object' THEN
      summary_obj := simplified_data->'summary';
      summary_obj := summary_obj - 'keyRequirements';
      summary_obj := summary_obj - 'gradeStrategy';
      -- Ensure overview and howToGetHD exist (howToGetHD might be optional in old data)
      IF NOT (summary_obj ? 'overview') THEN
        summary_obj := jsonb_set(summary_obj, '{overview}', '""'::jsonb);
      END IF;
      IF NOT (summary_obj ? 'howToGetHD') THEN
        summary_obj := jsonb_set(summary_obj, '{howToGetHD}', '""'::jsonb);
      END IF;
      simplified_data := jsonb_set(simplified_data, '{summary}', summary_obj);
    END IF;
    
    -- Clean criteria array - remove plainEnglishExplanation, actionItems, scoringTips
    IF simplified_data ? 'criteria' AND jsonb_typeof(simplified_data->'criteria') = 'array' THEN
      criteria_array := simplified_data->'criteria';
      cleaned_criteria := '[]'::jsonb;
      
      FOR criterion_item IN SELECT * FROM jsonb_array_elements(criteria_array)
      LOOP
        cleaned_criteria := cleaned_criteria || jsonb_build_array(
          criterion_item - 'plainEnglishExplanation' - 'actionItems' - 'scoringTips'
        );
      END LOOP;
      
      simplified_data := jsonb_set(simplified_data, '{criteria}', cleaned_criteria);
    END IF;
    
    -- Update the artifact
    UPDATE dev.artifacts
    SET artifact_data = simplified_data
    WHERE id = artifact_record.id;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN dev.artifacts.artifact_data IS 'JSONB data for artifacts. Structure varies by type:
- quiz: QuizOutput with title, questions, etc.
- rubric_analysis: Simplified RubricAnalysisOutput (no scoringBreakdown, simplified criteria)
- note: Simplified NoteOutput (no summary, successCriteria, practiceQuestions, metadata, sections.keyPoints)';
