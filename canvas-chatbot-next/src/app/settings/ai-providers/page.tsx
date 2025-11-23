'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/ui/atoms/Button'
import { Input } from '@/ui/atoms/Input'
import { Label } from '@/ui/atoms/Label'
import { Spinner } from '@/ui/atoms/Spinner'
import { Modal } from '@/ui/molecules/Modal'
import { Dropdown } from '@/ui/molecules/Dropdown'
import { Tooltip } from '@/ui/molecules/Tooltip'
import { CheckCircle, XCircle, AlertCircle, Plus, Edit2, Trash2, TestTube, TrendingUp, RefreshCw } from 'lucide-react'
import ProviderUsageStats from '@/components/ProviderUsageStats'

interface AIProvider {
  id: string
  provider_name: 'openrouter'
  model_name: string
  is_active: boolean
  config: Record<string, any>
  usage_stats: Record<string, any>
  created_at: string
  updated_at: string
}

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

export default function AIProvidersSettings() {
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null)
  const [formData, setFormData] = useState<ProviderFormData>({
    provider: 'openrouter',
    apiKey: '',
    model: DEFAULT_OPENROUTER_MODELS[0].value
  })
  const [error, setError] = useState<string | null>(null)
  const [openRouterModels, setOpenRouterModels] = useState(DEFAULT_OPENROUTER_MODELS)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [showUsageStats, setShowUsageStats] = useState<string | null>(null)

  useEffect(() => {
    // Load models from OpenRouter and initialize preferred model
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

  const fetchProviders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ai-providers', { credentials: 'include' })
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to fetch providers' }))
        throw new Error(data.error || 'Failed to fetch providers')
      }
      
      const data = await response.json()
      setProviders(data.providers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI providers')
    } finally {
      setLoading(false)
    }
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const url = editingProvider ? '/api/ai-providers' : '/api/ai-providers'
      const method = editingProvider ? 'PUT' : 'POST'
      
      const body = editingProvider 
        ? { providerId: editingProvider.id, updates: { ...formData, apiKey: formData.apiKey } }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save provider')
      }

      await fetchProviders()
      setShowModal(false)
      setEditingProvider(null)
      setFormData({ provider: 'openrouter', apiKey: '', model: DEFAULT_OPENROUTER_MODELS[0].value })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save provider')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this AI provider?')) {
      return
    }

    try {
      const response = await fetch('/api/ai-providers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete provider')
      }

      await fetchProviders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete provider')
    }
  }

  const handleSetActive = async (providerId: string) => {
    try {
      const response = await fetch('/api/ai-providers/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to set active provider')
      }

      await fetchProviders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set active provider')
    }
  }

  const handleTestConnection = async (providerId: string) => {
    try {
      setTesting(providerId)
      const response = await fetch('/api/ai-providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
        credentials: 'include'
      })

      const result = await response.json()
      
      if (result.success) {
        alert('Connection test successful!')
      } else {
        alert(`Connection test failed: ${result.error}`)
      }
    } catch (err) {
      alert('Connection test failed')
    } finally {
      setTesting(null)
    }
  }

  const openModal = (provider?: AIProvider) => {
    if (provider) {
      setEditingProvider(provider)
      setFormData({
        provider: 'openrouter',
        apiKey: '',
        model: provider.model_name,
        config: provider.config
      })
    } else {
      setEditingProvider(null)
      setFormData({ provider: 'openrouter', apiKey: '', model: DEFAULT_OPENROUTER_MODELS[0].value })
    }
    setShowModal(true)
    setError(null)
  }

  const handleApiKeyChange = (apiKey: string) => {
    setFormData({ ...formData, apiKey })
    
    // Auto-fetch OpenRouter models when API key is entered
    if (apiKey.length > 20) {
      // Debounce the fetch to avoid too many requests
      clearTimeout((window as any).fetchModelsTimeout)
      ;(window as any).fetchModelsTimeout = setTimeout(() => {
        fetchOpenRouterModels(apiKey)
      }, 1000)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProvider(null)
    setFormData({ provider: 'openrouter', apiKey: '', model: DEFAULT_OPENROUTER_MODELS[0].value })
    setError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Provider Settings</h1>
        <p className="text-gray-600">
          Configure and manage your AI providers for chat functionality.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Model Selection</h2>
        </div>
        <div className="p-6">
          <div>
            <Label htmlFor="model">OpenRouter Model</Label>
            <div className="flex space-x-2 mt-2">
              <select
                id="model"
                value={formData.model}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData({ ...formData, model: value })
                  try {
                    localStorage.setItem('preferredModel', value)
                  } catch {}
                }}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={fetchingModels}
              >
                {openRouterModels.length === 0 ? (
                  <option value="" disabled>
                    {fetchingModels ? 'Loading models…' : 'No models available'}
                  </option>
                ) : (
                  openRouterModels.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))
                )}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fetchOpenRouterModels()}
                disabled={fetchingModels}
                leftIcon={fetchingModels ? <Spinner /> : <RefreshCw className="w-4 h-4" />}
              >
                {fetchingModels ? 'Fetching...' : 'Refresh'}
              </Button>
            </div>
            <p className="mt-2 text-sm text-gray-500">Your selection is saved locally and used for chat.</p>
          </div>
        </div>
      </div>

      
    </div>
  )
}