-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'HANDOVER_PIN_READY';
ALTER TYPE "NotificationType" ADD VALUE 'HANDOVER_CONFIRMED';

-- AlterTable
ALTER TABLE "rentals" ADD COLUMN     "handoverPinAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "handoverPinCreatedAt" TIMESTAMP(3),
ADD COLUMN     "handoverPinEnc" TEXT,
ADD COLUMN     "handoverPinHash" TEXT,
ADD COLUMN     "handoverPinLockedUntil" TIMESTAMP(3),
ADD COLUMN     "handoverVerifiedAt" TIMESTAMP(3);
