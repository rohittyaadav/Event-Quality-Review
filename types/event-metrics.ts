export interface EventMetrics {
  event_name: string | "N/A"
  compositeScore: number | "N/A"
  emqRating: string | "N/A"
  browser_hits: number | "N/A"
  server_hits: number | "N/A"
  server_vs_browser_diff_pct: string | "N/A" // Now includes emoji
  "ARC (%)": number | "N/A"
  hasDedupeIssue: boolean | "N/A"
  event_id_serverCoverage: number | "N/A"
  event_id_browserCoverage: number | "N/A"
  event_id_overlap: number | "N/A"
  external_id_serverCoverage: number | "N/A"
  external_id_browserCoverage: number | "N/A"
  external_id_overlap: number | "N/A"
  fbp_serverCoverage: number | "N/A"
  fbp_browserCoverage: number | "N/A"
  fbp_overlap: number | "N/A"
  [key: string]: any // For dynamic identifier columns like email_coverage_percentage, phone_recommendation_or_issue
}
