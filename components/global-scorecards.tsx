"use client"

import { TrendingUp, TrendingDown, Activity, Target, Shield } from "lucide-react"
import type { EventMetrics } from "@/types/event-metrics"

interface GlobalScorecardsProps {
  data: EventMetrics[]
}

export function GlobalScorecards({ data }: GlobalScorecardsProps) {
  // Calculate KPIs
  const validCompositeScores = data.map((d) => d.compositeScore).filter((score) => typeof score === "number")

  const overallCompositeScore =
    validCompositeScores.length > 0
      ? Math.round((validCompositeScores.reduce((sum, score) => sum + score, 0) / validCompositeScores.length) * 100) /
        100
      : 0

  const validBrowserHits = data.map((d) => d.browser_hits).filter((hits) => typeof hits === "number")

  const avgBrowserHits =
    validBrowserHits.length > 0
      ? Math.round(validBrowserHits.reduce((sum, hits) => sum + hits, 0) / validBrowserHits.length)
      : 0

  const validServerHits = data.map((d) => d.server_hits).filter((hits) => typeof hits === "number")

  const avgServerHits =
    validServerHits.length > 0
      ? Math.round(validServerHits.reduce((sum, hits) => sum + hits, 0) / validServerHits.length)
      : 0

  const validArcValues = data.map((d) => d["ARC (%)"]).filter((arc) => typeof arc === "number")

  const meanArc =
    validArcValues.length > 0
      ? Math.round((validArcValues.reduce((sum, arc) => sum + arc, 0) / validArcValues.length) * 100) / 100
      : 0

  const dedupePassRate =
    data.length > 0 ? Math.round((data.filter((d) => d.hasDedupeIssue === false).length / data.length) * 100) : 0

  const getScoreColor = (score: number, thresholds: { red: number; amber: number }) => {
    if (score >= thresholds.amber) return "bg-green-600"
    if (score >= thresholds.red) return "bg-amber-500"
    return "bg-red-600"
  }

  const getHitsColor = (hits: number) => (hits >= 100 ? "bg-green-600" : "bg-red-600")
  const getArcColor = (arc: number) => (arc >= 1 ? "bg-green-600" : "bg-red-600")
  const getDedupeColor = (rate: number) => (rate >= 90 ? "bg-green-600" : "bg-red-600")

  const scorecards = [
    {
      title: "Overall Composite Score",
      value: overallCompositeScore.toFixed(2),
      icon: Target,
      color: getScoreColor(overallCompositeScore, { red: 0.7, amber: 0.8 }),
      description: "Mean quality across all events",
    },
    {
      title: "Avg Browser Hits",
      value: avgBrowserHits.toLocaleString(),
      icon: Activity,
      color: getHitsColor(avgBrowserHits),
      description: "Average pixel events (24h)",
    },
    {
      title: "Avg Server Hits",
      value: avgServerHits.toLocaleString(),
      icon: TrendingUp,
      color: getHitsColor(avgServerHits),
      description: "Average CAPI events (24h)",
    },
    {
      title: "Mean ARC %",
      value: `${meanArc}%`,
      icon: TrendingDown,
      color: getArcColor(meanArc),
      description: "Attribution boost from CAPI",
    },
    {
      title: "Dedup Pass Rate",
      value: `${dedupePassRate}%`,
      icon: Shield,
      color: getDedupeColor(dedupePassRate),
      description: "Events without dedupe issues",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {scorecards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <card.icon className="h-8 w-8 text-gray-400" />
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white ${card.color}`}
                >
                  {card.value}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 mt-1">{card.title}</p>
              <p className="text-xs text-gray-500">{card.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
