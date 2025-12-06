import React from 'react'
import { Card } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, FileText, Link as LinkIcon, CheckSquare, MessageSquare, File } from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface CanvasModuleItem {
  id: number
  title: string
  type: 'Page' | 'Assignment' | 'Quiz' | 'Discussion' | 'File' | 'ExternalUrl' | 'ExternalTool'
  html_url: string
  url: string
}

interface CanvasModule {
  id: number
  name: string
  position: number
  items: CanvasModuleItem[]
}

interface ModuleListProps {
  modules: CanvasModule[]
}

export function ModuleList({ modules }: ModuleListProps) {
  const [openModules, setOpenModules] = React.useState<Record<number, boolean>>({})

  const toggleModule = (id: number) => {
    setOpenModules(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (!modules || modules.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No modules found.
      </div>
    )
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'Page': return <FileText className="w-3 h-3 text-blue-500" />
      case 'Assignment': return <CheckSquare className="w-3 h-3 text-green-500" />
      case 'Quiz': return <CheckSquare className="w-3 h-3 text-orange-500" />
      case 'Discussion': return <MessageSquare className="w-3 h-3 text-purple-500" />
      case 'File': return <File className="w-3 h-3 text-gray-500" />
      case 'ExternalUrl': return <LinkIcon className="w-3 h-3 text-sky-500" />
      default: return <File className="w-3 h-3" />
    }
  }

  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap rounded-md border bg-background/50">
        <div className="flex w-max space-x-4 p-4">
          {modules.map((module) => (
            <Card 
              key={module.id} 
              className={cn(
                "w-[280px] flex-shrink-0 flex flex-col transition-all hover:shadow-md",
                "bg-background hover:bg-accent/5"
              )}
            >
               <Collapsible
                open={openModules[module.id]}
                onOpenChange={() => toggleModule(module.id)}
                className="w-full flex flex-col h-full"
              >
                <div 
                  className="flex items-start justify-between p-3 cursor-pointer hover:bg-muted/50 gap-2 border-b border-border/50 min-h-[60px]" 
                  onClick={() => toggleModule(module.id)}
                >
                   <div className="flex-1 min-w-0 space-y-1">
                     <h4 className="text-sm font-semibold leading-tight line-clamp-2 whitespace-normal" title={module.name}>
                       {module.name}
                     </h4>
                     <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{module.items?.length || 0} items</Badge>
                   </div>
                   <Button variant="ghost" size="sm" className="w-6 h-6 p-0 shrink-0">
                     <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", openModules[module.id] ? "transform rotate-180" : "")} />
                     <span className="sr-only">Toggle</span>
                   </Button>
                </div>
                
                <CollapsibleContent className="flex-1 bg-muted/20">
                  <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {module.items && module.items.length > 0 ? (
                      module.items.map((item) => (
                        <a
                          key={item.id}
                          href={item.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-xs group transition-colors"
                        >
                          <span className="mt-0.5 flex-shrink-0">{getItemIcon(item.type)}</span>
                          <span className="flex-1 line-clamp-2 whitespace-normal font-medium text-muted-foreground group-hover:text-foreground leading-tight" title={item.title}>
                            {item.title}
                          </span>
                        </a>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground p-2 italic">Empty module</div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
