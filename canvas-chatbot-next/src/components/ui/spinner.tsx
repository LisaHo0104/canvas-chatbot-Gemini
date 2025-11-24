import * as React from "react"
import { cn } from "@/lib/utils"

export function Spinner({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-slot="spinner"
      className={cn("size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent", className)}
      {...props}
    />
  )
}