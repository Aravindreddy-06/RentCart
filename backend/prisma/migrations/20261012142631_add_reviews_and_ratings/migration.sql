-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_RECEIVED';

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_targetUserId_idx" ON "reviews"("targetUserId");

-- CreateIndex
CREATE INDEX "reviews_itemId_idx" ON "reviews"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_rentalId_authorId_key" ON "reviews"("rentalId", "authorId");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Check constraint: rating must be between 1 and 5
ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_rating_check"
CHECK ("rating" >= 1 AND "rating" <= 5);

