---
description: Record completed work as a local Timesheetly activity
argument-hint: "[project] [YYYY-MM-DD] [HH:MM-HH:MM] [description]"
disable-model-invocation: true
---

Record the completed activity requested in $ARGUMENTS.

Read `${CLAUDE_PLUGIN_ROOT}/skills/timesheetly/SKILL.md`, `references/semantics.md` and `references/recording.md`, then follow that workflow. Resolve the project and missing date/time details before calling `create_source_events`. Preserve the same client reference on retry and report the actual saved/already-present/skipped result. This command saves a manual activity for later aggregation. Always state that this action created no time entry and consumed no budget. A request to book or bill time against a customer, purchase order or budget requires explaining this limit and asking before substituting an activity.
