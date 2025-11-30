import * as React from "react"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DropzoneProps {
  onFiles?: (files: File[]) => void
  accept?: string
  className?: string
}

export function Dropzone({ onFiles, accept = ".pdf,.txt", className }: DropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length && onFiles) onFiles(files)
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload file"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-muted/40 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "border-primary bg-primary/10 text-primary-foreground",
        className
      )}
    >
      <Upload className="h-4 w-4" aria-hidden="true" />
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          if (files.length && onFiles) onFiles(files)
        }}
      />
    </div>
  )
}