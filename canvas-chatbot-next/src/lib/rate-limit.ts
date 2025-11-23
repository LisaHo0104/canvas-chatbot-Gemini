import { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitStore {
  [key: string]: RateLimitEntry
}

class RateLimiter {
  private store: RateLimitStore = {}
  private readonly requestsPerMinute: number
  private readonly requestsPerHour: number

  constructor(requestsPerMinute: number = 60, requestsPerHour: number = 1000) {
    this.requestsPerMinute = requestsPerMinute
    this.requestsPerHour = requestsPerHour
  }

  private cleanup() {
    const now = Date.now()
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        delete this.store[key]
      }
    })
  }

  isRateLimited(identifier: string): boolean {
    this.cleanup()
    
    const now = Date.now()
    const minuteKey = `minute:${identifier}:${Math.floor(now / 60000)}`
    const hourKey = `hour:${identifier}:${Math.floor(now / 3600000)}`

    // Check minute limit
    const minuteEntry = this.store[minuteKey]
    if (minuteEntry && minuteEntry.count >= this.requestsPerMinute) {
      return true
    }

    // Check hour limit
    const hourEntry = this.store[hourKey]
    if (hourEntry && hourEntry.count >= this.requestsPerHour) {
      return true
    }

    return false
  }

  increment(identifier: string): void {
    const now = Date.now()
    const minuteKey = `minute:${identifier}:${Math.floor(now / 60000)}`
    const hourKey = `hour:${identifier}:${Math.floor(now / 3600000)}`

    // Increment minute counter
    if (!this.store[minuteKey]) {
      this.store[minuteKey] = {
        count: 0,
        resetTime: now + 60000, // 1 minute from now
      }
    }
    this.store[minuteKey].count++

    // Increment hour counter
    if (!this.store[hourKey]) {
      this.store[hourKey] = {
        count: 0,
        resetTime: now + 3600000, // 1 hour from now
      }
    }
    this.store[hourKey].count++
  }

  getRemainingRequests(identifier: string): { minute: number; hour: number } {
    this.cleanup()
    
    const now = Date.now()
    const minuteKey = `minute:${identifier}:${Math.floor(now / 60000)}`
    const hourKey = `hour:${identifier}:${Math.floor(now / 3600000)}`

    const minuteEntry = this.store[minuteKey]
    const hourEntry = this.store[hourKey]

    return {
      minute: Math.max(0, this.requestsPerMinute - (minuteEntry?.count || 0)),
      hour: Math.max(0, this.requestsPerHour - (hourEntry?.count || 0)),
    }
  }
}

// Create singleton instance with environment variables
const requestsPerMinute = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60')
const requestsPerHour = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_HOUR || '1000')

export const rateLimiter = new RateLimiter(requestsPerMinute, requestsPerHour)

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  // Fallback to a default identifier if no IP is found
  return 'unknown'
}

export function rateLimitMiddleware(
  handler: (request: NextRequest) => Promise<Response>
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    const clientIP = getClientIP(request)
    
    if (rateLimiter.isRateLimited(clientIP)) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.' 
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60', // Suggest retry after 60 seconds
          },
        }
      )
    }
    
    rateLimiter.increment(clientIP)
    
    return handler(request)
  }
}