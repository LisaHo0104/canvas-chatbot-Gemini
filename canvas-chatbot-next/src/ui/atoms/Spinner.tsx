export function Spinner({ size = 24 }: { size?: number }) {
  const border = Math.max(2, Math.round(size / 12))
  return (
    <div
      style={{ width: size, height: size, borderWidth: border }}
      className="animate-spin rounded-full border-b-2 border-slate-900"
      aria-label="Loading"
    />
  )
}