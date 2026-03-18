import { z } from 'zod'
import type { VectorStoreProviderDescriptor } from '../types'

const schema = z.object({
  apiKey: z.string().min(1),
  indexName: z.string().min(1),
  environment: z.string().optional(),
})

type PineconeConfig = z.infer<typeof schema>

async function testConnection(config: PineconeConfig): Promise<void> {
  // Describe index to verify connectivity
  const response = await fetch(`https://api.pinecone.io/indexes/${encodeURIComponent(config.indexName)}`, {
    headers: {
      'Api-Key': config.apiKey,
      'X-Pinecone-API-Version': '2024-07',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Pinecone connection test failed (${response.status}): ${errorText}`)
  }
}

export const pineconeProvider: VectorStoreProviderDescriptor<PineconeConfig> = {
  id: 'pinecone',
  displayName: 'Pinecone',
  description: 'Pinecone managed vector database for production-scale similarity search',
  docsUrl: 'https://docs.pinecone.io/',
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
    },
    {
      key: 'indexName',
      label: 'Index Name',
      type: 'text',
      required: true,
    },
    {
      key: 'environment',
      label: 'Environment',
      type: 'text',
      required: false,
      description: 'Only needed for legacy Pinecone indexes',
    },
  ],
  schema,
  testConnection,
}
