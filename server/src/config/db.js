import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;

export async function connectDB(uri = env.MONGODB_URI) {
  if (isConnected) return mongoose.connection;

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true, // build partial unique indexes
    });
    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn.connection;
  } catch (err) {
    console.error(`[Database Error] ${err.message}`);
    throw err;
  }
}

export async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('[Database] MongoDB Disconnected');
}
