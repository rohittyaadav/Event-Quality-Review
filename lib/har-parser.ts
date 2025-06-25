import type { EventMetrics } from "@/types/event-metrics"

export async function parseHarFiles(files: File[]): Promise<EventMetrics[]> {
  const eventMap = new Map<string, Partial<EventMetrics>>()

  for (const file of files) {
    try {
      const content = await file.text()
      const harData = JSON.parse(content)

      if (file.name.includes("setup_quality")) {
        parseSetupQuality(harData, eventMap)
      } else if (file.name.includes("new_har_event_count")) {
        parseEventCount(harData, eventMap)
      } else if (file.name.includes("additional_attributed_conversions")) {
        parseAdditionalConversions(harData, eventMap)
      } else if (file.name.includes("deduplication")) {
        parseDeduplication(harData, eventMap)
      }
    } catch (error) {
      throw new Error(`Invalid JSON in ${file.name}`)
    }
  }

  let events = Array.from(eventMap.values()).map((event) => ({
    event_name: event.event_name || "N/A",
    compositeScore:
      event.compositeScore !== undefined && event.compositeScore !== "N/A" && !isNaN(Number(event.compositeScore))
        ? (Math.floor(Number(event.compositeScore) * 100) / 100).toFixed(2)
        : "N/A",
    emqRating: event.emqRating || "N/A",
    browser_hits: event.browser_hits ?? "N/A",
    server_hits: event.server_hits ?? "N/A",
    server_vs_browser_diff_pct:
      event.server_vs_browser_diff_pct !== undefined && event.server_vs_browser_diff_pct !== "N/A"
        ? `${Math.round(Number(String(event.server_vs_browser_diff_pct).replace(/[^\d.-]/g, "")))}%`
        : "N/A",
    "ARC (%)": event["ARC (%)"] ?? "N/A",
    event_id_serverCoverage: event.event_id_serverCoverage ?? "N/A",
    event_id_browserCoverage: event.event_id_browserCoverage ?? "N/A",
    event_id_overlap:
      event.event_id_overlap !== undefined && event.event_id_overlap !== "N/A"
        ? `${Math.round(Number(event.event_id_overlap))}`
        : "N/A",
    external_id_serverCoverage: event.external_id_serverCoverage ?? "N/A",
    external_id_browserCoverage: event.external_id_browserCoverage ?? "N/A",
    external_id_overlap:
      event.external_id_overlap !== undefined && event.external_id_overlap !== "N/A"
        ? `${Math.round(Number(event.external_id_overlap))}`
        : "N/A",
    fbp_serverCoverage: event.fbp_serverCoverage ?? "N/A",
    fbp_browserCoverage: event.fbp_browserCoverage ?? "N/A",
    // fbp_overlap intentionally omitted from output per requirements
    ...event,
  })) as EventMetrics[]

  // Remove recommendation columns
  events = removeRecommendationColumns(events)

  return events
}

