import 'dotenv/config';
import app from './app';
import { logger } from './logger';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

const server = app.listen(PORT, HOST, () => {
  logger.info(`Canvas MCP API server started`, {
    port: PORT,
    host: HOST,
    nodeEnv: process.env.NODE_ENV,
    canvasApiUrl: process.env.CANVAS_API_URL
  });

  // Log available endpoints
  const routes = app._router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods)
    }));

  logger.info('Available routes', { routes });
});

export default server;