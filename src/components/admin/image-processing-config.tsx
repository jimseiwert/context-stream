/**
 * Image Processing Configuration Component
 * Manage image extraction settings for document uploads
 */

'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle, Loader2, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface ImageProcessingConfig {
  id: string
  method: 'OCR' | 'OPENAI_VISION' | 'AZURE_VISION' | 'SKIP'
  ocrLanguage: string | null
  ocrQuality: number | null
  apiKey: string | null
  apiEndpoint: string | null
  visionModel: string | null
  visionPrompt: string | null
  maxImageSize: number | null
}

interface ConfigFormData {
  method: 'OCR' | 'OPENAI_VISION' | 'AZURE_VISION' | 'SKIP'
  ocrLanguage: string
  ocrQuality: number
  apiKey: string
  apiEndpoint: string
  visionModel: string
  visionPrompt: string
}

export function ImageProcessingConfig() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<ConfigFormData>({
    method: 'OCR',
    ocrLanguage: 'eng',
    ocrQuality: 2,
    apiKey: '',
    apiEndpoint: '',
    visionModel: 'gpt-4o',
    visionPrompt: '',
  })

  // Fetch current config
  const { data: configData, isLoading } = useQuery({
    queryKey: ['imageProcessingConfig'],
    queryFn: async () => {
      const res = await fetch('/api/admin/image-processing-config')
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch config')
      }
      return res.json()
    },
  })

  // Update config mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<ConfigFormData>) => {
      const res = await fetch('/api/admin/image-processing-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update config')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imageProcessingConfig'] })
      toast.success('Image processing configuration updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update config: ${error.message}`)
    },
  })

  // Load config into form when data is fetched
  useEffect(() => {
    if (configData?.config) {
      const config = configData.config as ImageProcessingConfig
      setFormData({
        method: config.method,
        ocrLanguage: config.ocrLanguage || 'eng',
        ocrQuality: config.ocrQuality || 2,
        apiKey: config.apiKey === '********' ? '' : config.apiKey || '',
        apiEndpoint: config.apiEndpoint || '',
        visionModel: config.visionModel || 'gpt-4o',
        visionPrompt: config.visionPrompt || '',
      })
    }
  }, [configData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Build update payload based on method
    const payload: Partial<ConfigFormData> = {
      method: formData.method,
    }

    if (formData.method === 'OCR') {
      payload.ocrLanguage = formData.ocrLanguage
      payload.ocrQuality = formData.ocrQuality
    } else if (formData.method === 'OPENAI_VISION') {
      payload.apiKey = formData.apiKey
      payload.visionModel = formData.visionModel
      payload.visionPrompt = formData.visionPrompt
    } else if (formData.method === 'AZURE_VISION') {
      payload.apiKey = formData.apiKey
      payload.apiEndpoint = formData.apiEndpoint
    }

    updateMutation.mutate(payload)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Image Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Image Processing Configuration</CardTitle>
        <CardDescription>
          Configure how images in documents (e.g., PDFs) are processed for text extraction
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Processing Method */}
          <div className="space-y-2">
            <Label htmlFor="method">Image Processing Method</Label>
            <Select
              value={formData.method}
              onValueChange={(value: any) => setFormData({ ...formData, method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OCR">
                  <div>
                    <div className="font-medium">OCR (Tesseract.js)</div>
                    <div className="text-xs text-muted-foreground">
                      Local OCR - Works offline (recommended)
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="OPENAI_VISION">
                  <div>
                    <div className="font-medium">OpenAI Vision</div>
                    <div className="text-xs text-muted-foreground">
                      GPT-4 Vision API - Requires API key
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="AZURE_VISION">
                  <div>
                    <div className="font-medium">Azure Computer Vision</div>
                    <div className="text-xs text-muted-foreground">
                      Azure AI - Requires endpoint and key
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="SKIP">
                  <div>
                    <div className="font-medium">Skip Images</div>
                    <div className="text-xs text-muted-foreground">
                      Don't process images (not recommended)
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* OCR Settings */}
          {formData.method === 'OCR' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Air-Gap Compatible</p>
                  <p className="text-xs text-muted-foreground">
                    Works without internet connection. Perfect for self-hosted and air-gapped deployments.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ocrLanguage">OCR Language</Label>
                <Select
                  value={formData.ocrLanguage}
                  onValueChange={(value) => setFormData({ ...formData, ocrLanguage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eng">English</SelectItem>
                    <SelectItem value="spa">Spanish</SelectItem>
                    <SelectItem value="fra">French</SelectItem>
                    <SelectItem value="deu">German</SelectItem>
                    <SelectItem value="jpn">Japanese</SelectItem>
                    <SelectItem value="chi_sim">Chinese (Simplified)</SelectItem>
                    <SelectItem value="chi_tra">Chinese (Traditional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ocrQuality">OCR Quality Level</Label>
                <Select
                  value={formData.ocrQuality.toString()}
                  onValueChange={(value) => setFormData({ ...formData, ocrQuality: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Fast (1) - Quick processing, lower accuracy</SelectItem>
                    <SelectItem value="2">Balanced (2) - Recommended</SelectItem>
                    <SelectItem value="3">Best (3) - Highest accuracy, slower</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* OpenAI Vision Settings */}
          {formData.method === 'OPENAI_VISION' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Requires Internet Connection</p>
                  <p className="text-xs text-muted-foreground">
                    OpenAI API key required. Not suitable for air-gapped deployments.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">OpenAI API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="sk-..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visionModel">Model</Label>
                <Select
                  value={formData.visionModel}
                  onValueChange={(value) => setFormData({ ...formData, visionModel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Faster, cheaper)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Azure Vision Settings */}
          {formData.method === 'AZURE_VISION' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Requires Internet Connection</p>
                  <p className="text-xs text-muted-foreground">
                    Azure Computer Vision endpoint and key required.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiEndpoint">Azure Vision Endpoint</Label>
                <Input
                  id="apiEndpoint"
                  type="url"
                  value={formData.apiEndpoint}
                  onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                  placeholder="https://your-resource.cognitiveservices.azure.com/"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="azureApiKey">Azure Vision Key</Label>
                <Input
                  id="azureApiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="Your Azure Vision key"
                />
              </div>
            </div>
          )}

          {/* Skip Warning */}
          {formData.method === 'SKIP' && (
            <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-900">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    Warning: Images will not be processed
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Text content within images (like charts, diagrams, or scanned pages) will be lost.
                    This is not recommended.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
