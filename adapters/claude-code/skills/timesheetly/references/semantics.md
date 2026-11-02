# Source events, time entries and budgets

Apply these distinctions to every recording, reporting and budget request.

| Concept | Meaning | What the MCP can do |
|---|---|---|
| Source event / activity / Ereignis (`source_event`) | Local evidence of work: an imported commit, message, meeting or manual activity. It may have a project and an interval, and overlap other events or already booked time. | Read events; create manual events after the user's desktop write opt-in. |
| Time entry / booking / Zeiteintrag / Buchung (`time_entry`) | Saved working time with a project, start/end, billable status and possibly a purchase-order association. This is the basis for booked-time reporting. A running entry and an absence need separate treatment. | Read existing entries; no creation, editing, deletion, timer control or aggregation. |
| Project budget / purchase order / billing | Project budget usage is calculated from completed work entries under the budget's date rules, including non-billable work where applicable. Purchase-order budgets, billable status, rates and currency are separate billing inputs. | Read authoritative budget, purchase-order and revenue results; no budget allocation, reservation, booking or invoicing. |

Creating an event does **not** create a time entry, consume or reserve a budget, mark time billable, or submit/approve/invoice anything. An event's `project_id` only associates the evidence with a project. Never invent `billable` or `purchase_order_id` arguments for `create_source_events`.

The user reviews events in Timesheetly, aggregates them, reviews the proposed time entries and saves the entries there. Do not claim the plugin can do this conversion. The relationship is not necessarily one event to one entry: overlapping events can describe the same work. Do not infer that an event is unaggregated merely because it still appears in an event query.

## Required response behavior

- After each successful create or idempotent retry, name the record **activity/source event**, include its ID and interval, and explicitly say **no time entry was created and this action consumed no budget**. For a retry, say the activity was already present; do not claim it has never been aggregated or that the project has no previous budget usage.
- German example: “Aktivität #123 erfasst: Website, 02.11.2026, 09:00–10:30 (90 Minuten, Europe/Berlin). Dabei wurde kein Zeiteintrag erstellt und kein Budget verbraucht. Prüfe die Aktivität in Timesheetly und übernimm sie dort über die Aggregation in einen Zeiteintrag.” Use actual returned values only.
- For requests such as “buche 90 Minuten auf Auftrag X”, “rechne das ab”, or “deduct it from the budget”, explain the unsupported booking and ask whether a source event is wanted before any write. Never silently replace a requested booking with an event.
- For `/status`, `/week`, “gebuchte Stunden” and budget/revenue totals, use time-entry or budget/revenue tools. Keep event counts/durations in a separately labelled evidence view. Never add source-event durations to time-entry totals or subtract them from budgets.
- If a freshly recorded activity is absent from `/status`, explain that `/status` reports time entries. Do not repeat the write to make the total increase.
- Distinguish “saved time entry”, “billable”, “submitted”, “approved” and “invoiced”. None implies all the others. Use returned facts, not a project's budget or rate alone, to make claims.
