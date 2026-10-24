/**
 * src/server.ts
 * Entry point — starts the HTTP server on the configured port.
 */

import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import prisma from './prisma/client';
import { initSocketIO } from './socket';
import { verifyEmailConnection } from './services/mail.service';
import { startOtpCleanupJob } from './services/otp.service';
import { startTrackingCleanupJob } from './services/tracking.service';

async function bootstrap() {
  // Verify database connection before accepting traffic
  await prisma.$connect();
  console.log('✅  Database connected');

  // Verify email provider connection on startup
  await verifyEmailConnection();

  // Start periodic OTP cleanup job
  startOtpCleanupJob();

  // Start periodic LiveLocation tracking cleanup job
  startTrackingCleanupJob();

  const app = createApp();
  const server = http.createServer(app);
  initSocketIO(server);

  server.listen(env.PORT, () => {
    console.log(`🚀  RentCart API running on http://localhost:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌  Failed to start server:', err);
  process.exit(1);
});
