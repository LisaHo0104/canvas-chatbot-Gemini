'use client'

type EventPayload = Record<string, any>

export function trackSummaryEvent(name: string, payload?: EventPayload) {
  try {
    console.log('[DEBUG] Summary Analytics', name, payload || {})
    if (typeof window !== 'undefined') {
      ;(window as any).__summaryAnalytics = (window as any).__summaryAnalytics || []
      ;(window as any).__summaryAnalytics.push({ name, payload, ts: Date.now() })
    }
  } catch {}
}
