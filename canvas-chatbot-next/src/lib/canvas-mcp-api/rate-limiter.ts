import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './errors';
import { logger } from './logger';

interface RateLimitConfig {
  max: number;
  window: number; // milliseconds
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class MemoryRateLimitStore {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      Object.keys(this.store).forEach(key => {
        if (this.store[key].resetTime <= now) {
          delete this.store[key];
        }
      });
    }, 60000);
  }

  get(key: string): { count: number; resetTime: number } | null {
    const entry = this.store[key];
    if (!entry) return null;

    // Check if entry has expired
    if (entry.resetTime <= Date.now()) {
      delete this.store[key];
      return null;
    }

    return entry;
  }

  increment(key: string, window: number): { count: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store[key];

    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired one
      this.store[key] = {
        count: 1,
        resetTime: now + window
      };
    } else {
      // Increment existing entry
      entry.count++;
    }

    return this.store[key];
  }

  reset(key: string): void {
    delete this.store[key];
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store = {};
  }
}

const rateLimitStore = new MemoryRateLimitStore();

// Default key generator
const defaultKeyGenerator = (req: Request): string => {
  const userId = req.user?.id || req.ip || 'anonymous';
  const endpoint = req.path;
  return `rate_limit:${userId}:${endpoint}`;
};

export const rateLimiter = (config: Partial<RateLimitConfig> = {}) => {
  const {
    max = 100,
    window = 60000, // 1 minute default
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const key = keyGenerator(req);

    try {
      const entry = rateLimitStore.increment(key, window);
      const remaining = Math.max(0, max - entry.count);
      const resetTime = new Date(entry.resetTime);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toISOString(),
        'X-RateLimit-Reset-After': Math.ceil((entry.resetTime - Date.now()) / 1000).toString()
      });

      // Log rate limit status
      if (entry.count > max * 0.8) {
        logger.warn('Rate limit approaching', {
          key,
          count: entry.count,
          max,
          remaining,
          userId: req.user?.id,
          endpoint: req.path
        });
      }

      // Check if limit exceeded
      if (entry.count > max) {
        const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
        
        logger.error('Rate limit exceeded', {
          key,
          count: entry.count,
          max,
          retryAfter,
          userId: req.user?.id,
          endpoint: req.path
        });

        return next(new RateLimitError(
          'Too many requests',
          retryAfter,
          max,
          window
        ));
      }

      // Store rate limit info on request for later use
      req.rateLimit = {
        limit: max,
        remaining,
        resetTime,
        count: entry.count
      };

      // Override res.json to handle skip options
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        const shouldSkip = 
          (skipSuccessfulRequests && res.statusCode < 400) ||
          (skipFailedRequests && res.statusCode >= 400);

        if (shouldSkip) {
          // Reset the counter for this request
          const currentEntry = rateLimitStore.get(key);
          if (currentEntry) {
            currentEntry.count--;
            if (currentEntry.count <= 0) {
              rateLimitStore.reset(key);
            }
          }
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Rate limiter error', { error: error.message, key });
      next(error);
    }
  };
};

// Different rate limit configurations for different endpoint types
export const rateLimitConfigs = {
  // Strict limits for authentication endpoints
  auth: () => rateLimiter({
    max: 5,
    window: 60000, // 5 requests per minute
    keyGenerator: (req) => `auth:${req.ip}`
  }),

  // Moderate limits for search endpoints
  search: () => rateLimiter({
    max: 100,
    window: 60000, // 100 requests per minute
    keyGenerator: (req) => `search:${req.user?.id || req.ip}`
  }),

  // Generous limits for content endpoints
  content: () => rateLimiter({
    max: 200,
    window: 60000, // 200 requests per minute
    keyGenerator: (req) => `content:${req.user?.id || req.ip}`
  }),

  // Strict limits for vector operations
  vector: () => rateLimiter({
    max: 50,
    window: 60000, // 50 requests per minute
    keyGenerator: (req) => `vector:${req.user?.id || req.ip}`
  }),

  // Very strict limits for export operations
  export: () => rateLimiter({
    max: 10,
    window: 600000, // 10 requests per 10 minutes
    keyGenerator: (req) => `export:${req.user?.id || req.ip}`
  })
};

// Per-user rate limiting
export const userRateLimiter = (maxRequests: number, windowMs: number) => {
  return rateLimiter({
    max: maxRequests,
    window: windowMs,
    keyGenerator: (req) => `user:${req.user?.id}:${req.path}`
  });
};

// Per-endpoint rate limiting
export const endpointRateLimiter = (maxRequests: number, windowMs: number) => {
  return rateLimiter({
    max: maxRequests,
    window: windowMs,
    keyGenerator: (req) => `endpoint:${req.path}`
  });
};

// Sliding window rate limiter (more sophisticated)
export const slidingWindowRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, number[]>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = defaultKeyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get existing requests for this key
    const userRequests = requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      const oldestRequest = Math.min(...validRequests);
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      
      return next(new RateLimitError(
        'Sliding window rate limit exceeded',
        retryAfter,
        maxRequests,
        windowMs
      ));
    }
    
    // Add current request
    validRequests.push(now);
    requests.set(key, validRequests);
    
    // Set headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - validRequests.length).toString(),
      'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
    });
    
    next();
  };
};

export default rateLimiter;