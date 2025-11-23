"use client"
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

export function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Content className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow">
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}