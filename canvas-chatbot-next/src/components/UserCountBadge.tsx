'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Heart } from 'lucide-react'

interface UserCountBadgeProps {
  variant?: 'compact' | 'prominent'
  className?: string
}

export function UserCountBadge({ variant = 'compact', className }: UserCountBadgeProps) {
  const [userCount, setUserCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const fetchUserCount = async () => {
      try {
        const response = await fetch('/api/stats/user-count')
        if (!response.ok) {
          throw new Error('Failed to fetch user count')
        }
        const data = await response.json()
        if (mounted) {
          setUserCount(data.count || 0)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error fetching user count:', error)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchUserCount()

    return () => {
      mounted = false
    }
  }, [])

  if (isLoading || userCount === null) {
    return null
  }

  if (variant === 'prominent') {
    return (
      <div className={cn('animate-in fade-in slide-in-from-bottom-2 duration-700', className)}>
        {/* Modern Social Proof Card */}
        <div className="flex flex-col items-center gap-2 px-4 py-3 rounded-2xl bg-background border shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          <p className="text-sm font-semibold tracking-tight text-center">
            Join {userCount}+ students growing with Lulu today
          </p>
          <p className="text-[13px] text-muted-foreground font-medium flex items-center gap-1.5">
            Thanks for being an early adopter! <Heart className="size-3 text-red-500 fill-red-500" />
          </p>
        </div>
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            'text-[11px] font-semibold px-2 py-0.5 bg-background hover:bg-accent transition-all shadow-sm group cursor-default gap-1.5',
            className
          )}
        >
          <Heart className="size-3 text-red-500 fill-red-500 transition-transform group-hover:scale-110" />
          <span className="tabular-nums">{userCount}+ users</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[12px] font-medium animate-in fade-in zoom-in-95 duration-200">
        Thank you for being an early adopter!
      </TooltipContent>
    </Tooltip>
  )
}
