/**
 * Document Upload Component
 * Drag-and-drop file upload with progress tracking
 */

'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useUploadDocuments } from '@/hooks/use-documents'
import { CheckCircle, FileText, Loader2, Upload, X, XCircle } from 'lucide-react'
import { useCallback, useState } from 'react'

interface DocumentUploadProps {
  sourceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FileWithStatus {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

const SUPPORTED_FORMATS = [
  '.txt',
  '.md',
  '.pdf',
  '.docx',
  '.csv',
  '.xlsx',
  '.xls',
  '.html',
  '.htm',
  '.rtf',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export function DocumentUpload({ sourceId, open, onOpenChange }: DocumentUploadProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [overrideExisting, setOverrideExisting] = useState(false)
  const uploadMutation = useUploadDocuments(sourceId)

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 50MB limit`
    }

    // Check file extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!SUPPORTED_FORMATS.includes(ext)) {
      return `Unsupported file type. Supported: ${SUPPORTED_FORMATS.join(', ')}`
    }

    return null
  }

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return

    const newFiles: FileWithStatus[] = []

    Array.from(fileList).forEach((file) => {
      const error = validateFile(file)
      newFiles.push({
        file,
        status: error ? 'error' : 'pending',
        error: error || undefined,
      })
    })

    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [handleFiles]
  )

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    const validFiles = files.filter((f) => f.status !== 'error').map((f) => f.file)

    if (validFiles.length === 0) return

    // Mark all as uploading
    setFiles((prev) =>
      prev.map((f) => (f.status !== 'error' ? { ...f, status: 'uploading' } : f))
    )

    try {
      await uploadMutation.mutateAsync({
        files: validFiles,
        override: overrideExisting
      })

      // Mark all as success
      setFiles((prev) =>
        prev.map((f) => (f.status === 'uploading' ? { ...f, status: 'success' } : f))
      )

      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false)
        setFiles([])
        setOverrideExisting(false)
      }, 1500)
    } catch (error) {
      // Mark all as error
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? { ...f, status: 'error', error: 'Upload failed' }
            : f
        )
      )
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validFiles = files.filter((f) => f.status !== 'error')
  const uploadProgress = files.length > 0
    ? (files.filter((f) => f.status === 'success').length / files.length) * 100
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload documents to index and make searchable. Max 50MB per file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative border-2 border-dashed rounded-lg p-8
              transition-colors cursor-pointer
              ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }
            `}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              multiple
              accept={SUPPORTED_FORMATS.join(',')}
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="flex flex-col items-center text-center space-y-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Drop files here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supported: TXT, PDF, DOCX, CSV, XLSX, HTML, RTF, MD
                </p>
              </div>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {files.map((fileWithStatus, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileWithStatus.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileWithStatus.file.size)}
                      </p>
                      {fileWithStatus.error && (
                        <p className="text-xs text-red-600">
                          {fileWithStatus.error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {fileWithStatus.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(index)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {fileWithStatus.status === 'uploading' && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                    {fileWithStatus.status === 'success' && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {fileWithStatus.status === 'error' && (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Override Option */}
          {files.length > 0 && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="override-mode" className="text-sm font-medium">
                  Override existing documents
                </Label>
                <p className="text-xs text-muted-foreground">
                  Replace documents with the same content if they already exist
                </p>
              </div>
              <Switch
                id="override-mode"
                checked={overrideExisting}
                onCheckedChange={setOverrideExisting}
                disabled={uploadMutation.isPending}
              />
            </div>
          )}

          {/* Upload Progress */}
          {uploadMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setFiles([])
            }}
            disabled={uploadMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={validFiles.length === 0 || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {validFiles.length > 0 && `(${validFiles.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
