# Timesheetly Agent Plugins

Record completed work and review tracked time from your coding agent using the local Timesheetly Desktop MCP binary.

**Available now:** the Claude Code plugin, version **0.1.1**. Other harness adapters are not included yet.

## Install on another device

Prerequisites: a current Claude Code installation and a compatible Timesheetly Desktop installation with its `timesheetly-mcp` executable. Open Timesheetly and select your account profile and organization first.

On macOS, use **Timesheetly Desktop 0.16.2 or newer**, which includes the provisioned, notarized MCP helper. [Download Timesheetly Desktop](https://www.timesheetly.ai/en/download). Keep the complete app installed; do not copy the inner MCP executable out of its app bundle. The [website guide](https://www.timesheetly.ai/en/mcp#claude-code-plugin) walks through installation and the activity-to-time-entry workflow.

Run these commands inside Claude Code:

```text
/plugin marketplace add MKITConsulting/ts-agent-plugins
/plugin install timesheetly@timesheetly
/plugin configure timesheetly@timesheetly
```

Set **Timesheetly MCP binary** to its absolute path on that device. On macOS the default is:

```text
/Applications/Timesheetly.app/Contents/MacOS/timesheetly-mcp
```

For a standalone build or Windows, select the matching executable's actual location (`timesheetly-mcp.exe` on Windows). The plugin does not include or download the Desktop app or binary. Native execution has been tested on macOS; Windows/Linux packaging has not been validated.

Enable **Settings → Network → MCP access → Allow MCP clients to create events** in Timesheetly for recording. Read-only queries do not need this switch. Use `/mcp` to check the connection, then try:

```text
/timesheetly:projects
/timesheetly:status
```

To record completed work, specify a project, date and interval in Timesheetly's configured timezone:

```text
/timesheetly:log MyProject 2026-11-02 09:00-10:30 Fixed the login flow
```

Only run the recording example with your own completed work details. The command creates a **local manual activity**, which you can later aggregate into a time entry in Timesheetly. It does not directly book billable time, submit a timesheet, or start a timer.

## Events, booked time and budgets

| Record | What it means | Budget and billing |
|---|---|---|
| **Source event / activity** (`source_event`) | Local evidence of what happened, such as a commit, meeting or manually recorded work interval. `/timesheetly:log` creates this kind of record. | Does not itself book time, consume a project or purchase-order budget, or create billable revenue. A project assignment and duration do not turn it into a booking. |
| **Time entry / booking** (`time_entry`) | Working time saved in Timesheetly, with a project, duration and billable status. Review activities in the app, aggregate them and save the resulting entries. | Completed work entries feed time totals and project budget usage under the applicable budget rules. Billable entries and purchase-order/rate settings determine billing; a time entry is not automatically invoiced, submitted or approved. |

**Example:** logging a 90-minute activity leaves booked time and budget usage unchanged. Only a separately saved 90-minute work entry contributes those 90 minutes to the applicable time/budget calculation. Several overlapping events may describe the same work: never add event durations to booked time or assume one event must become one entry.

The plugin reports **“Activity recorded — no time entry created; no budget consumed by this action.”** `/timesheetly:status` and `/timesheetly:week` read time entries, so a newly saved activity does not automatically appear in those totals. For a requested final booking, the assistant explains the limit and asks before offering to save an activity instead.

If the target device cannot access GitHub, download `timesheetly-claude-code-0.1.1.zip` and `SHA256SUMS` from the [v0.1.1 release](https://github.com/MKITConsulting/ts-agent-plugins/releases/tag/v0.1.1), verify the checksum, transfer and extract the ZIP, then run `/plugin marketplace add /absolute/path/to/extracted/timesheetly`. The extracted directory contains its own marketplace; install and configure `timesheetly@timesheetly` as above. Claude Code still needs its normal model connection.

If a `timesheetly` marketplace already points at a local development folder, the target must use this repository as its marketplace source. An existing manually configured MCP server with the same binary may be reused by Claude instead of starting a duplicate; that is expected.

## Commands

| Command | Purpose |
|---|---|
| `/timesheetly:log` | Record completed work as a manual activity |
| `/timesheetly:status` | Today's tracked-time summary |
| `/timesheetly:week` | Weekly tracked time by project |
| `/timesheetly:projects` | Active projects and current selection |
| `/timesheetly:setup` | Configuration and connection guidance |

Natural-language requests are supported through the included skill. See the [Claude Code adapter documentation](adapters/claude-code/README.md) for timezone handling, reporting and protocol limits.

## macOS connection troubleshooting

If the server immediately exits with **137 / SIGKILL**, or macOS reports an untrusted program, install the current official Desktop release (at least 0.16.2), open Timesheetly once and reconnect using `/mcp`. The earlier macOS packaging issue was fixed in 0.16.2; Exit 137 alone does not prove that issue is the cause of every failure. Use the bundled launcher at the path above, with the complete app present. Do not disable Gatekeeper, strip quarantine attributes, or replace the signed helper with an extracted inner executable. If it still fails, record the Desktop/macOS versions and the MCP client error for support.

## Repository layout

```text
.claude-plugin/marketplace.json  # Repository-wide Claude marketplace
adapters/claude-code/            # Self-contained, installable Claude plugin
.github/workflows/validate.yml  # Native package validation
```

The first adapter contains the shared Timesheetly workflow instructions. When another adapter is added, common source material can be extracted and packaged into each self-contained adapter. Installed plugins must not depend on files outside their own package. The MCP binary remains maintained with Timesheetly Desktop.

## Validation

Native package validation is tested with Claude Code **2.1.316**:

```bash
claude plugin validate --strict .
claude plugin validate --strict adapters/claude-code
claude plugin validate --strict adapters/claude-code/skills
claude plugin validate --strict adapters/claude-code/commands
```

The integration suite uses a real compatible MCP binary, Node.js 22+ and SQLCipher, with matching Desktop migrations available locally:

```bash
TIMESHEETLY_MCP_TEST_BINARY=/absolute/path/to/timesheetly-mcp \
TIMESHEETLY_MIGRATIONS_DIR=/absolute/path/to/desktop/migrations \
node --test adapters/claude-code/tests/mcp-integration.test.mjs
```

It creates disposable encrypted databases and does not read a user's database or keychain. CI checks the distributable manifests, skills, commands and test syntax; it does not run the real-binary suite because the Desktop binary and matching migrations are not part of this repository.

Version 0.1.0 passed five real-binary integration tests and a real Claude Code conversation covering activity creation, idempotent retry and readback on macOS. Tool results enter the AI conversation; local MCP access does not imply offline model inference.

Copyright Timesheetly. All rights reserved. No open-source license is granted by this repository.
