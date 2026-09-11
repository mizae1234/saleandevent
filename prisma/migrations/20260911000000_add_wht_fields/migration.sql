-- AlterTable: Add WHT (withholding tax) fields to channel_staff
-- These are SAFE additions with defaults — no existing data is affected

ALTER TABLE "channel_staff" ADD COLUMN IF NOT EXISTS "wht_issued" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "channel_staff" ADD COLUMN IF NOT EXISTS "wht_doc_no" VARCHAR(50);
ALTER TABLE "channel_staff" ADD COLUMN IF NOT EXISTS "wht_paid_date" DATE;