function parseSetupQuality(harData: any, eventMap: Map<string, Partial<EventMetrics>>) {
  const entries = harData.log?.entries || []

  for (const entry of entries) {
    try {
      let responseText = entry.response?.content?.text || ""

      // Strip for (;;); sentinel if present
      if (responseText.startsWith("for (;;);")) {
        responseText = responseText.substring(9)
      }

      const data = JSON.parse(responseText)
      const payloadData = data.payload?.data

      if (!payloadData) continue

      // Extract event name from URL or payload
      let eventName = payloadData.event_name
      if (!eventName && entry.request?.url) {
        const urlParams = new URLSearchParams(entry.request.url.split("?")[1] || "")
        eventName = urlParams.get("event_name")
      }

      if (!eventName) continue

      const event = eventMap.get(eventName) || {}
      event.event_name = eventName
      event.compositeScore = payloadData.compositeScore ?? "N/A"
      event.emqRating = payloadData.emqRating?.rating || "N/A"

      // Process matchKeyFeedback for identifier coverage
      if (payloadData.matchKeyFeedback) {
        for (const feedback of payloadData.matchKeyFeedback) {
          const identifier = feedback.identifier
          if (identifier) {
            // Coverage percentage
            event[`${identifier}_coverage_percentage` as keyof EventMetrics] = feedback.coverage?.percentage ?? "N/A"

            // Process issues and recommendations
            let recommendationOrIssue = ""

            // Check for issues first
            if (feedback.issues && feedback.issues.length > 0) {
              const issueStrings = feedback.issues.map(
                (issue: any) => `${issue.issueCategory} (score: ${issue.potentialScoreIncrease})`,
              )
              recommendationOrIssue = issueStrings.join(", ")
            } else {
              // Check recommendations
              const recommendations = payloadData.recommendations || []
              const ruleBasedRecs = payloadData.ruleBasedRecommendations?.recommendations || []

              const allRecs = [...recommendations, ...ruleBasedRecs]
              const matchingRecs = allRecs.filter((rec: any) => rec.identifier === identifier)

              if (matchingRecs.length > 0) {
                const recStrings = matchingRecs.map((rec: any) => {
                  const prefix = recommendations.includes(rec) ? "Recommendation" : "Rule Recommendation"
                  return `${prefix}: ${rec.category}`
                })
                recommendationOrIssue = recStrings.join(", ")
              }
            }

            event[`${identifier}_recommendation_or_issue` as keyof EventMetrics] = recommendationOrIssue || ""
          }
        }
      }

      eventMap.set(eventName, event)
    } catch (error) {
      // Skip invalid entries
      continue
    }
  }
}

function parseEventCount(harData: any, eventMap: Map<string, Partial<EventMetrics>>) {
  const entries = harData.log?.entries || []

  for (const entry of entries) {
    try {
      let responseText = entry.response?.content?.text || ""

      if (responseText.startsWith("for (;;);")) {
        responseText = responseText.substring(9)
      }

      const data = JSON.parse(responseText)
      const payloadData = data.payload?.data || []

      for (const item of payloadData) {
        const eventName = item.keys?.[0]
        const connectionMethod = item.keys?.[1]
        const count = item.timeline?.[0]?.[1]

        if (!eventName || !connectionMethod || count === undefined) continue

        const event = eventMap.get(eventName) || {}
        event.event_name = eventName

        if (connectionMethod === "WEB_ONLY") {
          event.browser_hits = count
        } else if (connectionMethod === "SERVER_ONLY") {
          event.server_hits = count
        }

        // Calculate diff percentage if both values are available
        if (event.browser_hits !== undefined && event.server_hits !== undefined) {
          const browserHits = Number(event.browser_hits)
          const serverHits = Number(event.server_hits)

          if (browserHits > 0) {
            const diffPct = Math.round(((serverHits - browserHits) / browserHits) * 100 * 100) / 100
            // Add emoji based on difference
            let emoji = ""
            if (Math.abs(diffPct) > 25) {
              emoji = diffPct > 0 ? " 📈" : " 📉"
            } else {
              emoji = " ✅"
            }
            event.server_vs_browser_diff_pct = `${diffPct}%${emoji}`
          }
        }

        eventMap.set(eventName, event)
      }
    } catch (error) {
      continue
    }
  }
}

function parseAdditionalConversions(harData: any, eventMap: Map<string, Partial<EventMetrics>>) {
  const entries = harData.log?.entries || []

  for (const entry of entries) {
    try {
      let responseText = entry.response?.content?.text || ""

      if (responseText.startsWith("for (;;);")) {
        responseText = responseText.substring(9)
      }

      const data = JSON.parse(responseText)
      const payloadData = data.payload?.data || []

      for (const item of payloadData) {
        const eventName = item.eventName

        if (!eventName) continue

        const event = eventMap.get(eventName) || {}
        event.event_name = eventName
        event["ARC (%)"] =
          item.additionalConversions !== undefined ? Math.round(item.additionalConversions * 100) / 100 : "N/A"
        // hasDedupeIssue removed

        eventMap.set(eventName, event)
      }
    } catch (error) {
      continue
    }
  }
}

