'use client'

import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Canvas } from '@/components/ai-elements/canvas'
import { Background, Controls, MiniMap, useReactFlow, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Network, Maximize2 } from 'lucide-react'

export interface MindMapOutput {
  title: string
  description?: string
  nodes: Array<{
    id: string
    label: string
    type: 'concept' | 'subconcept' | 'detail'
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    label?: string
  }>
}

interface MindMapUIProps {
  data: MindMapOutput
  messageId?: string
  compact?: boolean
  onViewFull?: () => void
}

const nodeTypes = {
  concept: ({ data }: any) => (
    <div className="px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-md border-2 border-primary font-semibold text-sm">
      {data.label}
    </div>
  ),
  subconcept: ({ data }: any) => (
    <div className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md shadow-sm border border-secondary font-medium text-sm">
      {data.label}
    </div>
  ),
  detail: ({ data }: any) => (
    <div className="px-2 py-1 bg-background text-foreground rounded border border-border text-xs">
      {data.label}
    </div>
  ),
}

function MindMapContent({ data }: { data: MindMapOutput }) {
  const { fitView } = useReactFlow()

  const nodes = useMemo(() => {
    if (!data.nodes || data.nodes.length === 0) return []

    // Calculate positions in a hierarchical layout
    const conceptNodes = data.nodes.filter(n => n.type === 'concept')
    const subconceptNodes = data.nodes.filter(n => n.type === 'subconcept')
    const detailNodes = data.nodes.filter(n => n.type === 'detail')

    const positionedNodes: Node[] = []
    let yOffset = 0

    // Position concept nodes horizontally
    conceptNodes.forEach((node, index) => {
      positionedNodes.push({
        id: node.id,
        type: node.type,
        position: { x: index * 300, y: yOffset },
        data: { label: node.label },
      })
    })

    yOffset += 150

    // Position subconcept nodes under their parent concepts
    subconceptNodes.forEach((node, index) => {
      const parentEdge = data.edges.find(e => e.target === node.id)
      const parentNode = parentEdge
        ? positionedNodes.find(n => n.id === parentEdge.source)
        : null

      if (parentNode) {
        positionedNodes.push({
          id: node.id,
          type: node.type,
          position: {
            x: parentNode.position.x + (index % 2 === 0 ? -100 : 100),
            y: yOffset,
          },
          data: { label: node.label },
        })
      } else {
        positionedNodes.push({
          id: node.id,
          type: node.type,
          position: { x: index * 200, y: yOffset },
          data: { label: node.label },
        })
      }
    })

    yOffset += 120

    // Position detail nodes under their parent subconcepts
    detailNodes.forEach((node, index) => {
      const parentEdge = data.edges.find(e => e.target === node.id)
      const parentNode = parentEdge
        ? positionedNodes.find(n => n.id === parentEdge.source)
        : null

      if (parentNode) {
        positionedNodes.push({
          id: node.id,
          type: node.type,
          position: {
            x: parentNode.position.x + (index % 3 - 1) * 80,
            y: yOffset,
          },
          data: { label: node.label },
        })
      } else {
        positionedNodes.push({
          id: node.id,
          type: node.type,
          position: { x: index * 150, y: yOffset },
          data: { label: node.label },
        })
      }
    })

    return positionedNodes
  }, [data])

  const edges = useMemo(() => {
    if (!data.edges || data.edges.length === 0) return []

    return data.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'smoothstep',
      animated: false,
    }))
  }, [data])

  const onInit = useCallback(() => {
    setTimeout(() => {
      fitView({ padding: 0.2 })
    }, 100)
  }, [fitView])

  return (
    <Canvas
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onInit={onInit}
      fitView
      className="w-full h-full"
    >
      <Background />
      <Controls />
      <MiniMap />
    </Canvas>
  )
}

export function MindMapUI({ data, messageId, compact = false, onViewFull }: MindMapUIProps) {
  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">No mind map data available.</p>
      </div>
    )
  }

  const nodeCounts = {
    concept: data.nodes.filter(n => n.type === 'concept').length,
    subconcept: data.nodes.filter(n => n.type === 'subconcept').length,
    detail: data.nodes.filter(n => n.type === 'detail').length,
  }

  // Compact view
  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Network className="size-5" />
                {data.title}
              </CardTitle>
              <CardDescription>
                {data.nodes.length} nodes, {data.edges.length} connections
              </CardDescription>
            </div>
            {onViewFull && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewFull}
              >
                View Full
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>
    )
  }

  // Full view
  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Network className="size-5" />
                {data.title}
              </CardTitle>
              {data.description && (
                <CardDescription className="mt-2">
                  {data.description}
                </CardDescription>
              )}
              <div className="flex items-center gap-4 flex-wrap mt-4">
                <span className="text-sm text-muted-foreground">
                  {data.nodes.length} nodes
                </span>
                <span className="text-sm text-muted-foreground">
                  {data.edges.length} connections
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {nodeCounts.concept} Concepts
                  </Badge>
                  <Badge variant="outline">
                    {nodeCounts.subconcept} Subconcepts
                  </Badge>
                  <Badge variant="outline">
                    {nodeCounts.detail} Details
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Mind Map Canvas */}
      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-background">
        <MindMapContent data={data} />
      </div>
    </div>
  )
}
