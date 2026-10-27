import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isConnected = false;
let memoryServerInstance = null;

export async function connectDB(uri = env.MONGODB_URI) {
  if (isConnected) return mongoose.connection;

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 2000,
    });
    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn.connection;
  } catch (err) {
    // In development: if default 127.0.0.1 is not running, seamlessly start in-memory MongoDB
    if (env.NODE_ENV !== 'production' && (uri.includes('127.0.0.1:27017') || uri.includes('localhost:27017'))) {
      console.warn(`[Database] Local MongoDB daemon (127.0.0.1:27017) not running.`);
      console.log(`[Database] Starting zero-config in-memory MongoDB for local development...`);
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServerInstance = await MongoMemoryServer.create({
          binary: {
            downloadDir: path.resolve(__dirname, '../../node_modules/.cache/mongodb-memory-server'),
          },
        });
        const memUri = memoryServerInstance.getUri();
        const conn = await mongoose.connect(memUri, { autoIndex: true });
        isConnected = true;
        console.log(`[Database] Zero-Config In-Memory MongoDB Connected!`);

        // Automatically seed demo data so UI is immediately populated
        const { seedDatabase } = await import('../seed/index.js');
        await seedDatabase();

        return conn.connection;
      } catch (memErr) {
        console.error(`[Database Error] Could not start in-memory MongoDB fallback:`, memErr);
      }
    }

    console.error(`[Database Error] ${err.message}`);
    throw err;
  }
}

export async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
    memoryServerInstance = null;
  }
  console.log('[Database] MongoDB Disconnected');
}
