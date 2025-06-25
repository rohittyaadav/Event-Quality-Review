"use client"

import type React from "react"
import { useCallback } from "react"
import { Upload, AlertCircle, CheckCircle } from "lucide-react"

interface FileUploadProps {
  onFilesUpload: (files: File[]) => void
  loading: boolean
  error: string | null
  uploadedFiles: string[]
}

export function FileUpload({ onFilesUpload, loading, error, uploadedFiles }: FileUploadProps) {
  const requiredFiles = [
    { key: "setup_quality", name: "setup_quality.har", description: "Quality scores and identifier coverage" },
    { key: "new_har_event_count", name: "new_har_event_count.har", description: "Browser/server hit counts" },
    {
      key: "additional_attributed_conversions",
      name: "additional_attributed_conversions.har",
      description: "ARC % + dedupe flag",
    },
    { key: "deduplication", name: "deduplication.har", description: "Coverage & overlap for dedupe keys" },
  ]

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files)
      onFilesUpload(files)
    },
    [onFilesUpload],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files)
        onFilesUpload(files)
      }
    },
    [onFilesUpload],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  return (
    <div className="space-y-4 mb-8">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-4">
          <div>
            <p className="text-lg font-medium text-gray-900">Upload 4 HAR files in sequence</p>
            <p className="text-sm text-gray-500">Drag and drop your HAR files here, or click to select</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {requiredFiles.map((file, index) => (
              <div key={file.key} className="flex items-center space-x-2 text-left">
                <div className="flex-shrink-0">
                  {uploadedFiles.includes(file.key) ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                      <span className="text-xs text-gray-500">{index + 1}</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{file.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <input
          type="file"
          multiple
          accept=".har,.json"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
        >
          Select Files
        </label>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Parsing files and generating health report...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}
    </div>
  )
}
