import { z } from 'zod'
import type { RagEngineProviderDescriptor } from '../types'

const schema = z.object({
  projectId: z.string().min(1),
  location: z.string().min(1),
  ragCorpusId: z.string().min(1),
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
      placeholder: 'my-gcp-project',
    },
    {
      key: 'location',
      label: 'Location',
      type: 'select',
      required: true,
      options: [
        // United States
        { value: 'us-central1', label: 'us-central1 (Iowa)' },
        { value: 'us-east1', label: 'us-east1 (South Carolina)' },
        { value: 'us-east4', label: 'us-east4 (Northern Virginia)' },
        { value: 'us-east5', label: 'us-east5 (Columbus)' },
        { value: 'us-south1', label: 'us-south1 (Dallas)' },
        { value: 'us-west1', label: 'us-west1 (Oregon)' },
        { value: 'us-west2', label: 'us-west2 (Los Angeles)' },
        { value: 'us-west3', label: 'us-west3 (Salt Lake City)' },
        { value: 'us-west4', label: 'us-west4 (Las Vegas)' },
        // Canada
        { value: 'northamerica-northeast1', label: 'northamerica-northeast1 (Montréal)' },
        { value: 'northamerica-northeast2', label: 'northamerica-northeast2 (Toronto)' },
        // South America
        { value: 'southamerica-east1', label: 'southamerica-east1 (São Paulo)' },
        { value: 'southamerica-west1', label: 'southamerica-west1 (Santiago)' },
        // Europe
        { value: 'europe-central2', label: 'europe-central2 (Warsaw)' },
        { value: 'europe-north1', label: 'europe-north1 (Finland)' },
        { value: 'europe-southwest1', label: 'europe-southwest1 (Madrid)' },
        { value: 'europe-west1', label: 'europe-west1 (Belgium)' },
        { value: 'europe-west2', label: 'europe-west2 (London)' },
        { value: 'europe-west3', label: 'europe-west3 (Frankfurt)' },
        { value: 'europe-west4', label: 'europe-west4 (Netherlands)' },
        { value: 'europe-west6', label: 'europe-west6 (Zürich)' },
        { value: 'europe-west8', label: 'europe-west8 (Milan)' },
        { value: 'europe-west9', label: 'europe-west9 (Paris)' },
        { value: 'europe-west10', label: 'europe-west10 (Berlin)' },
        { value: 'europe-west12', label: 'europe-west12 (Turin)' },
        // Asia Pacific
        { value: 'asia-east1', label: 'asia-east1 (Taiwan)' },
        { value: 'asia-east2', label: 'asia-east2 (Hong Kong)' },
        { value: 'asia-northeast1', label: 'asia-northeast1 (Tokyo)' },
        { value: 'asia-northeast2', label: 'asia-northeast2 (Osaka)' },
        { value: 'asia-northeast3', label: 'asia-northeast3 (Seoul)' },
        { value: 'asia-south1', label: 'asia-south1 (Mumbai)' },
        { value: 'asia-south2', label: 'asia-south2 (Delhi)' },
        { value: 'asia-southeast1', label: 'asia-southeast1 (Singapore)' },
        { value: 'asia-southeast2', label: 'asia-southeast2 (Jakarta)' },
        { value: 'australia-southeast1', label: 'australia-southeast1 (Sydney)' },
        { value: 'australia-southeast2', label: 'australia-southeast2 (Melbourne)' },
        // Middle East
        { value: 'me-central1', label: 'me-central1 (Doha)' },
        { value: 'me-central2', label: 'me-central2 (Dammam)' },
        { value: 'me-west1', label: 'me-west1 (Tel Aviv)' },
        // Africa
        { value: 'africa-south1', label: 'africa-south1 (Johannesburg)' },
      ],
    },
    {
      key: 'ragCorpusId',
      label: 'RAG Corpus ID',
      type: 'text',
      required: true,
      placeholder: '4611686018427387904',
      description: 'The numeric ID of the RAG corpus. The full resource path is constructed from your Project ID and Location.',
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

/**
 * Build the full Vertex AI RAG corpus resource name from its components.
 * e.g. projects/my-project/locations/us-east5/ragCorpora/4611686018427387904
 */
export function buildRagCorpusName(projectId: string, location: string, ragCorpusId: string): string {
  return `projects/${projectId}/locations/${location}/ragCorpora/${ragCorpusId}`
}
