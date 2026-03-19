import { z } from 'zod'
import type { VectorStoreProviderDescriptor } from '../types'

const schema = z.object({
  projectId: z.string().min(1),
  location: z.string().min(1),
  indexEndpointId: z.string().min(1),
  deployedIndexId: z.string().min(1),
  serviceAccountJson: z.record(z.string(), z.unknown()).optional(),
})

type VertexAIVectorSearchConfig = z.infer<typeof schema>

export const vertexAIVectorSearchProvider: VectorStoreProviderDescriptor<VertexAIVectorSearchConfig> =
  {
    id: 'vertex_ai_vector_search',
    displayName: 'Vertex AI Vector Search',
    description: 'Google Cloud Vertex AI Vector Search for scalable, low-latency vector similarity search',
    docsUrl:
      'https://cloud.google.com/vertex-ai/docs/vector-search/overview',
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
        key: 'indexEndpointId',
        label: 'Index Endpoint ID',
        type: 'text',
        required: true,
      },
      {
        key: 'deployedIndexId',
        label: 'Deployed Index ID',
        type: 'text',
        required: true,
      },
      {
        key: 'serviceAccountJson',
        label: 'Service Account JSON',
        type: 'file-json',
        required: false,
        description:
          'GCP service account key JSON. If omitted, Application Default Credentials are used.',
      },
    ],
    schema,
  }
