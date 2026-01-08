-- Full-text Search Migration for MindMapper
-- Adds tsvector columns and GIN indexes for efficient PostgreSQL full-text search
-- Supports weighted search with configurable ranking

-- ==========================================
-- MindMap Full-Text Search
-- ==========================================

-- Add search vector column to MindMap
-- Weight A = title (highest priority), Weight B = description
ALTER TABLE "MindMap" ADD COLUMN "searchVector" TSVECTOR;

-- Create GIN index for fast full-text search on MindMap
CREATE INDEX "MindMap_searchVector_idx" ON "MindMap" USING GIN("searchVector");

-- Create function to update MindMap search vector
CREATE OR REPLACE FUNCTION update_mindmap_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
CREATE TRIGGER mindmap_search_vector_trigger
BEFORE INSERT OR UPDATE OF title, description ON "MindMap"
FOR EACH ROW
EXECUTE FUNCTION update_mindmap_search_vector();

-- Populate existing MindMap records with search vectors
UPDATE "MindMap" SET "searchVector" =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B');

-- ==========================================
-- Node Full-Text Search
-- ==========================================

-- Add search vector column to Node
-- Weight A = text content (primary searchable field)
ALTER TABLE "Node" ADD COLUMN "searchVector" TSVECTOR;

-- Create GIN index for fast full-text search on Node
CREATE INDEX "Node_searchVector_idx" ON "Node" USING GIN("searchVector");

-- Create function to update Node search vector
CREATE OR REPLACE FUNCTION update_node_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" := to_tsvector('english', COALESCE(NEW.text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
CREATE TRIGGER node_search_vector_trigger
BEFORE INSERT OR UPDATE OF text ON "Node"
FOR EACH ROW
EXECUTE FUNCTION update_node_search_vector();

-- Populate existing Node records with search vectors
UPDATE "Node" SET "searchVector" = to_tsvector('english', COALESCE(text, ''));

-- ==========================================
-- Connection Full-Text Search (for labels)
-- ==========================================

-- Add search vector column to Connection
ALTER TABLE "Connection" ADD COLUMN "searchVector" TSVECTOR;

-- Create GIN index for fast full-text search on Connection labels
CREATE INDEX "Connection_searchVector_idx" ON "Connection" USING GIN("searchVector");

-- Create function to update Connection search vector
CREATE OR REPLACE FUNCTION update_connection_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" := to_tsvector('english', COALESCE(NEW.label, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
CREATE TRIGGER connection_search_vector_trigger
BEFORE INSERT OR UPDATE OF label ON "Connection"
FOR EACH ROW
EXECUTE FUNCTION update_connection_search_vector();

-- Populate existing Connection records with search vectors
UPDATE "Connection" SET "searchVector" = to_tsvector('english', COALESCE(label, ''));

-- ==========================================
-- Person Full-Text Search (Family Trees)
-- ==========================================

-- Add search vector column to Person
-- Weight A = names (highest priority)
-- Weight B = nickname, occupation
-- Weight C = biography, education
ALTER TABLE "Person" ADD COLUMN "searchVector" TSVECTOR;

-- Create GIN index for fast full-text search on Person
CREATE INDEX "Person_searchVector_idx" ON "Person" USING GIN("searchVector");

