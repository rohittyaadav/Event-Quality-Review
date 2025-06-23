"use client"

import { useState, useMemo } from "react"
import { ChevronUp, ChevronDown, Search } from "lucide-react"
import type { EventMetrics } from "@/types/event-metrics"

interface DataTableProps {
  data: EventMetrics[]
}

export function DataTable({ data }: DataTableProps) {
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [filter, setFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Get all possible columns from the data
  const columns = useMemo(() => {
    const allKeys = new Set<string>()
    data.forEach((row) => {
      Object.keys(row).forEach((key) => allKeys.add(key))
    })

    // Define column order
    const fixedColumns = [
      "event_name",
      "compositeScore",
      "emqRating",
      "browser_hits",
      "server_hits",
      "server_vs_browser_diff_pct",
      "ARC (%)",
      "hasDedupeIssue",
      "event_id_serverCoverage",
      "event_id_browserCoverage",
      "event_id_overlap",
      "external_id_serverCoverage",
      "external_id_browserCoverage",
      "external_id_overlap",
      "fbp_serverCoverage",
      "fbp_browserCoverage",
      "fbp_overlap",
    ]

    const identifierColumns = Array.from(allKeys)
      .filter((key) => key.includes("_coverage_percentage") || key.includes("_recommendation_or_issue"))
      .sort((a, b) => {
        // Sort coverage columns before recommendation columns for same identifier
        const aBase = a.replace(/_coverage_percentage|_recommendation_or_issue/, "")
        const bBase = b.replace(/_coverage_percentage|_recommendation_or_issue/, "")

        if (aBase === bBase) {
          return a.includes("_coverage_percentage") ? -1 : 1
        }
        return aBase.localeCompare(bBase)
      })

    return [...fixedColumns.filter((col) => allKeys.has(col)), ...identifierColumns]
  }, [data])

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(filter.toLowerCase())),
    )

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
  }, [data, filter, sortField, sortDirection])

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredAndSortedData.slice(startIndex, startIndex + pageSize)
  }, [filteredAndSortedData, currentPage])

  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const formatColumnName = (column: string) => {
    return column.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getCellValue = (row: EventMetrics, column: string) => {
    const value = row[column as keyof EventMetrics]
    return value !== undefined ? value : "N/A"
  }

  const getCellClassName = (value: any, column: string) => {
    if (value === "N/A") return ""

    const numValue = typeof value === "number" ? value : Number.parseFloat(String(value))

    if (column === "compositeScore" && !isNaN(numValue)) {
      return numValue < 0.7
        ? "px-1 rounded bg-red-600 text-white text-xs"
        : "px-1 rounded bg-green-600 text-white text-xs"
    }

    if (column === "server_vs_browser_diff_pct" && typeof value === "string" && value !== "N/A") {
      const numValue = Number.parseFloat(value.replace(/[^\d.-]/g, "")) // Extract numeric value
      if (!isNaN(numValue)) {
        return Math.abs(numValue) > 25
          ? "px-1 rounded bg-red-600 text-white text-xs"
          : "px-1 rounded bg-green-600 text-white text-xs"
      }
    }

    if (column === "ARC (%)" && !isNaN(numValue)) {
      return numValue < 1.0
        ? "px-1 rounded bg-red-600 text-white text-xs"
        : "px-1 rounded bg-green-600 text-white text-xs"
    }

    return ""
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter table..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="text-sm text-gray-500">{filteredAndSortedData.length} events</div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
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
              {paginatedData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {columns.map((column) => {
                    const value = getCellValue(row, column)
                    const cellClassName = getCellClassName(value, column)

                    return (
                      <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cellClassName ? <span className={cellClassName}>{value}</span> : value}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-medium">{Math.min(currentPage * pageSize, filteredAndSortedData.length)}</span>{" "}
                  of <span className="font-medium">{filteredAndSortedData.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
