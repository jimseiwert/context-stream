-- AlterEnum: Remove CONFLUENCE and CUSTOM from SourceType enum
-- This migration removes unused source types that were never implemented

-- Step 1: Create new enum type without CONFLUENCE and CUSTOM
CREATE TYPE "SourceType_new" AS ENUM ('WEBSITE', 'GITHUB');

-- Step 2: Alter the Source table to use the new enum type
ALTER TABLE "Source" ALTER COLUMN "type" TYPE "SourceType_new"
  USING ("type"::text::"SourceType_new");

-- Step 3: Drop the old enum type
DROP TYPE "SourceType";

-- Step 4: Rename the new enum type to the original name
ALTER TYPE "SourceType_new" RENAME TO "SourceType";
