import { cn } from '@/lib/utils'

function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex w-full max-w-5xl flex-col items-center justify-center gap-6 rounded-lg border bg-background p-8 text-center', className)} {...props} />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col items-center gap-2', className)} {...props} />
}

function EmptyMedia({ className, variant = 'icon', ...props }: React.ComponentProps<'div'> & { variant?: 'icon' | 'none' }) {
  return <div className={cn('flex items-center justify-center', variant === 'icon' ? 'size-14 rounded-full bg-muted' : '', className)} {...props} />
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-lg font-semibold', className)} {...props} />
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center gap-2', className)} {...props} />
}

export { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent }
