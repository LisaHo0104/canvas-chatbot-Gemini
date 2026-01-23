"use client";

import { motion } from "framer-motion";
import { Calendar, CheckCircle, BookOpen, FileText, Target, Brain, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimelineEvent } from "@/types/events";
import { events as defaultEvents } from "@/data/events";

interface VerticalEventTimelineProps {
  events?: (TimelineEvent & { eventItem?: any; periodInfo?: { period: string; startDate: string; endDate: string } })[];
  onCardClick?: (event: TimelineEvent & { eventItem?: any }, index: number) => void;
  onEventToggle?: (periodIndex: number, eventIndex: number, isChecked: boolean) => void;
  onEventClick?: (event: any, periodIndex: number, eventIndex: number) => void;
}

export default function VerticalEventTimeline({ events: providedEvents, onCardClick, onEventToggle, onEventClick }: VerticalEventTimelineProps) {
  const events = providedEvents || defaultEvents;

  // Helper function to format period
  const formatPeriod = (item: TimelineEvent) => {
    if (item.periodType === "Q") {
      return `Q${item.periodNumber} ${item.year}`;
    } else if (item.periodType === "H") {
      return `H${item.periodNumber} ${item.year}`;
    }
    return `${item.year}`;
  };

  // Get event type icon and badge
  const getEventTypeInfo = (eventItem: any) => {
    const eventType = eventItem?.type || 'study_session';
    switch (eventType) {
      case 'assignment':
        return {
          icon: <FileText className="w-4 h-4 text-blue-500" />,
          badge: <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Assignment</Badge>,
        };
      case 'exam':
        return {
          icon: <Target className="w-4 h-4 text-red-500" />,
          badge: <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">Exam</Badge>,
        };
      case 'quiz':
        return {
          icon: <BookOpen className="w-4 h-4 text-purple-500" />,
          badge: <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Quiz</Badge>,
        };
      default:
        return {
          icon: <Brain className="w-4 h-4 text-primary" />,
          badge: <Badge variant="outline" className="text-xs">Study Session</Badge>,
        };
    }
  };

  // Group events by period for visual organization
  const groupedByPeriod = events.reduce((acc, event) => {
    const periodKey = `${event.year}-${event.periodType}-${event.periodNumber}`;
    if (!acc[periodKey]) {
      acc[periodKey] = {
        period: event,
        events: [],
      };
    }
    if ((event as any).eventItem) {
      acc[periodKey].events.push(event);
    }
    return acc;
  }, {} as Record<string, { period: TimelineEvent; events: any[] }>);

  return (
    <div className="mx-auto px-4 py-12 max-w-5xl">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 h-full w-0.5 bg-primary/20 z-0"></div>

        {Object.entries(groupedByPeriod).map(([periodKey, group], groupIndex) => {
          const periodStartIndex = groupIndex === 0 ? 0 : Object.keys(groupedByPeriod).slice(0, groupIndex).reduce((sum, k) => sum + groupedByPeriod[k].events.length, 0);
          
          return (
            <div key={periodKey} className="mb-8">
              {/* Period header */}
              <motion.div
                className="text-center mb-6"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Badge
                  variant="outline"
                  className="text-sm py-2 px-4 bg-primary/5 border-primary/20"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {formatPeriod(group.period)} {group.period.year}
                </Badge>
              </motion.div>

              {/* Event cards */}
              {group.events.map((item, index) => {
                const globalIndex = periodStartIndex + index;
                const eventItem = (item as any).eventItem;
                const typeInfo = getEventTypeInfo(eventItem);

                return (
                  <motion.div
                    key={globalIndex}
                    className={`mb-6 relative z-10 flex flex-col ${
                      index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                    }`}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-0 md:left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-primary z-10 border-2 border-background"></div>

                    {/* Card - takes full width on mobile, half width on desktop */}
                    <div
                      className={`md:w-1/2 ${index % 2 === 0 ? "md:pl-8" : "md:pr-8"}`}
                    >
                      <motion.div
                        className="w-full"
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <Card
                          className="overflow-hidden border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                          onClick={() => {
                            if (onCardClick) {
                              onCardClick(item, globalIndex);
                            }
                          }}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                {/* Title */}
                                <h3 className="text-xl font-bold text-primary mb-2 line-clamp-2">
                                  {eventItem.title}
                                </h3>

                                {/* Description */}
                                {eventItem.description && (
                                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                    {eventItem.description}
                                  </p>
                                )}

                                {/* Badges row */}
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  {typeInfo.badge}
                                  {eventItem.dueDate && (
                                    <Badge variant="outline" className="text-xs">
                                      Due: {new Date(eventItem.dueDate).toLocaleDateString()}
                                    </Badge>
                                  )}
                                  {eventItem.points && (
                                    <Badge variant="outline" className="text-xs">
                                      {eventItem.points} pts
                                    </Badge>
                                  )}
                                </div>

                                {/* Footer with status and counts */}
                                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    <CheckCircle
                                      className={`w-4 h-4 mr-1 ${
                                        eventItem.isChecked
                                          ? "text-green-500"
                                          : "text-gray-400"
                                      }`}
                                    />
                                    {eventItem.isChecked ? "Completed" : "Planned"}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <HelpCircle className="w-3 h-3" />
                                      Quiz
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Brain className="w-3 h-3" />
                                      Flashcards
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Icon */}
                              <div className="flex-shrink-0">
                                {typeInfo.icon}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
