import { z } from 'zod'
import type { EmbeddingProviderDescriptor } from '../types'

const schema = z.object({
  projectId: z.string().min(1),
  location: z.string().min(1),
  model: z.string().min(1),
  dimensions: z.coerce.number().int().positive(),
  serviceAccountJson: z.record(z.string(), z.unknown()).optional(),
})

type VertexAIEmbeddingConfig = z.infer<typeof schema>

export const vertexAIEmbeddingProvider: EmbeddingProviderDescriptor<VertexAIEmbeddingConfig> = {
  id: 'vertex_ai',
  displayName: 'Vertex AI',
  description: 'Google Cloud Vertex AI text embedding models',
  docsUrl: 'https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings',
  fields: [
    {
      key: 'projectId',
      label: 'Project ID',
      type: 'text',
      required: true,
    },
    {
      key: 'location',
      label: 'Location',
      type: 'select',
      required: true,
      options: [
        { value: 'us-central1', label: 'us-central1' },
        { value: 'us-east1', label: 'us-east1' },
        { value: 'us-east5', label: 'us-east5' },
        { value: 'europe-west1', label: 'europe-west1' },
        { value: 'asia-northeast1', label: 'asia-northeast1' },
      ],
    },
    {
      key: 'model',
      label: 'Model',
      type: 'select',
      required: true,
      options: [
        { value: 'text-embedding-004', label: 'text-embedding-004' },
        { value: 'text-multilingual-embedding-002', label: 'text-multilingual-embedding-002' },
        { value: 'textembedding-gecko@003', label: 'textembedding-gecko@003' },
      ],
    },
    {
      key: 'dimensions',
      label: 'Dimensions',
      type: 'text',
      required: true,
      placeholder: '768',
      description: 'Number of embedding dimensions (must match your model)',
    },
    {
      key: 'serviceAccountJson',
      label: 'Service Account JSON',
      type: 'file-json',
      required: false,
      description:
        'Upload GCP service account key JSON file. If omitted, Application Default Credentials are used.',
    },
  ],
  schema,
}
