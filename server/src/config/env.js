import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  TZ: process.env.TZ || 'Asia/Kolkata',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusslot',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_campusslot_fallback_key_32chars',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};
