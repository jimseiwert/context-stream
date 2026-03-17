// Google Vertex AI Embedding Provider
// Supports both access token (short-lived) and service account JSON credentials.

import type { EmbeddingConfig } from './config'
import { EmbeddingProvider, ChunkWithEmbedding } from './provider'
import { chunkText } from './chunker'

export class VertexAIEmbeddingProvider implements EmbeddingProvider {
  private projectId: string
  private location: string
  private model: string
  private dimensions: number
  private accessToken?: string
  private serviceAccountJson?: object

  constructor(config: EmbeddingConfig) {
    const {
      projectId,
      location,
      accessToken,
      serviceAccountJson,
    } = config.connectionConfig as {
      projectId?: string
      location?: string
      accessToken?: string
      serviceAccountJson?: object
    }

    if (!projectId) {
      throw new Error('Vertex AI requires connectionConfig.projectId')
    }
    if (!location) {
      throw new Error('Vertex AI requires connectionConfig.location')
    }
    if (!accessToken && !serviceAccountJson) {
      throw new Error(
        'Vertex AI requires either connectionConfig.accessToken or connectionConfig.serviceAccountJson'
      )
    }

    this.projectId = projectId
    this.location = location
    this.model = config.model
    this.dimensions = config.dimensions
    this.accessToken = accessToken
    this.serviceAccountJson = serviceAccountJson
  }

  private getEndpoint(): string {
    return (
      `https://${this.location}-aiplatform.googleapis.com/v1` +
      `/projects/${this.projectId}/locations/${this.location}` +
      `/publishers/google/models/${this.model}:predict`
    )
  }

  /**
   * Get a Bearer token — either the stored access token, or exchange the
   * service account JSON for a short-lived token via the Google OAuth2 endpoint.
   */
  private async getBearerToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken
    }

    if (!this.serviceAccountJson) {
      throw new Error('No Vertex AI credentials available')
    }

    // Exchange service account JSON for an access token using the
    // google-auth-library JWT flow if available, otherwise fall back to the
    // metadata server (works inside GCP environments).
    try {
      // google-auth-library is an optional peer dependency.
      // The eslint/ts-ignore suppresses the missing-module error at compile time;
      // the catch block below handles the runtime case where it isn't installed.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { GoogleAuth } = await import(/* webpackIgnore: true */ 'google-auth-library') // eslint-disable-line import/no-extraneous-dependencies
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      const auth = new GoogleAuth({
        credentials: this.serviceAccountJson,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const client = await auth.getClient()
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const tokenResponse = await client.getAccessToken()
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!tokenResponse?.token) {
        throw new Error('google-auth-library returned empty token')
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return tokenResponse.token as string
    } catch (importErr: unknown) {
      const message = importErr instanceof Error ? importErr.message : String(importErr)
      if (message.includes('Cannot find module')) {
        // google-auth-library not installed — try metadata server
        const metaRes = await fetch(
          'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
          { headers: { 'Metadata-Flavor': 'Google' } }
        )
        if (!metaRes.ok) {
          throw new Error(
            'google-auth-library is not installed and metadata server is unavailable. ' +
              'Install google-auth-library or provide a short-lived accessToken instead.'
          )
        }
        const data = (await metaRes.json()) as { access_token: string }
        return data.access_token
      }
      throw importErr
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []

    const token = await this.getBearerToken()

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: texts.map((text) => ({ content: text })),
          parameters: { outputDimensionality: this.dimensions },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Vertex AI API error (${response.status}): ${errorText}`)
      }

      const data = (await response.json()) as {
        predictions: Array<{ embeddings: { values: number[] } }>
      }

      return data.predictions.map((p) => p.embeddings.values)
    } catch (error) {
      console.error('Failed to generate Vertex AI embeddings:', error)
      throw new Error(`Vertex AI embedding generation failed: ${error}`)
    }
  }

  async chunkAndEmbed(text: string): Promise<ChunkWithEmbedding[]> {
    const chunks = chunkText(text, { chunkSize: 400, overlap: 50 })
    if (chunks.length === 0) return []

    const allEmbeddings: number[][] = []

    for (const chunk of chunks) {
      const MAX_CHARS = 3000
      const content = chunk.length > MAX_CHARS ? chunk.substring(0, MAX_CHARS) : chunk
      if (content.length < chunk.length) {
        console.log(`[Vertex AI Embeddings] Chunk truncated from ${chunk.length} to ${MAX_CHARS} chars`)
      }
      const embeddings = await this.generateEmbeddings([content])
      allEmbeddings.push(...embeddings)
    }

    return chunks.map((chunk, index) => ({
      content: chunk,
      embedding: allEmbeddings[index],
    }))
  }
}
