# Read projects and time

## Projects

Use `get_active_projects` for selectable projects and `get_current_project` for the desktop selection. Use `get_all_projects` or `get_archived_projects` only when requested. Show names and IDs; do not create projects. Results are scoped to the desktop's active organization.

## Today's status

Call `get_todays_summary` for the authoritative current-day summary in Timesheetly's configured zone. Its fields are `total_minutes` and `entry_count`. Display minutes as hours/minutes. Absences contribute no minutes. A running entry counts as an entry but contributes no duration; the summary does not expose whether any entry is running. Do not describe its count as a count of finished entries or infer a timer state from it.

If details are requested, resolve the explicit date in the Timesheetly zone and call `get_time_entries`. There is no dedicated timezone-read tool; ask for the configured zone when it is needed and not already known. Do not assume the computer's zone matches the app. An entry with no `end_time` is running; label it without adding elapsed time to the booked total.

## Weekly or custom reports

Resolve explicit start/end dates before the query. "This week" and "last week" mean Monday–Sunday in the Timesheetly zone; show the resolved dates in the report. Ask for the zone when needed, as above.

Call `get_time_entries` with `start_date`, `end_date`, optional `project_id`, `limit: 200`, `offset: 0`. The default fields include `id`, `description`, `start_time`, `end_time`, `project_id`, `entry_type` and `billable`. Set `fields` only when additional fields are needed; it replaces the default projection. Read the MCP error flag before parsing JSON text.

Paged results have `{ items, total_count, limit, offset }`. Remember the first page's total and every returned entry ID. Increase offset by the actual number of returned items until that total is reached. A changed total, duplicate ID, unexpectedly empty page, or final unique-entry count different from the initial total means the read is unstable. Discard that attempt and restart from offset zero at most once. If instability persists, stop and label the report incomplete; do not present a reliable grand total. Do not merely deduplicate and claim completeness. Pagination has no snapshot guarantee: even stable counts cannot rule out concurrent replacement or editing. Describe the result as observed during the query; when concurrent editing is known, ask the user to finish editing before a fresh report. Resolve project names using `get_all_projects` so inactive projects remain named.

The server returns entries overlapping the date range, including entries that began earlier. Group completed work entries by project and sum their actual timestamp durations. Exclude `entry_type: "absence"` from work totals, show absences separately, and keep running entries outside completed totals. Clip intervals to the requested local-date range, using timezone-aware boundaries (a day can have 23 or 25 hours). An entry ending exactly at the range's start contributes zero minutes. Do not calculate by subtracting wall-clock strings or assuming a fixed UTC offset. If reliable timezone conversion is unavailable, show the returned intervals and explain that a precise boundary-adjusted total cannot be supplied.

Mention overlaps as possible double-counting; do not silently merge or alter entries. For a one-day report, prefer `get_todays_summary` when it covers that day. Use `get_project_budget_status` or `get_revenue_summary` only for requested budget/revenue questions; do not invent rates or treat all tracked time as billable.

## Activities are a separate view

For a request about recorded activities, query `get_source_events_by_date_range` with dates, optional project, `source_type: "manual"` when appropriate, and pagination. To distinguish MCP-origin activities from other manual activities, request `metadata` along with the needed default fields; metadata may identify `origin: "mcp"` and the client. Source activities are raw evidence and can overlap already-aggregated entries. Never add their durations to time-entry totals or claim that each is unaggregated; this read response does not reliably establish that state.
