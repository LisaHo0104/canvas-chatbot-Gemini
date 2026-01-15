'use client'

export type SectionInput = {
  title?: string
  description?: string
  successCriteria?: string[]
}

export function isValidSection(s?: SectionInput): boolean {
  if (!s) return false
  const hasTitle = typeof s.title === 'string' && s.title.trim().length > 0
  const hasDesc = typeof s.description === 'string' && s.description.trim().length > 0
  const hasCriteria = Array.isArray(s.successCriteria) && s.successCriteria.filter((c) => typeof c === 'string' && c.trim().length > 0).length > 0
  return hasTitle && (hasDesc || hasCriteria)
}

export function normalizeCriteria(list?: string[]): string[] {
  if (!Array.isArray(list)) return []
  return list
    .map((c) => (typeof c === 'string' ? c.trim() : ''))
    .filter((c) => c.length > 0)
    .map((c) => (c.startsWith('You can') || c.startsWith('You are able to') ? c : `You can ${c}`))
}
