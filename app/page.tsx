"use client"

import { useState } from "react"
import { FileUpload } from "@/components/file-upload"
import { Dashboard } from "@/components/dashboard"
import { DebugPanel } from "@/components/debug-panel"
import { parseHarFiles } from "@/lib/har-parser"
import type { EventMetrics } from "@/types/event-metrics"

export default function PixelCAPIHealthDashboard() {
  const [data, setData] = useState<EventMetrics[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)

  const handleFilesUpload = async (files: File[]) => {
    if (files.length !== 4) {
      setError("Please upload exactly 4 HAR files.")
      return
    }

    // Enforce upload sequence
    const requiredFiles = ["setup_quality", "new_har_event_count", "additional_attributed_conversions", "deduplication"]
    const uploadedFileTypes = files.map((f) => {
      for (const type of requiredFiles) {
        if (f.name.includes(type)) return type
      }
      return "unknown"
    })

    const missingFiles = requiredFiles.filter((type) => !uploadedFileTypes.includes(type))
    if (missingFiles.length > 0) {
      setError(`Missing required files: ${missingFiles.join(", ")}`)
      return
    }

    setLoading(true)
    setError(null)
    setUploadedFiles(uploadedFileTypes)

    try {
      const parsedData = await parseHarFiles(files)
      setData(parsedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while parsing files")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Pixel + CAPI Implementation Health</h1>
              <p className="text-gray-600">
                One glance tells you whether every standard Meta/TikTok/Snap Pixel event is firing, de-duping, boosting
                attribution via CAPI, and collecting enough identifiers.
              </p>
            </div>

            {data.length > 0 && (
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
              >
                {showDebug ? "Hide" : "Show"} Debug
              </button>
            )}
          </div>
        </div>

        <FileUpload onFilesUpload={handleFilesUpload} loading={loading} error={error} uploadedFiles={uploadedFiles} />

        {data.length > 0 && (
          <div className="space-y-6">
            {showDebug && <DebugPanel data={data} />}
            <Dashboard data={data} />
          </div>
        )}
      </div>
    </div>
  )
}
