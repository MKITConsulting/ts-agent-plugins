# Record completed work

Read [semantics.md](semantics.md). The result of this workflow is a local source event, never booked time or a budget transaction.

Use `get_active_projects` to resolve the requested project to its numeric ID. If no project was specified, `get_current_project` can supply the user's selected desktop project; validate that it is in the active list and name it in the result. Ask when there is no selected project or the name is ambiguous. Do not select a similarly named project in another organization.

Collect a title, date, start and end time. `create_source_events` takes local wall-clock values in the **time zone configured in Timesheetly**, not necessarily the host or conversation time zone. There is no dedicated timezone-read tool in this server version. For relative dates, offset-bearing times, travel/timezone ambiguities, or "now", ask for the Timesheetly zone and resolve to an explicit calendar date before writing unless that zone is already reliably known. For explicit dates and wall-clock times, state that they are Timesheetly-local. A duration without an anchor needs a start or end time. Ask for missing details instead of fabricating them. Session elapsed time is not evidence of work performed.

Only completed intervals within a single day are supported. End must be later than start; accepted times are `HH:MM`, 00:00–23:59. An overnight interval cannot be represented losslessly using 24:00 or 23:59 as a fabricated boundary. Explain the limitation and direct the user to the app. Do not truncate or round an interval silently. The server validates daylight-saving-time gaps and ambiguities; relay skipped reasons rather than guessing a different time.

For a clear request to record an activity, call `create_source_events`. If the request specifically requires a final time entry or billable booking, first explain that this tool saves an activity and ask whether that meets the request.

Each event contains:

| Field | Contract |
|---|---|
| `summary` | Required title, 1–500 characters |
| `description` | Optional details, at most 5,000 characters |
| `date` | `YYYY-MM-DD` |
| `start_time_local`, `end_time_local` | `HH:MM`, same day, Timesheetly zone |
| `project_id` | Numeric active-project ID from the server |
| `client_ref` | A fresh opaque reference per intended activity, at most 200 characters; retain it for retries |

Send 1–200 events per call. For larger requests, split into batches and retain every event's reference. Use a UUID-shaped opaque value for each new activity; never derive identity only from its title or time range, as separate intended activities may share those values.

Read the MCP error flag and the JSON payload carried in its text content. Inspect all three result lists:

- `created`: saved activities, with IDs, project, date and times.
- `already_present`: an existing activity was returned for that reference. Confirm it as already present, not newly saved. Compare its project and UTC interval with the intended activity before reporting success; references are identities, not update instructions.
- `skipped`: not saved; report each reason and request only the necessary correction.

A transport timeout leaves the outcome uncertain. Retry at most once with exactly the same arguments and references. If still uncertain, stop and report it. Never generate new references merely to make a retry succeed. A changed payload with an already-used reference will not update an event. After an activity is edited or deleted in the app, the reference may be reusable; do not re-create an intentionally removed activity automatically.

When writes are disabled, show the app's **Settings → Network → MCP access → Allow MCP clients to create events** switch and wait for the user to enable it. Do not change preferences, retrieve database encryption keys, or bypass profile/organization checks. A profile-change or schema-compatibility error requires reconnecting the server or updating the app/binary as the error says, not changing the database path.

Confirm the saved project, explicit date, interval, duration and server-returned timezone, with the activity ID. For created items say "activity recorded" (German: "Aktivität erfasst"); for an already-present result say "activity already present" ("Aktivität bereits vorhanden"). Always add "No time entry was created and this action consumed no budget" ("Dabei wurde kein Zeiteintrag erstellt und kein Budget verbraucht"). Do not imply an existing event has never been aggregated. Explain briefly that the user can review it in the Manual timeline lane, aggregate the relevant events, review the proposed entries and save them in Timesheetly. Source activities stay local; do not claim sync, billing, approval, or submission. For a mixed result, state the counts of saved, already-present and skipped items. A successful event write does not increase `/timesheetly:status` or `/timesheetly:week` totals by itself; do not retry to make those totals change.
