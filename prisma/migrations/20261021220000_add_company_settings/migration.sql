-- CreateTable: Add company_settings table for store/company profile
-- This is a SAFE addition of a new table — no existing tables or data are affected

CREATE TABLE IF NOT EXISTS "company_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255),
    "tax_id" VARCHAR(30),
    "branch_name" VARCHAR(100) DEFAULT 'สำนักงานใหญ่',
    "branch_code" VARCHAR(20) DEFAULT '00000',
    "address" TEXT,
    "phone" VARCHAR(50),
    "email" VARCHAR(100),
    "website" VARCHAR(255),
    "logo_url" TEXT,
    "bank_name" VARCHAR(100),
    "bank_account_no" VARCHAR(50),
    "bank_account_name" VARCHAR(255),
    "footer_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- Seed initial company record if table is empty
INSERT INTO "company_settings" (
    "id",
    "name",
    "tax_id",
    "branch_name",
    "branch_code",
    "address",
    "phone",
    "logo_url"
)
SELECT 
    gen_random_uuid(),
    'บริษัท สวยไม่ไหว 2020 จำกัด',
    '0105563046582',
    'สำนักงานใหญ่',
    '00000',
    '5/204 ถนนเทศบาลสงเคราะห์ แขวงลาดยาว เขตจตุจักร จังหวัดกรุงเทพมหานคร',
    '',
    ''
WHERE NOT EXISTS (SELECT 1 FROM "company_settings");
