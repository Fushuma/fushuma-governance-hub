import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { validateEnvironment } from './envValidation';
import { logger, requestLogger, errorLogger } from './logger';
import { apiLimiter } from './rateLimit';
import { metricsMiddleware, metricsHandler } from './metrics';
import helmet from 'helmet';
import compression from 'compression';
import { telegramSync } from '../services/telegram-sync';

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Validate environment before starting
  console.log('Validating environment configuration...');
  if (!validateEnvironment()) {
    console.error('Environment validation failed. Please fix the issues above.');
    process.exit(1);
  }

  // Initialize Telegram sync service
  console.log('Initializing Telegram sync service...');
  await telegramSync.initialize(
    process.env.TELEGRAM_BOT_TOKEN,
    true, // Enable auto-sync
    300000 // 5 minutes interval
  );

  const app = express();
  const server = createServer(app);
  
  // Security headers with improved CSP
  const isDevelopment = process.env.NODE_ENV === 'development';
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
                  "'unsafe-inline'",
          "'self'",
          "https://fonts.googleapis.com",
          // Allow unsafe-inline only in development
          ...(isDevelopment ? ["'unsafe-inline'"] : []),
        ],
        scriptSrc: [
                  "'unsafe-inline'",
          "'self'",
          // Allow unsafe-eval only in development for HMR
          ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
        ],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        connectSrc: [
          "'self'",
          "https:",
          "wss:",
          "https://rpc.fushuma.com",
          "https://api.manus.im",
          ...(isDevelopment ? ["ws://localhost:*", "http://localhost:*"] : []),
        ],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: isDevelopment ? [] : [],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  
  // Response compression
  app.use(compression());
  
  // Request logging middleware
  app.use(requestLogger);
  
  // Metrics collection middleware
  app.use(metricsMiddleware);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Health check endpoint (no rate limiting)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Metrics endpoint for Prometheus (no rate limiting)
  app.get('/metrics', metricsHandler);
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // tRPC API with rate limiting
  app.use(
    "/api/trpc",
    apiLimiter,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Error logging middleware (must be after routes)
  app.use(errorLogger);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    const message = `Server running on http://localhost:${port}/`;
    console.log(message);
    logger.info('Server started', { port, nodeEnv: process.env.NODE_ENV });
  });
}

startServer().catch(console.error);
