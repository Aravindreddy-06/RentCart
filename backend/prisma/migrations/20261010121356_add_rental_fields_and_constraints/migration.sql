/*
  Warnings:

  - Added the required column `totalPrice` to the `rentals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `rentals` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "rentals" ADD COLUMN     "borrowerNote" TEXT,
ADD COLUMN     "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "ownerNote" TEXT,
ADD COLUMN     "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "startDate" SET DATA TYPE DATE,
ALTER COLUMN "endDate" SET DATA TYPE DATE;

-- Check constraint: endDate must be on or after startDate
ALTER TABLE "rentals"
ADD CONSTRAINT "rentals_end_date_check"
CHECK ("endDate" >= "startDate");

-- Enable btree_gist extension for combining scalar and range types in exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Exclusion constraint to prevent overlapping APPROVED or ACTIVE rentals for the same item
ALTER TABLE "rentals"
ADD CONSTRAINT "no_overlapping_approved_or_active_rentals"
EXCLUDE USING gist (
  "itemId" WITH =,
  daterange("startDate", "endDate", '[]') WITH &&
)
WHERE ("status" = 'APPROVED' OR "status" = 'ACTIVE');
