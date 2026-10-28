-- Clean up existing data: if a borrower has multiple PENDING requests for one item, keep the newest and set older ones to CANCELLED
WITH ranked_pending AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "itemId", "borrowerId"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS rn
  FROM "rentals"
  WHERE "status" = 'PENDING'
)
UPDATE "rentals"
SET "status" = 'CANCELLED',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (
  SELECT "id"
  FROM ranked_pending
  WHERE rn > 1
);

-- If a borrower has a PENDING request alongside an APPROVED or ACTIVE rental for the same item, cancel the PENDING one
UPDATE "rentals"
SET "status" = 'CANCELLED',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'PENDING'
  AND ("itemId", "borrowerId") IN (
    SELECT "itemId", "borrowerId"
    FROM "rentals"
    WHERE "status" IN ('APPROVED', 'ACTIVE')
  );

-- Create partial unique index on (itemId, borrowerId) for active requests
CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_rental_per_borrower_per_item"
ON "rentals" ("itemId", "borrowerId")
WHERE "status" IN ('PENDING', 'APPROVED', 'ACTIVE');
