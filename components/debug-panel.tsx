"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Bug } from "lucide-react"
import type { EventMetrics } from "@/types/event-metrics"

interface DebugPanelProps {
  data: EventMetrics[]
}

export function DebugPanel({ data }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const checkOverlapData = () => {
    const overlapStats = data.map((event) => ({
      event_name: event.event_name,
      event_id_overlap: event.event_id_overlap,
      external_id_overlap: event.external_id_overlap,
      fbp_overlap: event.fbp_overlap,
    }))

    const hasOverlapData = overlapStats.some(
      (stat) => stat.event_id_overlap !== "N/A" || stat.external_id_overlap !== "N/A" || stat.fbp_overlap !== "N/A",
    )

    return { overlapStats, hasOverlapData }
  }

  const { overlapStats, hasOverlapData } = checkOverlapData()

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="p-4 cursor-pointer flex items-center justify-between" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center space-x-2">
          <Bug className="h-5 w-5 text-yellow-600" />
          <h3 className="text-sm font-medium text-yellow-800">Debug: Overlap Data Check</h3>
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              hasOverlapData ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {hasOverlapData ? "Data Found" : "No Data"}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>

      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="bg-white rounded border p-3">
            <h4 className="text-sm font-medium mb-2">Overlap Data by Event:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {overlapStats.map((stat, index) => (
                <div key={index} className="text-xs border-b border-gray-100 pb-1">
                  <div className="font-medium">{stat.event_name}</div>
                  <div className="text-gray-600 ml-2">
                    event_id: {stat.event_id_overlap} | external_id: {stat.external_id_overlap} | fbp:{" "}
                    {stat.fbp_overlap}
                  </div>
                </div>
              ))}
            </div>

            {!hasOverlapData && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
                <p className="font-medium text-red-800">Troubleshooting Steps:</p>
                <ol className="list-decimal list-inside mt-1 text-red-700 space-y-1">
                  <li>Check if deduplication.har contains "overlap" fields</li>
                  <li>Verify the JSON structure matches: payload.dedupeKeyStats.event_id.overlap</li>
                  <li>Ensure the API returned overlap data (may need to re-run dedupe check)</li>
                  <li>Check browser console for parsing errors</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
