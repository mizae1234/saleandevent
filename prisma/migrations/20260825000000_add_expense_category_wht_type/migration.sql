-- AlterTable: Add wht_type column to expense_categories
ALTER TABLE "expense_categories" ADD COLUMN IF NOT EXISTS "wht_type" VARCHAR(20) NOT NULL DEFAULT 'none';

-- Update existing default categories
UPDATE "expense_categories" SET "wht_type" = '40_1' WHERE "name" IN ('ค่าลงงาน', 'ค่าเก็บงาน');
UPDATE "expense_categories" SET "wht_type" = '40_2' WHERE "name" IN ('ค่าเป้า');
UPDATE "expense_categories" SET "wht_type" = 'none' WHERE "wht_type" IS NULL;
