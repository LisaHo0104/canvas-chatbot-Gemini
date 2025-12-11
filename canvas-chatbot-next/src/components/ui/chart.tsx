'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export type ChartConfig = Record<string, { label?: string; color?: string }>

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
}

export function ChartContainer({ config, className, children, ...rest }: ChartContainerProps) {
  const styleVars: React.CSSProperties = {}
  Object.entries(config || {}).forEach(([key, value]) => {
    const varName = `--color-${key}` as any
    ;(styleVars as any)[varName] = value?.color || '#8884d8'
  })
  return (
    <div className={cn('relative', className)} style={styleVars} {...rest}>
      {children}
    </div>
  )
}

export default ChartContainer

