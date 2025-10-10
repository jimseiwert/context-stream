-- Migration: Add source metadata for improved search ranking
-- Run this after updating the schema

-- Add new columns to Source table
ALTER TABLE "Source"
ADD COLUMN "tags" TEXT[] DEFAULT '{}',
ADD COLUMN "metadata" JSONB,
ADD COLUMN "quality" INTEGER DEFAULT 50;

-- Create index for tag queries (GIN index for array operations)
CREATE INDEX "idx_source_tags" ON "Source" USING GIN ("tags");

-- Create index for quality sorting
CREATE INDEX "idx_source_quality" ON "Source" ("quality");

-- Auto-tag existing sources based on domain
-- Framework tags
UPDATE "Source"
SET tags = ARRAY['framework:nextjs', 'docs:official']
WHERE domain LIKE '%nextjs.org%';

UPDATE "Source"
SET tags = ARRAY['framework:react', 'docs:official']
WHERE domain LIKE '%react.dev%' OR domain LIKE '%reactjs.org%';

UPDATE "Source"
SET tags = ARRAY['framework:vue', 'docs:official']
WHERE domain LIKE '%vuejs.org%';

UPDATE "Source"
SET tags = ARRAY['framework:angular', 'docs:official']
WHERE domain LIKE '%angular.io%' OR domain LIKE '%angular.dev%';

UPDATE "Source"
SET tags = ARRAY['framework:svelte', 'docs:official']
WHERE domain LIKE '%svelte.dev%';

UPDATE "Source"
SET tags = ARRAY['framework:node', 'docs:official']
WHERE domain LIKE '%nodejs.org%';

UPDATE "Source"
SET tags = ARRAY['framework:express', 'docs:official']
WHERE domain LIKE '%expressjs.com%';

UPDATE "Source"
SET tags = ARRAY['framework:tailwind', 'docs:official']
WHERE domain LIKE '%tailwindcss.com%';

UPDATE "Source"
SET tags = ARRAY['framework:typescript', 'docs:official']
WHERE domain LIKE '%typescriptlang.org%';

UPDATE "Source"
SET tags = ARRAY['framework:python', 'docs:official']
WHERE domain LIKE '%python.org%' OR domain LIKE '%docs.python.org%';

UPDATE "Source"
SET tags = ARRAY['framework:django', 'docs:official']
WHERE domain LIKE '%djangoproject.com%';

UPDATE "Source"
SET tags = ARRAY['framework:flask', 'docs:official']
WHERE domain LIKE '%flask.palletsprojects.com%';

UPDATE "Source"
SET tags = ARRAY['framework:fastapi', 'docs:official']
WHERE domain LIKE '%fastapi.tiangolo.com%';

-- Tag Vercel docs
UPDATE "Source"
SET tags = array_append(tags, 'docs:vercel')
WHERE domain LIKE '%vercel.com%';

-- Tag MDN
UPDATE "Source"
SET tags = ARRAY['docs:mdn', 'docs:official']
WHERE domain LIKE '%developer.mozilla.org%';

-- Set quality scores
-- Official docs get higher quality
UPDATE "Source"
SET quality = 90
WHERE 'docs:official' = ANY(tags);

-- Vercel/high-quality sources
UPDATE "Source"
SET quality = 85
WHERE 'docs:vercel' = ANY(tags);

-- GitHub repos (if any)
UPDATE "Source"
SET quality = 70
WHERE domain LIKE '%github.com%';

-- Default for others
UPDATE "Source"
SET quality = 60
WHERE quality = 50;  -- Only update those not yet set
