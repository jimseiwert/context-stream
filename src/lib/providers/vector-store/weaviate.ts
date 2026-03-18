import { z } from 'zod'
import type { VectorStoreProviderDescriptor } from '../types'

const schema = z.object({
  url: z.string().url(),
  className: z.string().min(1),
  apiKey: z.string().optional(),
})

type WeaviateConfig = z.infer<typeof schema>

async function testConnection(config: WeaviateConfig): Promise<void> {
  // GET /v1/schema/{className} to verify connectivity and class existence
  const url = `${config.url}/v1/schema/${encodeURIComponent(config.className)}`

  const headers: Record<string, string> = {}
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Weaviate connection test failed (${response.status}): ${errorText}`)
  }
}

export const weaviateProvider: VectorStoreProviderDescriptor<WeaviateConfig> = {
  id: 'weaviate',
  displayName: 'Weaviate',
  description: 'Weaviate open-source vector database with multi-modal search',
  docsUrl: 'https://weaviate.io/developers/weaviate',
  fields: [
    {
      key: 'url',
      label: 'URL',
      type: 'url',
      required: true,
      placeholder: 'https://your-cluster.weaviate.network',
    },
    {
      key: 'className',
      label: 'Class Name',
      type: 'text',
      required: true,
      placeholder: 'Document',
    },
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: false,
    },
  ],
  schema,
  testConnection,
}
