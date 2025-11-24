import * as React from "react"
import { cn } from "@/lib/utils"

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {}
export function Avatar({ className, ...props }: AvatarProps) {
  return <div data-slot="avatar" className={cn("relative inline-flex size-8 overflow-hidden rounded-full border", className)} {...props} />
}

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}
export function AvatarImage({ className, ...props }: AvatarImageProps) {
  return <img data-slot="avatar-image" className={cn("aspect-square h-full w-full", className)} {...props} />
}

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {}
export function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return <div data-slot="avatar-fallback" className={cn("flex h-full w-full items-center justify-center bg-muted text-sm font-medium text-muted-foreground", className)} {...props} />
}
