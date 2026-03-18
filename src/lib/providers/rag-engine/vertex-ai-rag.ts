import { z } from 'zod'
import type { RagEngineProviderDescriptor } from '../types'

const schema = z.object({
  projectId: z.string().min(1),
  location: z.string().min(1),
  ragCorpusName: z.string().min(1),
  serviceAccountJson: z.record(z.string(), z.unknown()).optional(),
})

type VertexAIRagEngineConfig = z.infer<typeof schema>

export const vertexAIRagEngineProvider: RagEngineProviderDescriptor<VertexAIRagEngineConfig> = {
  id: 'vertex_ai_rag_engine',
  displayName: 'Vertex AI RAG Engine',
  description:
    'Google Cloud full-pipeline RAG — handles chunking, embedding, storage, and retrieval internally',
  docsUrl: 'https://cloud.google.com/vertex-ai/generative-ai/docs/rag-overview',
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
        { value: 'europe-west1', label: 'europe-west1' },
        { value: 'asia-northeast1', label: 'asia-northeast1' },
      ],
    },
    {
      key: 'ragCorpusName',
      label: 'RAG Corpus Name',
      type: 'text',
      required: true,
      placeholder: 'projects/.../locations/.../ragCorpora/...',
      description: 'Full resource name of the RAG corpus',
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