function parseDeduplication(harData: any, eventMap: Map<string, Partial<EventMetrics>>) {
  const entries = harData.log?.entries || []

  // Debug logging
  console.log("🔍 Parsing deduplication.har - found", entries.length, "entries")

  for (const entry of entries) {
    try {
      let content = entry.response?.content?.text || ""

      if (content.startsWith("for (;;);")) {
        content = content.replace("for (;;);", "")
      }

      const data = JSON.parse(content)
      const payload = data.payload || {}

      // Extract event name using the same logic as Python
      let eventName = payload.eventName || payload.event_name
      if (!eventName) {
        const url = entry.request?.url || ""
        if (url.includes("event_name=")) {
          eventName = url.split("event_name=")[1].split("&")[0]
        }
      }

      if (!eventName) {
        console.log("⚠️ No event name found in entry")
        continue
      }

      // Try all possible locations for dedupeKeyStats
      let dedupeKeyStats = null
      if (payload.dedupeKeyStats) {
        dedupeKeyStats = payload.dedupeKeyStats
      } else if (payload.data && payload.data.dedupe && payload.data.dedupe.dedupeKeyStats) {
        dedupeKeyStats = payload.data.dedupe.dedupeKeyStats
      } else if (
        payload.dataWithBreakDown &&
        payload.dataWithBreakDown.breakdownData &&
        payload.dataWithBreakDown.breakdownData.overall &&
        payload.dataWithBreakDown.breakdownData.overall.dedupe &&
        payload.dataWithBreakDown.breakdownData.overall.dedupe.dedupeKeyStats
      ) {
        dedupeKeyStats = payload.dataWithBreakDown.breakdownData.overall.dedupe.dedupeKeyStats
      }

      const event = eventMap.get(eventName) || {}
      event.event_name = eventName

      // Always robustly extract overlap for each key
      for (const key of ["event_id", "external_id", "fbp"]) {
        let stat = null
        if (Array.isArray(dedupeKeyStats)) {
          stat = dedupeKeyStats.find((s: any) => s.dedupeKey === key)
        } else if (dedupeKeyStats && typeof dedupeKeyStats === "object") {
          stat = dedupeKeyStats[key]
        }
        // Only set if stat exists and overlap is not undefined/null
        if (stat && stat.overlap !== undefined && stat.overlap !== null) {
          event[`${key}_serverCoverage` as keyof EventMetrics] = stat.serverCoverage ?? "N/A"
          event[`${key}_browserCoverage` as keyof EventMetrics] = stat.browserCoverage ?? "N/A"
          event[`${key}_overlap` as keyof EventMetrics] = stat.overlap
        } else {
          event[`${key}_serverCoverage` as keyof EventMetrics] = stat && stat.serverCoverage !== undefined ? stat.serverCoverage : "N/A"
          event[`${key}_browserCoverage` as keyof EventMetrics] = stat && stat.browserCoverage !== undefined ? stat.browserCoverage : "N/A"
          // Only set to N/A if not already set by a previous file
          if (!event[`${key}_overlap` as keyof EventMetrics]) {
            event[`${key}_overlap` as keyof EventMetrics] = "N/A"
          }
        }
      }

      eventMap.set(eventName, event)
      console.log(`✅ Updated event ${eventName} with dedupe stats`, event)
    } catch (error) {
      console.error("❌ Error parsing deduplication entry:", error)
      continue
    }
  }
  console.log("🎯 Final eventMap after deduplication parsing:", Array.from(eventMap.entries()))
}

// Utility function to remove recommendation columns
export function removeRecommendationColumns(data: EventMetrics[]): EventMetrics[] {
  if (data.length === 0) return data

  // Get all column names from first row
  const allColumns = Object.keys(data[0])

  // Find columns to remove (case-insensitive, handles both spaces and underscores)
  const columnsToRemove = allColumns.filter((col) =>
    col.toLowerCase().replace(/_/g, " ").endsWith("recommendation or issue"),
  )

  console.log("🗑️ Removing recommendation columns:", columnsToRemove)

  // Return data without recommendation columns
  return data.map((row) => {
    const newRow = { ...row }
    columnsToRemove.forEach((col) => {
      delete newRow[col as keyof EventMetrics]
    })
    return newRow
  })
}
