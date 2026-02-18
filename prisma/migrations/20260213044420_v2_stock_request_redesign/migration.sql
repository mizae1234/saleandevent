/*
  Warnings:

  - You are about to drop the column `received_at` on the `stock_requests` table. All the data in the column will be lost.
  - You are about to drop the column `shipment_provider` on the `stock_requests` table. All the data in the column will be lost.
  - You are about to drop the column `shipped_at` on the `stock_requests` table. All the data in the column will be lost.
  - You are about to drop the column `tracking_no` on the `stock_requests` table. All the data in the column will be lost.
  - The `approved_by` column on the `stock_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `rejected_by` column on the `stock_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `delivery_notes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stock_request_items` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `requested_total_quantity` to the `stock_requests` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "delivery_notes" DROP CONSTRAINT "delivery_notes_channel_id_fkey";

-- DropForeignKey
ALTER TABLE "delivery_notes" DROP CONSTRAINT "delivery_notes_stock_request_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_request_items" DROP CONSTRAINT "stock_request_items_barcode_fkey";

-- DropForeignKey
ALTER TABLE "stock_request_items" DROP CONSTRAINT "stock_request_items_request_id_fkey";

-- AlterTable
ALTER TABLE "sales_channels" ADD COLUMN     "sales_target" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "reference_id" UUID;

-- AlterTable
ALTER TABLE "stock_requests" DROP COLUMN "received_at",
DROP COLUMN "shipment_provider",
DROP COLUMN "shipped_at",
DROP COLUMN "tracking_no",
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "request_type" VARCHAR(20) NOT NULL DEFAULT 'INITIAL',
ADD COLUMN     "requested_total_quantity" INTEGER NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'draft',
DROP COLUMN "approved_by",
ADD COLUMN     "approved_by" UUID,
DROP COLUMN "rejected_by",
ADD COLUMN     "rejected_by" UUID;

-- DropTable
DROP TABLE "delivery_notes";

-- DropTable
DROP TABLE "stock_request_items";

-- CreateTable
CREATE TABLE "warehouse_allocations" (
    "id" UUID NOT NULL,
    "stock_request_id" UUID NOT NULL,
    "barcode" VARCHAR(50) NOT NULL,
    "size" VARCHAR(20),
    "packed_quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "warehouse_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "stock_request_id" UUID NOT NULL,
    "provider" VARCHAR(100),
    "tracking_number" VARCHAR(100),
    "packed_total_quantity" INTEGER NOT NULL,
    "shipped_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivings" (
    "id" UUID NOT NULL,
    "stock_request_id" UUID NOT NULL,
    "received_total_quantity" INTEGER NOT NULL,
    "received_by" UUID,
    "received_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "receivings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receiving_items" (
    "id" UUID NOT NULL,
    "receiving_id" UUID NOT NULL,
    "barcode" VARCHAR(50) NOT NULL,
    "allocated_quantity" INTEGER NOT NULL,
    "received_quantity" INTEGER NOT NULL,
    "difference_quantity" INTEGER NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "receiving_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warehouse_allocations_stock_request_id_idx" ON "warehouse_allocations"("stock_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_stock_request_id_key" ON "shipments"("stock_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "receivings_stock_request_id_key" ON "receivings"("stock_request_id");

-- CreateIndex
CREATE INDEX "receiving_items_receiving_id_idx" ON "receiving_items"("receiving_id");

-- CreateIndex
CREATE INDEX "stock_requests_status_idx" ON "stock_requests"("status");

-- AddForeignKey
ALTER TABLE "warehouse_allocations" ADD CONSTRAINT "warehouse_allocations_stock_request_id_fkey" FOREIGN KEY ("stock_request_id") REFERENCES "stock_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_allocations" ADD CONSTRAINT "warehouse_allocations_barcode_fkey" FOREIGN KEY ("barcode") REFERENCES "products"("barcode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_stock_request_id_fkey" FOREIGN KEY ("stock_request_id") REFERENCES "stock_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivings" ADD CONSTRAINT "receivings_stock_request_id_fkey" FOREIGN KEY ("stock_request_id") REFERENCES "stock_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_receiving_id_fkey" FOREIGN KEY ("receiving_id") REFERENCES "receivings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_barcode_fkey" FOREIGN KEY ("barcode") REFERENCES "products"("barcode") ON DELETE RESTRICT ON UPDATE CASCADE;
