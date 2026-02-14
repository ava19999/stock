-- Migration: Ensure foto.part_number has UNIQUE index for ON CONFLICT
-- Date: 2026-02-14
-- Why: Supabase upsert(..., { onConflict: 'part_number' }) requires UNIQUE/EXCLUSION constraint

-- 1) Normalize part_number values
UPDATE foto
SET part_number = TRIM(part_number)
WHERE part_number IS NOT NULL;

-- 2) Remove duplicate rows, keep newest id for same part_number
DELETE FROM foto f_old
USING foto f_new
WHERE f_old.part_number = f_new.part_number
  AND f_old.id < f_new.id;

-- 3) Ensure unique index exists (required for ON CONFLICT part_number)
CREATE UNIQUE INDEX IF NOT EXISTS idx_foto_part_number_unique
ON foto(part_number);

