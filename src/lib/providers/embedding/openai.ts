import { z } from 'zod'
import type { EmbeddingProviderDescriptor } from '../types'

const schema = z.object({
  apiKey: z.string().min(1),
  model: z.string().min(1),
  dimensions: z.coerce.number().int().positive(),
})

type OpenAIEmbeddingConfig = z.infer<typeof schema>

async function testConnection(config: OpenAIEmbeddingConfig): Promise<void> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      input: 'test',
      dimensions: config.dimensions,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI connection test failed (${response.status}): ${errorText}`)
  }
}

export const openAIEmbeddingProvider: EmbeddingProviderDescriptor<OpenAIEmbeddingConfig> = {
  id: 'openai',
  displayName: 'OpenAI',
  description: 'OpenAI text embedding models',
  docsUrl: 'https://platform.openai.com/docs/guides/embeddings',
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'sk-...',
    },
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      required: true,
      options: [
        { value: 'text-embedding-3-small', label: 'text-embedding-3-small (1536 dims)' },
        { value: 'text-embedding-3-large', label: 'text-embedding-3-large (3072 dims)' },
        { value: 'text-embedding-ada-002', label: 'text-embedding-ada-002 (1536 dims)' },
      ],
    },
    {
      key: 'dimensions',
      label: 'Dimensions',
      type: 'text',
      required: true,
      placeholder: '1536',
      description: 'Number of embedding dimensions (must match your model)',
    },
  ],
  schema,
  testConnection,
}
