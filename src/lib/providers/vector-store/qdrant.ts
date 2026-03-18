import { z } from 'zod'
import type { VectorStoreProviderDescriptor } from '../types'

const schema = z.object({
  url: z.string().url(),
  collectionName: z.string().min(1),
  apiKey: z.string().optional(),
})

type QdrantConfig = z.infer<typeof schema>

async function testConnection(config: QdrantConfig): Promise<void> {
  // GET /collections/{collectionName} to verify connectivity and collection existence
  const url = `${config.url}/collections/${encodeURIComponent(config.collectionName)}`

  const headers: Record<string, string> = {}
  if (config.apiKey) {
    headers['api-key'] = config.apiKey
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Qdrant connection test failed (${response.status}): ${errorText}`)
  }
}

export const qdrantProvider: VectorStoreProviderDescriptor<QdrantConfig> = {
  id: 'qdrant',
  displayName: 'Qdrant',
  description: 'Qdrant vector database for high-performance similarity search',
  docsUrl: 'https://qdrant.tech/documentation/',
  fields: [
    {
      key: 'url',
      label: 'URL',
      type: 'url',
      required: true,
      placeholder: 'https://your-cluster.qdrant.io',
    },
    {
      key: 'collectionName',
      label: 'Collection Name',
      type: 'text',
      required: true,
    },
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: false,
      description: 'Required for Qdrant Cloud; optional for self-hosted',
    },
  ],
  schema,
  testConnection,
}
