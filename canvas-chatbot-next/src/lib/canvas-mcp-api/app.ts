import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import { errorHandler } from './errors';
import { logger } from './logger';
import { attachValidationHelpers } from './validation';


// Import routes
import { 
  searchRecipients, 
  getUser, 
  exportContent, 
  getPageViews 
} from './endpoints';

// Create Express app
export const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });

  next();
});

// Validation helpers
app.use(attachValidationHelpers);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API documentation
const swaggerDocument = YAML.load(path.join(__dirname, 'openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API routes
app.use('/api/v1', createAPIRouter());

// Performance monitoring endpoint
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    const cacheStats = getCacheStats();
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cache: cacheStats,
      activeConnections: req.socket.server?.connections || 0
    };
    
    res.json(metrics);
  } catch (error) {
    logger.error('Metrics error', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});



// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      path: req.originalUrl,
      method: req.method
    }
  });
});

function createAPIRouter() {
  const router = express.Router();

  // Search endpoints
  router.get('/search/recipients', searchRecipients);

  // User endpoints
  router.get('/users/:id', getUser);
  router.post('/users/:user_id/page_views/query', getPageViews);

  // Content endpoints
  router.post('/courses/:course_id/content_exports', exportContent);

  

  return router;
}

// Add start time to requests
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).startTime = Date.now();
  next();
});

export default app;