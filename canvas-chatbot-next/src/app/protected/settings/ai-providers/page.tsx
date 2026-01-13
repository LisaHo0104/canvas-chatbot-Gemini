'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ProviderFormData {
  provider: 'openrouter'
  apiKey: string
  model: string
  config?: Record<string, any>
}

const DEFAULT_OPENROUTER_MODELS = [
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'openai/gpt-4', label: 'GPT-4' },
  { value: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B' }
]

interface AIProvidersSettingsProps {
  compact?: boolean
}

export default function AIProvidersSettings({ compact = false }: AIProvidersSettingsProps) {
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<ProviderFormData>({
    provider: 'openrouter',
    apiKey: '',
    model: DEFAULT_OPENROUTER_MODELS[0].value
  })
  const [error, setError] = useState<string | null>(null)
  const [openRouterModels, setOpenRouterModels] = useState(DEFAULT_OPENROUTER_MODELS)
  const [fetchingModels, setFetchingModels] = useState(false)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        await fetchOpenRouterModels()
        const saved = typeof window !== 'undefined' ? localStorage.getItem('preferredModel') : null
        if (saved && saved.trim()) {
          setFormData(prev => ({ ...prev, model: saved }))
        }
      } catch {}
      finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const fetchOpenRouterModels = async () => {
    try {
      setFetchingModels(true)
      const response = await fetch(`/api/openrouter/models`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        const models = Array.isArray(data.models) ? data.models.map((model: any) => ({
          value: model.id,
          label: model.name || model.id
        })) : []
        if (models.length > 0) {
          setOpenRouterModels(models)
        } else {
          setError('No free models available for your account')
        }
      }
    } catch (err) {
      console.error('Failed to fetch OpenRouter models:', err)
    } finally {
      setFetchingModels(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  return (
    <div className={compact ? 'space-y-4' : 'max-w-5xl mx-auto p-6 space-y-6'}>
      {!compact && (
        <div>
          <div className="mb-4">
            <Image
              src="/dog_thinking.png"
              alt="AI Provider Settings"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">AI Provider Settings</h1>
            </div>
          </div>
          <p className="text-muted-foreground mt-1">
            Configure and manage your AI providers for chat functionality.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {compact ? (
        <div>
          <Label htmlFor="model">OpenRouter Model</Label>
          <div className="flex space-x-2 mt-2">
            <Select value={formData.model} onValueChange={(value) => { setFormData({ ...formData, model: value }); try { localStorage.setItem('preferredModel', value) } catch {} }}>
              <SelectTrigger id="model" disabled={fetchingModels} className="flex-1">
                <SelectValue placeholder={fetchingModels ? 'Loading models…' : 'Select a model'} />
              </SelectTrigger>
              <SelectContent>
                {openRouterModels.length === 0 ? (
                  <SelectItem value="" disabled>{fetchingModels ? 'Loading models…' : 'No models available'}</SelectItem>
                ) : (
                  openRouterModels.map((model) => (
                    <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" variant="outline" onClick={() => fetchOpenRouterModels()} disabled={fetchingModels}>
              {fetchingModels ? <Spinner className="mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {fetchingModels ? 'Fetching…' : 'Refresh'}
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Your selection is saved locally and used for chat.</p>
        </div>
      ) : (
        <div className="bg-background rounded-lg shadow-sm border border-border mb-6">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h2 className="text-xl font-semibold text-foreground">Model Selection</h2>
          </div>
          <div className="p-6">
            <div>
              <Label htmlFor="model">OpenRouter Model</Label>
              <div className="flex space-x-2 mt-2">
                <Select value={formData.model} onValueChange={(value) => { setFormData({ ...formData, model: value }); try { localStorage.setItem('preferredModel', value) } catch {} }}>
                  <SelectTrigger id="model" disabled={fetchingModels} className="flex-1">
                    <SelectValue placeholder={fetchingModels ? 'Loading models…' : 'Select a model'} />
                  </SelectTrigger>
                  <SelectContent>
                    {openRouterModels.length === 0 ? (
                      <SelectItem value="" disabled>{fetchingModels ? 'Loading models…' : 'No models available'}</SelectItem>
                    ) : (
                      openRouterModels.map((model) => (
                        <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button type="button" size="sm" variant="outline" onClick={() => fetchOpenRouterModels()} disabled={fetchingModels}>
                  {fetchingModels ? <Spinner className="mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  {fetchingModels ? 'Fetching…' : 'Refresh'}
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Your selection is saved locally and used for chat.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
