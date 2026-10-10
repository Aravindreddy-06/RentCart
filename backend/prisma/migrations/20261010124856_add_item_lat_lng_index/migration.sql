-- AlterTable
ALTER TABLE "rentals" ALTER COLUMN "totalPrice" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "items_latitude_longitude_idx" ON "items"("latitude", "longitude");
