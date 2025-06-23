"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from "lucide-react"
import type { EventMetrics } from "@/types/event-metrics"

interface RecommendationPanelProps {
  data: EventMetrics[]
}

interface EventRecommendation {
  eventName: string
  recommendations: string[]
  severity: number
}

export function RecommendationPanel({ data }: RecommendationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const generateRecommendations = (event: EventMetrics): string[] => {
    const recommendations: string[] = []

    // 1. Low coverage
    Object.keys(event).forEach((key) => {
      if (key.includes("_coverage_percentage")) {
        const value = event[key as keyof EventMetrics]
        if (typeof value === "number") {
          const identifier = key.replace("_coverage_percentage", "")
          let threshold = 80
          if (identifier === "phone") threshold = 60

          if (value < threshold) {
            recommendations.push(`Increase ${identifier} capture (only ${value}% present)`)
          }
        }
      }
    })

    // 2. Large Δ% S–B
    if (typeof event.server_vs_browser_diff_pct === "string" && event.server_vs_browser_diff_pct !== "N/A") {
      const numValue = Number.parseFloat(event.server_vs_browser_diff_pct.replace(/[^\d.-]/g, ""))
      if (!isNaN(numValue) && Math.abs(numValue) > 25) {
        recommendations.push("Mismatch in server vs browser counts – verify GTM/CAPI gateway")
      }
    }

    // 3. Low ARC
    if (typeof event["ARC (%)"] === "number" && event["ARC (%)"] < 1.0) {
      recommendations.push("CAPI not improving attribution — check dedupe keys + event match quality")
    }

    // 4. Dedupe flag
    if (event.hasDedupeIssue === true) {
      recommendations.push("Meta flagged deduplication — confirm event_id / external_id flow")
    }

    // 5. Low overlap
    const overlapKeys = ["event_id_overlap", "external_id_overlap", "fbp_overlap"]
    overlapKeys.forEach((key) => {
      const value = event[key as keyof EventMetrics]
      if (typeof value === "number" && value < 60) {
        const keyName = key.replace("_overlap", "")
        recommendations.push(`Poor ${keyName} overlap (${value}%) — consolidate hashing or sync IDs`)
      }
    })

    return recommendations
  }

  const eventRecommendations: EventRecommendation[] = data
    .map((event) => {
      const recommendations = generateRecommendations(event)
      return {
        eventName: String(event.event_name),
        recommendations,
        severity: recommendations.length,
      }
    })
    .filter((item) => item.recommendations.length > 0)
    .sort((a, b) => b.severity - a.severity)

  const topFiveIssues = eventRecommendations.slice(0, 5)
  const totalIssues = eventRecommendations.reduce((sum, item) => sum + item.recommendations.length, 0)

  return (
    <div className="bg-white rounded-lg shadow">
      <div
        className="p-6 border-b border-gray-200 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">Recommended Fixes</h2>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {totalIssues} issues found
          </span>
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </div>

      {isExpanded && (
        <div className="p-6">
          {eventRecommendations.length === 0 ? (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>All events are healthy! No recommendations at this time.</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top 5 Priority Issues */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Top 5 Priority Issues</h3>
                <div className="space-y-3">
                  {topFiveIssues.map((item, index) => (
                    <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{item.eventName}</h4>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {item.recommendations.length} issues
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {item.recommendations.map((rec, recIndex) => (
                          <li key={recIndex} className="text-sm text-gray-700 flex items-start">
                            <span className="text-red-500 mr-2">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Issues */}
              {eventRecommendations.length > 5 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">All Issues by Event</h3>
                  <div className="space-y-2">
                    {eventRecommendations.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-900">{item.eventName}</h4>
                          <span className="text-xs text-gray-500">{item.recommendations.length} issues</span>
                        </div>
                        <p className="text-sm text-gray-600">{item.recommendations.join("; ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
