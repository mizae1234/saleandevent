-- Change canViewSalary from boolean to salaryAccess string
ALTER TABLE "staff" ADD COLUMN "salary_access" VARCHAR(20);
-- Migrate existing data
UPDATE "staff" SET "salary_access" = 'all' WHERE "can_view_salary" = true;
-- Drop old column
ALTER TABLE "staff" DROP COLUMN IF EXISTS "can_view_salary";
