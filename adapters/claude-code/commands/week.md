---
description: Summarize this week's or last week's tracked time by project
argument-hint: "[last | YYYY-MM-DD YYYY-MM-DD] [project]"
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/timesheetly/SKILL.md` and its `references/reporting.md`. Follow "Weekly or custom reports" for $ARGUMENTS, defaulting to this week. Resolve the Timesheetly timezone and explicit date range, fetch every page, and show completed work by project with running entries and absences separately. Do not write or aggregate source activities.
