import { z } from 'zod'
import type { VectorStoreProviderDescriptor } from '../types'

const schema = z.object({
  connectionString: z.string().min(1),
  tableName: z.string().optional(),
})

type PgvectorConfig = z.infer<typeof schema>

export const pgvectorProvider: VectorStoreProviderDescriptor<PgvectorConfig> = {
  id: 'pgvector',
  displayName: 'pgvector (PostgreSQL)',
  description: 'PostgreSQL with the pgvector extension for vector similarity search',
  docsUrl: 'https://github.com/pgvector/pgvector',
  fields: [
    {
      key: 'connectionString',
      label: 'Connection String',
      type: 'password',
      required: true,
      placeholder: 'postgresql://user:pass@host:5432/dbname',
      description: 'PostgreSQL connection string with pgvector extension',
    },
    {
      key: 'tableName',
      label: 'Table Name',
      type: 'text',
      required: false,
      placeholder: 'chunks',
      description: 'Table that holds the vector column (default: chunks)',
    },
  ],
  schema,
}
