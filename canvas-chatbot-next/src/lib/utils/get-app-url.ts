/**
 * Get the application URL for server-side code.
 * Uses VERCEL_URL (automatically set by Vercel) when available,
 * otherwise falls back to localhost for local development.
 * 
 * @param path - Optional path to append (e.g., '/account/billing')
 * @returns The full URL with optional path
 * 
 * This function is for SERVER-SIDE use only (API routes, Route Handlers, Server Components).
 * For client-side code, use `window.location.origin` when you need the current URL.
 */
export function getAppUrl(path?: string): string {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';
  
  return path ? `${baseUrl}${path.startsWith('/') ? path : `/${path}`}` : baseUrl;
}

