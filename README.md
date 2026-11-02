# Timesheetly Agent Plugins

Record completed work and review tracked time from your coding agent using the local Timesheetly Desktop MCP binary.

**Available now:** the Claude Code plugin, version **0.1.0**. Other harness adapters are not included yet.

## Install on another device

Prerequisites: a current Claude Code installation and a compatible Timesheetly Desktop installation with its `timesheetly-mcp` executable. Open Timesheetly and select your account profile and organization first.

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

If the target device cannot access GitHub, download `timesheetly-claude-code-0.1.0.zip` and `SHA256SUMS` from the [v0.1.0 release](https://github.com/MKITConsulting/ts-agent-plugins/releases/tag/v0.1.0), verify the checksum, transfer and extract the ZIP, then run `/plugin marketplace add /absolute/path/to/extracted/timesheetly`. The extracted directory contains its own marketplace; install and configure `timesheetly@timesheetly` as above. Claude Code still needs its normal model connection.

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
