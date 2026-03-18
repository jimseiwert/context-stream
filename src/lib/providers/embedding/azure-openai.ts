import { z } from 'zod'
import type { EmbeddingProviderDescriptor } from '../types'

const schema = z.object({
  apiKey: z.string().min(1),
  endpoint: z.string().url(),
  deploymentName: z.string().min(1),
  dimensions: z.coerce.number().int().positive(),
})

type AzureOpenAIEmbeddingConfig = z.infer<typeof schema>

async function testConnection(config: AzureOpenAIEmbeddingConfig): Promise<void> {
  // Azure OpenAI embeddings endpoint:
  // POST {endpoint}/openai/deployments/{deploymentName}/embeddings?api-version=2024-06-01
  const url = `${config.endpoint}/openai/deployments/${config.deploymentName}/embeddings?api-version=2024-06-01`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: 'test',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Azure OpenAI connection test failed (${response.status}): ${errorText}`)
  }
}

export const azureOpenAIEmbeddingProvider: EmbeddingProviderDescriptor<AzureOpenAIEmbeddingConfig> =
  {
    id: 'azure_openai',
    displayName: 'Azure OpenAI',
    description: 'Azure OpenAI Service text embedding models',
    docsUrl:
      'https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/embeddings',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
      },
      {
        key: 'endpoint',
        label: 'Endpoint',
        type: 'url',
        required: true,
        placeholder: 'https://your-resource.openai.azure.com',
      },
      {
        key: 'deploymentName',
        label: 'Deployment Name',
        type: 'text',
        required: true,
        placeholder: 'text-embedding-3-small',
      },
      {
        key: 'dimensions',
        label: 'Dimensions',
        type: 'text',
        required: true,
        placeholder: '1536',
        description: 'Number of embedding dimensions (must match your deployment)',
      },
    ],
    schema,
    testConnection,
  }
