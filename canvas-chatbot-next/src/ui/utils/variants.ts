export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

type VariantConfig = Record<string, Record<string, string>>

export function variants(base: string, config: VariantConfig, opts?: Record<string, string | undefined>) {
  const classes = [base]
  if (!opts) return classes.join(' ')
  for (const key of Object.keys(opts)) {
    const val = opts[key]
    if (!val) continue
    const table = config[key]
    if (table && table[val]) classes.push(table[val])
  }
  return classes.join(' ')
}