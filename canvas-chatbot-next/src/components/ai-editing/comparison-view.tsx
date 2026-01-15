'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2, Check, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComparisonViewProps {
  originalText: string
  generatedText: string | null
  loading: boolean
  error: string | null
  onAccept: () => void
  onReject: () => void
  onTryAgain: () => void
  operation: string
}

export function ComparisonView({
  originalText,
  generatedText,
  loading,
  error,
  onAccept,
  onReject,
  onTryAgain,
  operation,
}: ComparisonViewProps) {
  return (
    <Card className="w-full mt-4 border-2">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span>AI Editing: {operation.charAt(0).toUpperCase() + operation.slice(1)}</span>
          {loading && <Loader2 className="size-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">Original</h4>
            </div>
            <div className="p-4 border rounded-md bg-muted/30 min-h-[150px] max-h-[400px] overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{originalText}</p>
            </div>
          </div>

          {/* AI Generated Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">AI Generated</h4>
            </div>
            <div className={cn(
              "p-4 border rounded-md min-h-[150px] max-h-[400px] overflow-y-auto",
              loading ? "bg-muted/30" : "bg-primary/5"
            )}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">AI is processing...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onTryAgain}
                  >
                    <RefreshCw className="size-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : generatedText ? (
                <p className="text-sm whitespace-pre-wrap">{generatedText}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Waiting for AI response...</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={onReject}
            disabled={loading}
          >
            <X className="size-4 mr-2" />
            Reject
          </Button>
          <Button
            variant="outline"
            onClick={onTryAgain}
            disabled={loading || !generatedText}
          >
            <RefreshCw className="size-4 mr-2" />
            Try Again
          </Button>
          <Button
            onClick={onAccept}
            disabled={loading || !generatedText || !!error}
          >
            <Check className="size-4 mr-2" />
            Accept
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
