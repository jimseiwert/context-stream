/**
 * Document List Component
 * Displays uploaded documents with metadata
 */

'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocuments, useDeleteDocument } from '@/hooks/use-documents'
import { format } from 'date-fns'
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'

interface DocumentListProps {
  sourceId: string
}

export function DocumentList({ sourceId }: DocumentListProps) {
  const [page, setPage] = useState(1)
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; name: string } | null>(null)
  const { data, isLoading } = useDocuments(sourceId, page, 20)
  const deleteDocument = useDeleteDocument(sourceId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>No documents uploaded yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Upload documents to get started
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { documents, pagination } = data

  const getDocumentTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      PDF: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      DOCX: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      XLSX: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      TXT: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      MD: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      CSV: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      HTML: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      RTF: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    }

    const color = colors[type] || 'bg-gray-100 text-gray-800'

    return <Badge className={color}>{type}</Badge>
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>
          {pagination.total} document{pagination.total !== 1 ? 's' : ''} uploaded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium truncate">{doc.filename}</p>
                    {getDocumentTypeBadge(doc.type)}
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>{formatFileSize(doc.size)}</span>
                    <span>•</span>
                    <span>{doc.chunksCount} chunks</span>
                    <span>•</span>
                    <span>
                      {format(new Date(doc.uploadedAt), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>

                  {/* Indexing Status */}
                  <div className="flex items-center space-x-2 text-xs">
                    {doc.indexedAt ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">
                          Indexed{' '}
                          {format(new Date(doc.indexedAt), 'MMM d, HH:mm')}
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 text-yellow-600" />
                        <span className="text-yellow-600">Processing...</span>
                      </>
                    )}
                  </div>

                  {/* Metadata */}
                  {doc.metadata && (
                    <div className="text-xs text-muted-foreground">
                      {doc.metadata.pages && (
                        <span>{doc.metadata.pages} pages</span>
                      )}
                      {doc.metadata.imagesProcessed > 0 && (
                        <>
                          <span> • </span>
                          <span>{doc.metadata.imagesProcessed} images processed</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Delete Button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setDocumentToDelete({ id: doc.id, name: doc.filename })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{documentToDelete?.name}</strong>?
              <div className="mt-4 space-y-2 text-sm">
                <p className="font-medium text-destructive">⚠️ This action cannot be undone!</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>This will permanently delete the document</li>
                  <li>All associated chunks and embeddings will be removed</li>
                  <li>The document will no longer be searchable</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDocument.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (documentToDelete) {
                  await deleteDocument.mutateAsync(documentToDelete.id)
                  setDocumentToDelete(null)
                }
              }}
              disabled={deleteDocument.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDocument.isPending ? 'Deleting...' : 'Delete Document'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
