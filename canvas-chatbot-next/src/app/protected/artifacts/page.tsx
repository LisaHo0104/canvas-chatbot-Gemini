'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, FileQuestion, FileText, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArtifactCard } from '@/components/artifacts/ArtifactCard'
import { Spinner } from '@/components/ui/spinner'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from '@/components/ui/breadcrumb'

interface Artifact {
  id: string
  title: string
  description: string | null
  tags: string[]
  artifact_type: 'quiz' | 'rubric_analysis' | 'note' | 'assignment_plan' | 'assignment_summary'
  created_at: string
  updated_at: string
}

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'quiz' | 'rubric_analysis' | 'note' | 'assignment_plan' | 'assignment_summary'>('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'title'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const loadArtifacts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (typeFilter !== 'all') {
        params.set('type', typeFilter)
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)

      const response = await fetch(`/api/artifacts?${params.toString()}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load artifacts')
      }

      const data = await response.json()
      setArtifacts(data.artifacts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artifacts')
      console.error('Error loading artifacts:', err)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, searchQuery, sortBy, sortOrder])

  useEffect(() => {
    loadArtifacts()
  }, [loadArtifacts])

  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/artifacts/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete artifact')
      }

      // Reload artifacts after deletion
      loadArtifacts()
    } catch (err) {
      console.error('Error deleting artifact:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete artifact')
    }
  }, [loadArtifacts])

  return (
    <div className="min-h-[calc(100vh-3rem)] w-full px-4 py-6">
      <div className="max-w-7xl mx-auto w-full">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Artifacts</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-semibold flex items-center gap-2">
              Artifacts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage your saved quizzes, rubric analyses, and notes
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search artifacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="quiz">Quizzes</SelectItem>
              <SelectItem value="rubric_analysis">Rubric Analyses</SelectItem>
              <SelectItem value="note">Notes</SelectItem>
              <SelectItem value="assignment_plan">Assignment Plans</SelectItem>
              <SelectItem value="assignment_summary">Assignment Summaries</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="updated_at">Last Updated</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 rounded-md border border-destructive bg-destructive/10">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        )}

        {/* Artifacts Grid */}
        {!loading && !error && (
          <>
            {artifacts.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <FileQuestion className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">No artifacts found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery || typeFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Save quizzes and rubric analyses from the chat to see them here'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {artifacts.map((artifact) => (
                  <ArtifactCard
                    key={artifact.id}
                    artifact={artifact}
                    onDelete={handleDelete}
                    onUpdate={loadArtifacts}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
