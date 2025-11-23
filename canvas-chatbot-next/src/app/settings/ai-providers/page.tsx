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
  provider_name: 'gemini' | 'openrouter'
  model_name: string
  is_active: boolean
  config: Record<string, any>
  usage_stats: Record<string, any>
  created_at: string
  updated_at: string
}

interface ProviderFormData {
  provider: 'gemini' | 'openrouter'
  apiKey: string
  model: string
  config?: Record<string, any>
}

const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-pro', label: 'Gemini Pro' }
]

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
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.0-flash'
  })
  const [error, setError] = useState<string | null>(null)
  const [openRouterModels, setOpenRouterModels] = useState(DEFAULT_OPENROUTER_MODELS)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [showUsageStats, setShowUsageStats] = useState<string | null>(null)

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ai-providers')
      
      if (!response.ok) {
        throw new Error('Failed to fetch providers')
      }
      
      const data = await response.json()
      setProviders(data.providers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI providers')
    } finally {
      setLoading(false)
    }
  }

  const fetchOpenRouterModels = async (apiKey: string) => {
    if (!apiKey || formData.provider !== 'openrouter') return
    
    try {
      setFetchingModels(true)
      const response = await fetch(`/api/openrouter/models?apiKey=${encodeURIComponent(apiKey)}`)
      
      if (response.ok) {
        const data = await response.json()
        const models = data.models.map((model: any) => ({
          value: model.id,
          label: model.name || model.id
        }))
        setOpenRouterModels(models)
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
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save provider')
      }

      await fetchProviders()
      setShowModal(false)
      setEditingProvider(null)
      setFormData({ provider: 'gemini', apiKey: '', model: 'gemini-2.0-flash' })
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
        body: JSON.stringify({ providerId })
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
        body: JSON.stringify({ providerId })
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
        body: JSON.stringify({ providerId })
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
        provider: provider.provider_name,
        apiKey: '', // Don't pre-fill API key for security
        model: provider.model_name,
        config: provider.config
      })
    } else {
      setEditingProvider(null)
      setFormData({ provider: 'gemini', apiKey: '', model: 'gemini-2.0-flash' })
    }
    setShowModal(true)
    setError(null)
  }

  const handleApiKeyChange = (apiKey: string) => {
    setFormData({ ...formData, apiKey })
    
    // Auto-fetch OpenRouter models when API key is entered
    if (formData.provider === 'openrouter' && apiKey.length > 20) {
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
    setFormData({ provider: 'gemini', apiKey: '', model: 'gemini-2.0-flash' })
    setError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
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
          <h2 className="text-xl font-semibold text-gray-900">Your AI Providers</h2>
          <Button onClick={() => openModal()} leftIcon={<Plus className="w-4 h-4" />}>
            Add Provider
          </Button>
        </div>

        {providers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No AI providers configured</h3>
            <p className="text-gray-600 mb-4">
              Add your first AI provider to start using the chat functionality.
            </p>
            <Button onClick={() => openModal()}>Add Your First Provider</Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {providers.map((provider) => (
              <div key={provider.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-medium text-gray-900 capitalize">
                        {provider.provider_name}
                      </h3>
                      {provider.is_active && (
                        <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      <p><strong>Model:</strong> {provider.model_name}</p>
                      <p><strong>Created:</strong> {new Date(provider.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetActive(provider.id)}
                        disabled={provider.is_active}
                        leftIcon={provider.is_active ? <CheckCircle className="w-4 h-4" /> : undefined}
                      >
                        {provider.is_active ? 'Active' : 'Set Active'}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestConnection(provider.id)}
                        disabled={testing === provider.id}
                        leftIcon={testing === provider.id ? <Spinner size="sm" /> : <TestTube className="w-4 h-4" />}
                      >
                        Test Connection
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowUsageStats(provider.id)}
                        leftIcon={<TrendingUp className="w-4 h-4" />}
                      >
                        Usage Stats
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openModal(provider)}
                        leftIcon={<Edit2 className="w-4 h-4" />}
                      >
                        Edit
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        color="danger"
                        onClick={() => handleDelete(provider.id)}
                        leftIcon={<Trash2 className="w-4 h-4" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onOpenChange={(open) => !open && closeModal()} title={editingProvider ? 'Edit AI Provider' : 'Add AI Provider'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="provider">Provider</Label>
            <select
              id="provider"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value as 'gemini' | 'openrouter', model: AVAILABLE_MODELS[e.target.value as 'gemini' | 'openrouter'][0].value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={!!editingProvider}
            >
              <option value="gemini">Google Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>

          <div>
            <Label htmlFor="model">Model</Label>
            <div className="flex space-x-2">
              <select
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={formData.provider === 'openrouter' && fetchingModels}
              >
                {formData.provider === 'gemini' ? (
                  GEMINI_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))
                ) : (
                  openRouterModels.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))
                )}
              </select>
              {formData.provider === 'openrouter' && formData.apiKey && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fetchOpenRouterModels(formData.apiKey)}
                  disabled={fetchingModels}
                  leftIcon={fetchingModels ? <Spinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
                >
                  {fetchingModels ? 'Fetching...' : 'Refresh'}
                </Button>
              )}
            </div>
            {formData.provider === 'openrouter' && !formData.apiKey && (
              <p className="mt-1 text-sm text-gray-500">
                Enter your API key first to fetch available models
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={formData.apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder={editingProvider ? 'Leave blank to keep current API key' : 'Enter your API key'}
              required={!editingProvider}
              className="mt-1"
            />
            <p className="mt-1 text-sm text-gray-500">
              {formData.provider === 'gemini' && (
                <>
                  Get your Gemini API key from{' '}
                  <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                    Google AI Studio
                  </a>
                </>
              )}
              {formData.provider === 'openrouter' && (
                <>
                  Get your OpenRouter API key from{' '}
                  <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                    OpenRouter Keys
                  </a>
                </>
              )}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              leftIcon={saving ? <Spinner size="sm" /> : undefined}
            >
              {saving ? 'Saving...' : (editingProvider ? 'Update' : 'Add')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Usage Stats Modal */}
      <Modal
        open={!!showUsageStats}
        onOpenChange={(open) => !open && setShowUsageStats(null)}
        title="Provider Usage Statistics"
      >
        {showUsageStats && (
          <ProviderUsageStats providerId={showUsageStats} />
        )}
      </Modal>
    </div>
  )
}