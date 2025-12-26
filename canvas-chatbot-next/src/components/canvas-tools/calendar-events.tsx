import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, Clock } from 'lucide-react'

interface CanvasCalendarEvent {
  id: number
  title: string
  start_at: string
  end_at: string
  description: string | null
  context_name: string
  html_url: string
}

interface CalendarEventsProps {
  events: CanvasCalendarEvent[]
}

export function CalendarEvents({ events }: CalendarEventsProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No upcoming events found.
      </div>
    )
  }

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const date = new Date(event.start_at).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(event)
    return acc
  }, {} as Record<string, CanvasCalendarEvent[]>)

  return (
    <div className="space-y-4">
      {Object.entries(groupedEvents).map(([date, dateEvents]) => (
        <div key={date} className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-background py-1 z-10">
            {date}
          </h4>
          <div className="space-y-2">
            {dateEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden hover:bg-accent/5 transition-colors">
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <a href={event.html_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline truncate block">
                        {event.title}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(event.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(event.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {event.context_name && (
                      <Badge variant="outline" className="text-[10px] h-4 mt-1">
                        {event.context_name}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
