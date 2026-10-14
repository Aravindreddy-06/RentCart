/**
 * backend/scripts/normalize-phones.ts
 * Data migration script: normalizes existing user phone values to E.164.
 * Numbers that cannot be parsed are LEFT UNCHANGED.
 * Prints how many rows were updated and how many were skipped.
 * Safe to run multiple times.
 */

import prisma from '../src/prisma/client';
import { normalizePhone } from '../src/utils/phone';

async function run() {
  console.log('📱 Running phone normalization migration...');
  let updatedCount = 0;
  let skippedCount = 0;

  try {
    const users = await prisma.user.findMany({
      where: {
        phone: { not: null },
      },
      select: {
        id: true,
        phone: true,
      },
    });

    for (const user of users) {
      if (!user.phone || !user.phone.trim()) {
        skippedCount++;
        continue;
      }

      try {
        const normalized = normalizePhone(user.phone);
        if (normalized && normalized !== user.phone) {
          await prisma.user.update({
            where: { id: user.id },
            data: { phone: normalized },
          });
          updatedCount++;
        } else {
          // Already normalized or returned null
          skippedCount++;
        }
      } catch {
        // Numbers that cannot be parsed must be LEFT UNCHANGED (never deleted or nulled)
        skippedCount++;
      }
    }

    console.log(`✅ Phone normalization complete: ${updatedCount} updated, ${skippedCount} skipped.`);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
