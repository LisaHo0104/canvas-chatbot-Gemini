'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { TrendingUp, Clock, DollarSign, Activity, CheckCircle } from 'lucide-react'

interface UsageStats {
  totalRequests: number
  successfulRequests: number
  errorRequests: number
  totalTokens: number
  totalCost: number
  averageResponseTime: number
  usageByDay: Record<string, {
    requests: number
    tokens: number
    cost: number
  }>
}

interface ProviderUsageStatsProps {
  providerId: string
}

export default function ProviderUsageStats({ providerId }: ProviderUsageStatsProps) {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchUsageStats()
  }, [providerId, days])

  const fetchUsageStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ai-providers/usage?providerId=${providerId}&days=${days}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch usage stats')
      }
      
      const data = await response.json()
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>{error}</p>
        <Button onClick={fetchUsageStats} className="mt-2" size="sm">
          Retry
        </Button>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No usage data available</p>
      </div>
    )
  }

  const successRate = stats.totalRequests > 0 
    ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
    : '0.0'

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Usage Statistics</h3>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant={days === 7 ? 'default' : 'outline'}
            onClick={() => setDays(7)}
          >
            7 Days
          </Button>
          <Button
            size="sm"
            variant={days === 30 ? 'default' : 'outline'}
            onClick={() => setDays(30)}
          >
            30 Days
          </Button>
          <Button
            size="sm"
            variant={days === 90 ? 'default' : 'outline'}
            onClick={() => setDays(90)}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-semibold text-foreground">{formatNumber(stats.totalRequests)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-semibold text-foreground">{successRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
              <p className="text-2xl font-semibold text-foreground">{formatResponseTime(stats.averageResponseTime)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(stats.totalCost)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-4 py-5 sm:p-6">
          <h4 className="text-lg font-medium text-foreground mb-4">Additional Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Tokens</p>
              <p className="text-lg font-semibold text-foreground">{formatNumber(stats.totalTokens)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Successful Requests</p>
              <p className="text-lg font-semibold text-foreground">{formatNumber(stats.successfulRequests)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Failed Requests</p>
              <p className="text-lg font-semibold text-foreground">{formatNumber(stats.errorRequests)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Usage Chart */}
      {Object.keys(stats.usageByDay).length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="px-4 py-5 sm:p-6">
            <h4 className="text-lg font-medium text-foreground mb-4">Daily Usage</h4>
            <div className="space-y-3">
              {Object.entries(stats.usageByDay)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .slice(0, 7) // Show last 7 days
                .map(([date, dayStats]) => (
                  <div key={date} className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dayStats.requests} requests • {formatNumber(dayStats.tokens)} tokens
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{formatCurrency(dayStats.cost)}</p>
                      <p className="text-xs text-muted-foreground">cost</p>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}