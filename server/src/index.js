import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { startBackgroundJobs, stopBackgroundJobs } from './jobs/index.js';

let server = null;

async function bootstrap() {
  try {
    await connectDB();

    server = app.listen(env.PORT, () => {
      console.log(`[CampusSlot Server] Running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
    });

    startBackgroundJobs();
  } catch (err) {
    console.error('[Bootstrap Fatal Error]', err);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('\n[Graceful Shutdown] Closing connections...');
  stopBackgroundJobs();

  if (server) {
    server.close(() => {
      console.log('[Server] HTTP server closed');
    });
  }

  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (env.NODE_ENV !== 'test') {
  bootstrap();
}
