import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';
import { CacheError } from './errors';
import { logger } from './logger';

// Initialize cache with different TTLs for different data types
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every minute
  useClones: false, // Better performance for large objects
  deleteOnExpire: true
});

// Cache key generators
const generateCacheKey = (prefix: string, req: Request): string => {
  const params = JSON.stringify(req.params);
  const query = JSON.stringify(req.query);
  const userId = req.user?.id || 'anonymous';
  return `${prefix}:${userId}:${req.method}:${req.path}:${params}:${query}`;
};

// Cache configuration for different endpoint types
const cacheConfigs = {
  user: { ttl: 600, prefix: 'user' }, // 10 minutes
  search: { ttl: 300, prefix: 'search' }, // 5 minutes
  content: { ttl: 1800, prefix: 'content' }, // 30 minutes
  analytics: { ttl: 900, prefix: 'analytics' }, // 15 minutes

  default: { ttl: 300, prefix: 'default' } // 5 minutes
};

interface CacheOptions {
  ttl?: number;
  keyPrefix?: string;
  condition?: (req: Request, res: Response) => boolean;
  skipCache?: (req: Request) => boolean;
}

export const cacheMiddleware = (options: CacheOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const config = cacheConfigs[options.keyPrefix as keyof typeof cacheConfigs] || cacheConfigs.default;
    const ttl = options.ttl || config.ttl;
    const keyPrefix = options.keyPrefix || config.prefix;
    
    // Skip cache if specified
    if (options.skipCache && options.skipCache(req)) {
      return next();
    }

    const cacheKey = generateCacheKey(keyPrefix, req);

    try {
      // Check cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        logger.debug('Cache hit', { key: cacheKey, duration: Date.now() - start });
        return res.json(cachedData);
      }

      logger.debug('Cache miss', { key: cacheKey });

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = function(data: any) {
        try {
          // Check if we should cache this response
          if (!options.condition || options.condition(req, res)) {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
              cache.set(cacheKey, data, ttl);
              logger.debug('Cached response', { key: cacheKey, ttl });
            }
          }
        } catch (cacheError) {
          logger.error('Cache storage error', { error: cacheError.message, key: cacheKey });
        }

        // Call original json method
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message, key: cacheKey });
      next(error);
    }
  };
};

// Cache invalidation helpers
export const invalidateCache = (pattern: string): number => {
  try {
    const keys = cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    const deleted = cache.del(matchingKeys);
    logger.info('Cache invalidated', { pattern, deleted: deleted });
    return deleted;
  } catch (error) {
    logger.error('Cache invalidation error', { error: error.message, pattern });
    throw new CacheError('Failed to invalidate cache', { pattern });
  }
};

export const invalidateUserCache = (userId: string): number => {
  return invalidateCache(`user:${userId}`);
};

export const invalidateCourseCache = (courseId: string): number => {
  return invalidateCache(`course:${courseId}`);
};

// Cache statistics
export const getCacheStats = () => {
  return {
    stats: cache.getStats(),
    keys: cache.keys().length,
    memoryUsage: process.memoryUsage()
  };
};

// Cache warming function
export const warmCache = async (keys: string[], dataFetcher: (key: string) => Promise<any>, ttl?: number) => {
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      try {
        const data = await dataFetcher(key);
        cache.set(key, data, ttl || 300);
        return { key, status: 'success' };
      } catch (error) {
        logger.error('Cache warming failed', { key, error: error.message });
        return { key, status: 'failed', error: error.message };
      }
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 'success').length;
  const failed = results.filter(r => r.status === 'fulfilled' && r.value.status === 'failed').length;

  logger.info('Cache warming completed', { total: keys.length, successful, failed });
  return { successful, failed, results };
};



export default cache;