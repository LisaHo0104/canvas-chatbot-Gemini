/**
 * Get the redirect URL for Supabase auth flows.
 * 
 * This function detects the environment and returns the appropriate base URL:
 * - Uses NEXT_PUBLIC_SITE_URL if set (production site URL)
 * - Falls back to NEXT_PUBLIC_VERCEL_URL (for Vercel preview deployments)
 * - Falls back to window.location.origin (localhost:3000 in local dev)
 * 
 * Ensures proper URL formatting:
 * - Adds https:// for non-localhost URLs
 * - Ensures trailing slash
 * 
 * @param path - Optional path to append (e.g., '/auth/oauth')
 * @returns The full URL with optional path
 * 
 * This function is for CLIENT-SIDE use only (React components, client-side auth flows).
 * For server-side code, use getAppUrl from './get-app-url'.
 */
export function getRedirectUrl(path?: string): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

  // Make sure to include `https://` when not localhost.
  if (!url.startsWith('http')) {
    url = `https://${url}`
  }

  // Append path if provided
  if (path) {
    // Ensure path starts with / for proper URL construction
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    // Remove trailing slash from base URL if present, then append path
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url
    url = `${baseUrl}${cleanPath}`
  } else {
    // Make sure to include a trailing `/` if no path is provided
    if (!url.endsWith('/')) {
      url = `${url}/`
    }
  }

  return url
}
