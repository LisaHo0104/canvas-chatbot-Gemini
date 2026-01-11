'use client'

import { useRef, useState } from 'react'
import { Download, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ExportImportButtonsProps {
  onImportComplete: () => void
}

export function ExportImportButtons({ onImportComplete }: ExportImportButtonsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importOption, setImportOption] = useState<'apply' | 'save'>('save')
  const [presetName, setPresetName] = useState('')
  const [presetDescription, setPresetDescription] = useState('')
  const [importData, setImportData] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    try {
      setExporting(true)
      const response = await fetch('/api/context/export')
      if (!response.ok) {
        throw new Error('Failed to export')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `context-preset-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Failed to export preset. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // Validate import data structure
      if (!data.selections || !data.selections.courses || !data.selections.assignments || !data.selections.modules) {
        throw new Error('Invalid file format. Expected selections object with courses, assignments, and modules.')
      }

      setImportData(data)
      setPresetName(data.preset_name || 'Imported Preset')
      setPresetDescription(data.metadata?.description || '')
      setImportDialogOpen(true)
    } catch (error) {
      console.error('Error parsing import file:', error)
      alert('Failed to parse import file. Please ensure it is a valid JSON file.')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImport = async () => {
    if (!importData) return

    if (importOption === 'save' && !presetName.trim()) {
      setError('Preset name is required when saving as preset')
      return
    }

    try {
      setImporting(true)
      setError(null)

      const response = await fetch('/api/context/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections: importData.selections,
          applyDirectly: importOption === 'apply',
          presetName: importOption === 'save' ? presetName.trim() : null,
          presetDescription: importOption === 'save' ? presetDescription.trim() || null : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to import')
      }

      onImportComplete()
      setImportDialogOpen(false)
      setImportData(null)
      setPresetName('')
      setPresetDescription('')
      setImportOption('save')

      if (importOption === 'apply') {
        window.location.reload()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import preset')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Preset</DialogTitle>
            <DialogDescription>
              Choose how to import the preset from the selected file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {importData && (
              <>
                <div className="space-y-2">
                  <Label>File: {importData.preset_name || 'Untitled Preset'}</Label>
                  {importData.metadata && (
                    <div className="rounded-md border bg-muted/50 p-3 space-y-1 text-sm">
                      {importData.metadata.total_courses !== undefined && (
                        <div>• {importData.metadata.total_courses} courses</div>
                      )}
                      {importData.metadata.total_assignments !== undefined && (
                        <div>• {importData.metadata.total_assignments} assignments</div>
                      )}
                      {importData.metadata.total_modules !== undefined && (
                        <div>• {importData.metadata.total_modules} modules</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Import Options</Label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="import-option"
                        value="apply"
                        checked={importOption === 'apply'}
                        onChange={(e) => setImportOption(e.target.value as 'apply' | 'save')}
                        className="w-4 h-4"
                        disabled={importing}
                      />
                      <span className="text-sm">Apply directly to current selections</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="import-option"
                        value="save"
                        checked={importOption === 'save'}
                        onChange={(e) => setImportOption(e.target.value as 'apply' | 'save')}
                        className="w-4 h-4"
                        disabled={importing}
                      />
                      <span className="text-sm">Save as new preset</span>
                    </label>
                  </div>
                </div>

                {importOption === 'save' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="import-name">
                        Preset Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="import-name"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="e.g., Current Semester"
                        disabled={importing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="import-description">Description (optional)</Label>
                      <Input
                        id="import-description"
                        value={presetDescription}
                        onChange={(e) => setPresetDescription(e.target.value)}
                        placeholder="e.g., Fall 2024 courses"
                        disabled={importing}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {error && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importing}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || (importOption === 'save' && !presetName.trim())}
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                'Import'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
