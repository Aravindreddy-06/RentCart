-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'NEW_MESSAGE';

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_rentalId_createdAt_idx" ON "messages"("rentalId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_rentalId_readAt_idx" ON "messages"("rentalId", "readAt");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
