"use client"

import { useState } from "react"
import { GlobalScorecards } from "@/components/global-scorecards"
import { EventMatrix } from "@/components/event-matrix"
import { RecommendationPanel } from "@/components/recommendation-panel"
import { removeRecommendationColumns } from "@/lib/har-parser"
import type { EventMetrics } from "@/types/event-metrics"

interface DashboardProps {
  data: EventMetrics[]
}

export function Dashboard({ data }: DashboardProps) {
  const [hideRecommendations, setHideRecommendations] = useState(false)

  const processedData = hideRecommendations ? removeRecommendationColumns(data) : data

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={hideRecommendations}
              onChange={(e) => setHideRecommendations(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Hide recommendation/issue columns</span>
          </label>

          <div className="text-xs text-gray-500">
            {hideRecommendations ? "Showing core metrics only" : "Showing all columns including recommendations"}
          </div>
        </div>
      </div>

      {/* A. Global Scorecards */}
      <GlobalScorecards data={processedData} />

      {/* B. Event Matrix (core) */}
      <EventMatrix data={processedData} />

      {/* D. Recommended Fixes */}
      <RecommendationPanel data={processedData} />
    </div>
  )
}