-- Create function to update Person search vector
CREATE OR REPLACE FUNCTION update_person_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english',
      COALESCE(NEW."firstName", '') || ' ' ||
      COALESCE(NEW."middleName", '') || ' ' ||
      COALESCE(NEW."lastName", '') || ' ' ||
      COALESCE(NEW."maidenName", '')
    ), 'A') ||
    setweight(to_tsvector('english',
      COALESCE(NEW.nickname, '') || ' ' ||
      COALESCE(NEW.occupation, '')
    ), 'B') ||
    setweight(to_tsvector('english',
      COALESCE(NEW.biography, '') || ' ' ||
      COALESCE(NEW.education, '')
    ), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
CREATE TRIGGER person_search_vector_trigger
BEFORE INSERT OR UPDATE OF "firstName", "middleName", "lastName", "maidenName", nickname, occupation, biography, education ON "Person"
FOR EACH ROW
EXECUTE FUNCTION update_person_search_vector();

-- Populate existing Person records with search vectors
UPDATE "Person" SET "searchVector" =
  setweight(to_tsvector('english',
    COALESCE("firstName", '') || ' ' ||
    COALESCE("middleName", '') || ' ' ||
    COALESCE("lastName", '') || ' ' ||
    COALESCE("maidenName", '')
  ), 'A') ||
  setweight(to_tsvector('english',
    COALESCE(nickname, '') || ' ' ||
    COALESCE(occupation, '')
  ), 'B') ||
  setweight(to_tsvector('english',
    COALESCE(biography, '') || ' ' ||
    COALESCE(education, '')
  ), 'C');

-- ==========================================
-- FamilyStory Full-Text Search
-- ==========================================

-- Add search vector column to FamilyStory
-- Weight A = title (highest priority)
-- Weight B = content
ALTER TABLE "FamilyStory" ADD COLUMN "searchVector" TSVECTOR;

-- Create GIN index for fast full-text search on FamilyStory
CREATE INDEX "FamilyStory_searchVector_idx" ON "FamilyStory" USING GIN("searchVector");

-- Create function to update FamilyStory search vector
CREATE OR REPLACE FUNCTION update_familystory_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
CREATE TRIGGER familystory_search_vector_trigger
BEFORE INSERT OR UPDATE OF title, content ON "FamilyStory"
FOR EACH ROW
EXECUTE FUNCTION update_familystory_search_vector();

-- Populate existing FamilyStory records with search vectors
UPDATE "FamilyStory" SET "searchVector" =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B');

-- ==========================================
-- SourceDocument Full-Text Search
-- ==========================================

-- Add search vector column to SourceDocument
-- Weight A = title (highest priority)
-- Weight B = description
-- Weight C = ocrText (OCR extracted text)
ALTER TABLE "SourceDocument" ADD COLUMN "searchVector" TSVECTOR;

-- Create GIN index for fast full-text search on SourceDocument
CREATE INDEX "SourceDocument_searchVector_idx" ON "SourceDocument" USING GIN("searchVector");

-- Create function to update SourceDocument search vector
CREATE OR REPLACE FUNCTION update_sourcedocument_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW."ocrText", '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
CREATE TRIGGER sourcedocument_search_vector_trigger
BEFORE INSERT OR UPDATE OF title, description, "ocrText" ON "SourceDocument"
FOR EACH ROW
EXECUTE FUNCTION update_sourcedocument_search_vector();

-- Populate existing SourceDocument records with search vectors
UPDATE "SourceDocument" SET "searchVector" =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE("ocrText", '')), 'C');

-- ==========================================
-- Comment Full-Text Search
-- ==========================================

-- Add search vector column to Comment
ALTER TABLE "Comment" ADD COLUMN "searchVector" TSVECTOR;

-- Create GIN index for fast full-text search on Comment
CREATE INDEX "Comment_searchVector_idx" ON "Comment" USING GIN("searchVector");

-- Create function to update Comment search vector
CREATE OR REPLACE FUNCTION update_comment_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" := to_tsvector('english', COALESCE(NEW.text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
CREATE TRIGGER comment_search_vector_trigger
BEFORE INSERT OR UPDATE OF text ON "Comment"
FOR EACH ROW
EXECUTE FUNCTION update_comment_search_vector();

-- Populate existing Comment records with search vectors
UPDATE "Comment" SET "searchVector" = to_tsvector('english', COALESCE(text, ''));

-- ==========================================
-- Utility Functions for Full-Text Search
-- ==========================================

-- Function to create a tsquery from a search string with prefix matching
-- Supports partial word matching for autocomplete-style search
CREATE OR REPLACE FUNCTION create_search_query(search_text TEXT)
RETURNS TSQUERY AS $$
DECLARE
  words TEXT[];
  word TEXT;
  query TEXT := '';
BEGIN
  -- Split by spaces and filter empty strings
  words := regexp_split_to_array(trim(search_text), '\s+');

  FOREACH word IN ARRAY words LOOP
    IF word != '' THEN
      IF query != '' THEN
        query := query || ' & ';
      END IF;
      -- Add :* for prefix matching on all words
      query := query || word || ':*';
    END IF;
  END LOOP;

  IF query = '' THEN
    RETURN NULL;
  END IF;

  RETURN to_tsquery('english', query);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to highlight search results with custom markers
CREATE OR REPLACE FUNCTION highlight_search_result(
  content TEXT,
  search_query TSQUERY,
  max_words INT DEFAULT 35,
  start_sel TEXT DEFAULT '<mark>',
  stop_sel TEXT DEFAULT '</mark>'
)
RETURNS TEXT AS $$
BEGIN
  IF search_query IS NULL OR content IS NULL OR content = '' THEN
    RETURN content;
  END IF;

  RETURN ts_headline('english', content, search_query,
    'MaxWords=' || max_words ||
    ', MinWords=15' ||
    ', StartSel=' || start_sel ||
    ', StopSel=' || stop_sel ||
    ', HighlightAll=false'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
