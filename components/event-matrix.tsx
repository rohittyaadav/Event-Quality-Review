"use client"

import { useState, useMemo } from "react"
import { ChevronUp, ChevronDown, Search, Filter } from "lucide-react"
import type { EventMetrics } from "@/types/event-metrics"

interface EventMatrixProps {
  data: EventMetrics[]
}

export function EventMatrix({ data }: EventMatrixProps) {
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [filter, setFilter] = useState("")
  const [funnelFilter, setFunnelFilter] = useState<string>("all")

  // Define funnel stages
  const funnelStages = {
    all: "All Events",
    awareness: "Awareness (PageView, ViewContent)",
    consideration: "Consideration (AddToCart, InitiateCheckout)",
    conversion: "Conversion (Purchase, Lead, CompleteRegistration)",
  }

  const getEventFunnelStage = (eventName: string) => {
    const name = eventName.toLowerCase()
    if (name.includes("pageview") || name.includes("viewcontent")) return "awareness"
    if (name.includes("addtocart") || name.includes("initiatecheckout")) return "consideration"
    if (name.includes("purchase") || name.includes("lead") || name.includes("completeregistration")) return "conversion"
    return "other"
  }

  // Get all possible columns from the data
  const columns = useMemo(() => {
    const allKeys = new Set<string>()
    data.forEach((row) => {
      Object.keys(row).forEach((key) => allKeys.add(key))
    })

    // Define column order per blueprint
    const qualityColumns = ["compositeScore", "emqRating"]
    const volumeColumns = ["browser_hits", "server_hits", "server_vs_browser_diff_pct"]
    const attributionColumns = ["ARC (%)"]
    const deduplicationColumns = ["hasDedupeIssue", "event_id_overlap", "external_id_overlap", "fbp_overlap"]

    const identifierColumns = Array.from(allKeys)
      .filter((key) => key.includes("_coverage_percentage"))
      .sort()

    const recommendationColumns = Array.from(allKeys)
      .filter((key) => key.includes("_recommendation_or_issue"))
      .sort()

    return [
      "event_name",
      ...qualityColumns.filter((col) => allKeys.has(col)),
      ...volumeColumns.filter((col) => allKeys.has(col)),
      ...attributionColumns.filter((col) => allKeys.has(col)),
      ...deduplicationColumns.filter((col) => allKeys.has(col)),
      ...identifierColumns,
      ...recommendationColumns,
    ]
  }, [data])

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((row) => {
      const matchesSearch = Object.values(row).some((value) =>
        String(value).toLowerCase().includes(filter.toLowerCase()),
      )

      const matchesFunnel = funnelFilter === "all" || getEventFunnelStage(String(row.event_name)) === funnelFilter

      return matchesSearch && matchesFunnel
    })

    if (sortField) {
      filtered.sort((a, b) => {
        const aVal = a[sortField as keyof EventMetrics]
        const bVal = b[sortField as keyof EventMetrics]

        if (aVal === "N/A" && bVal === "N/A") return 0
        if (aVal === "N/A") return 1
        if (bVal === "N/A") return -1

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal
        }

        const aStr = String(aVal)
        const bStr = String(bVal)
        return sortDirection === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
      })
    }

    return filtered
  }, [data, filter, funnelFilter, sortField, sortDirection])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const formatColumnName = (column: string) => {
    const formatted = column.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    if (column === "server_vs_browser_diff_pct") return "Δ% Server-Browser"
    return formatted
  }

  const getCellValue = (row: EventMetrics, column: string) => {
    const value = row[column as keyof EventMetrics]
    return value !== undefined ? value : "N/A"
  }

  const getCellClassName = (value: any, column: string) => {
    if (value === "N/A") return ""

    const numValue = typeof value === "number" ? value : Number.parseFloat(String(value))

    // Quality thresholds
    if (column === "compositeScore" && !isNaN(numValue)) {
      return numValue < 0.7
        ? "px-1 rounded bg-red-600 text-white text-xs"
        : "px-1 rounded bg-green-600 text-white text-xs"
    }

    if (column === "emqRating" && typeof value === "string") {
      return ["POOR", "FAIR"].includes(value)
        ? "px-1 rounded bg-red-600 text-white text-xs"
        : "px-1 rounded bg-green-600 text-white text-xs"
    }

    // Volume thresholds
    if ((column === "browser_hits" || column === "server_hits") && !isNaN(numValue)) {
      return numValue < 100
        ? "px-1 rounded bg-red-600 text-white text-xs"
        : "px-1 rounded bg-green-600 text-white text-xs"
    }

    if (column === "server_vs_browser_diff_pct" && typeof value === "string" && value !== "N/A") {
      const numValue = Number.parseFloat(value.replace(/[^\d.-]/g, ""))
      if (!isNaN(numValue)) {
        return Math.abs(numValue) > 25
          ? "px-1 rounded bg-red-600 text-white text-xs"
          : "px-1 rounded bg-green-600 text-white text-xs"
      }
    }

    // Attribution threshold
    if (column === "ARC (%)" && !isNaN(numValue)) {
      return numValue < 1.0
        ? "px-1 rounded bg-red-600 text-white text-xs"
        : "px-1 rounded bg-green-600 text-white text-xs"
    }

    // Deduplication thresholds
    if (column === "hasDedupeIssue" && typeof value === "boolean") {
      return value ? "px-1 rounded bg-red-600 text-white text-xs" : "px-1 rounded bg-green-600 text-white text-xs"
    }

    if (column.includes("_overlap") && !isNaN(numValue)) {
      return numValue < 60
        ? "px-1 rounded bg-red-600 text-white text-xs"
        : "px-1 rounded bg-green-600 text-white text-xs"
    }

    // Identifier coverage thresholds
    if (column.includes("_coverage_percentage") && !isNaN(numValue)) {
      let threshold = 80 // default
      if (column.includes("email")) threshold = 80
      if (column.includes("phone")) threshold = 60

      return numValue < threshold
        ? "px-1 rounded bg-red-600 text-white text-xs"
        : "px-1 rounded bg-green-600 text-white text-xs"
    }

    return ""
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Matrix</h2>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter events..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={funnelFilter}
              onChange={(e) => setFunnelFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              {Object.entries(funnelStages).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-500 flex items-center">{filteredAndSortedData.length} events</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{formatColumnName(column)}</span>
                    {sortField === column &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map((column) => {
                  const value = getCellValue(row, column)
                  const cellClassName = getCellClassName(value, column)

                  return (
                    <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cellClassName ? (
                        <span className={cellClassName}>{value}</span>
                      ) : column.includes("_recommendation_or_issue") ? (
                        <div className="max-w-xs truncate" title={String(value)}>
                          {value}
                        </div>
                      ) : (
                        value
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
