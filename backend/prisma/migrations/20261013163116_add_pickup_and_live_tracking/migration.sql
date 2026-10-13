-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PICKUP_LOCATION_SHARED';
ALTER TYPE "NotificationType" ADD VALUE 'BORROWER_ON_THE_WAY';
ALTER TYPE "NotificationType" ADD VALUE 'BORROWER_ARRIVED';

-- AlterTable
ALTER TABLE "rentals" ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "pickupLatitude" DOUBLE PRECISION,
ADD COLUMN     "pickupLongitude" DOUBLE PRECISION,
ADD COLUMN     "pickupNote" TEXT,
ADD COLUMN     "pickupTimeFrom" TIMESTAMP(3),
ADD COLUMN     "pickupTimeTo" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "live_locations" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "heading" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),

    CONSTRAINT "live_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "live_locations_rentalId_key" ON "live_locations"("rentalId");

-- CreateIndex
CREATE INDEX "live_locations_rentalId_idx" ON "live_locations"("rentalId");

-- CreateIndex
CREATE INDEX "live_locations_userId_idx" ON "live_locations"("userId");

-- AddForeignKey
ALTER TABLE "live_locations" ADD CONSTRAINT "live_locations_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_locations" ADD CONSTRAINT "live_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
