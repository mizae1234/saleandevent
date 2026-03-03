-- CreateTable
CREATE TABLE IF NOT EXISTS "password_change_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_id" UUID NOT NULL,
    "change_type" VARCHAR(20) NOT NULL,
    "changed_by_id" UUID,
    "changed_by_name" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_password_change_logs_staff_id" ON "password_change_logs"("staff_id");

-- AddForeignKey
ALTER TABLE "password_change_logs" ADD CONSTRAINT "password_change_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
