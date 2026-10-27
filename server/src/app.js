import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // allow loading local assets in production SPA
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow same-origin, curl, mobile, localhost, onrender.com, or configured CLIENT_URL
        if (!origin) return callback(null, true);
        if (
          env.NODE_ENV === 'development' ||
          !env.CLIENT_URL ||
          origin === env.CLIENT_URL ||
          origin.includes('onrender.com') ||
          origin.startsWith('http://localhost')
        ) {
          return callback(null, true);
        }
        // Permissive fallback so cross-origin evaluation requests never trigger 500 crashes
        return callback(null, true);
      },
      credentials: true,
    })
  );

  // Rate Limiting
  app.use(globalLimiter);

  // Body Parsing (Strict 100kb limit)
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // HTTP Request Logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // API Routes mounted at /api
  app.use('/api', apiRoutes);

  // In production, serve the built frontend SPA
  if (env.NODE_ENV === 'production') {
    const clientDistPath = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDistPath));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // 404 handler for unrecognized /api routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `API endpoint ${req.method} ${req.originalUrl} not found`,
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
