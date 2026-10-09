/**
 * src/server.ts
 * Entry point — starts the HTTP server on the configured port.
 */

import { createApp } from './app';
import { env } from './config/env';
import prisma from './prisma/client';

async function bootstrap() {
  // Verify database connection before accepting traffic
  await prisma.$connect();
  console.log('✅  Database connected');

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`🚀  RentCart API running on http://localhost:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌  Failed to start server:', err);
  process.exit(1);
});
