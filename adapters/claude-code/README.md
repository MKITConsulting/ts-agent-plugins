# Timesheetly for Claude Code

Record completed work as local Timesheetly activities and review existing tracked time from Claude Code. The plugin connects directly to the `timesheetly-mcp` binary over stdio. It adds a discoverable skill and five commands; no extra runtime library is required for the plugin.

## Install from GitHub

In Claude Code:

```text
/plugin marketplace add MKITConsulting/ts-agent-plugins
/plugin install timesheetly@timesheetly
/plugin configure timesheetly@timesheetly
```

Timesheetly Desktop and its compatible MCP binary must already be installed on the device. This plugin package does not include the binary.

On macOS use **Desktop 0.16.2 or newer** from the [official download page](https://www.timesheetly.ai/en/download). Keep the complete app bundle installed: its launcher depends on the signed, notarized helper inside it. See also the [website installation guide](https://www.timesheetly.ai/en/mcp#claude-code-plugin).

On Windows (x64), use the **MSI installer for Desktop 0.16.4 or newer**. Open Timesheetly once, sign in and select your account profile and organization. Run Claude Code as the same Windows user so the server can access the encrypted database key. Configure **Timesheetly MCP binary** as `C:\Program Files\Timesheetly\timesheetly-mcp.exe`, or adjust it to your chosen installation directory.

The MCP executable extracted from the Windows 0.16.4 MSI passed six native tests for encrypted database access, Windows key storage and activity recording. This verifies the packaged server; a full Claude Code plugin conversation on Windows and native Linux execution remain untested. The full plugin workflow has been tested on macOS.

## Install from a local directory

In Claude Code, add the directory containing this README as a marketplace:

```text
/plugin marketplace add /absolute/path/to/ts-agent-plugins/adapters/claude-code
/plugin install timesheetly@timesheetly
/plugin configure timesheetly@timesheetly
```

Set **Timesheetly MCP binary** to the absolute executable path. The default is `/Applications/Timesheetly.app/Contents/MacOS/timesheetly-mcp`. Developer builds can live elsewhere, but moving an inner executable out of a signed macOS bundle is not a supported installation method. Paths containing spaces are supported without embedding additional shell quotes in the saved value.

Use `/mcp` to inspect or reconnect the server. For development you can also start a new session with `claude --plugin-dir /absolute/path/to/ts-agent-plugins/adapters/claude-code`. The public marketplace is [MKITConsulting/ts-agent-plugins](https://github.com/MKITConsulting/ts-agent-plugins).

Use a current Claude Code version that supports plugin `userConfig`. Native manifest validation is tested with 2.1.316. This is a local Claude Code integration; a cloud-only host cannot launch a binary on your computer.

## Prepare Timesheetly

Open the desktop app and select the intended account profile and organization. The server uses that profile's database and OS keychain. It needs no separate Timesheetly API login. For writing, enable **Settings → Network → MCP access → Allow MCP clients to create events** in the app. Keychain access may prompt for Touch ID.

Keep the binary compatible with the desktop database. After switching profiles or updating the binary, reconnect the MCP server. Normal use does not need `--db` or an encryption-key environment variable. An existing `TIMESHEETLY_DB` environment variable overrides automatic profile selection; remove that override if you intend to follow the desktop's active profile.

## Commands

| Command | Purpose |
|---|---|
| `/timesheetly:log Website 2026-11-02 09:00-10:30 Login repariert` | Record a completed manual activity |
| `/timesheetly:status` | Today's tracked-time summary |
| `/timesheetly:week last` | Last week's completed work by project |
| `/timesheetly:projects` | Active projects and desktop selection |
| `/timesheetly:setup` | Connection and configuration help |

Natural-language requests also activate the Timesheetly skill, for example: “Erfasse eine Aktivität für Website am 2. November 2026 von 9 bis 10:30 Uhr: Login repariert.” Explicit times refer to the timezone configured in Timesheetly. The skill asks for missing dates, time anchors, ambiguous project names or timezone details when needed.

## What gets recorded

`create_source_events` adds manual activities to the timeline, labelled by the app as coming via MCP. They can later be aggregated into time entries in Timesheetly. **An activity is not a final time entry, billable booking, submission or approval.** Activities remain local and do not sync. Existing time entries are queried separately; the plugin never adds activity durations to their totals.

**Source events → review and aggregation in Timesheetly → saved time entries → applicable budget/billing calculations.**

A source event describes what happened. Even with a project and a 90-minute interval, it does not consume a project or purchase-order budget. A time entry records booked working time; completed work entries contribute to project budget usage under that budget's rules. Billable status, purchase orders and rates govern billing separately. Non-billable work can still count toward a project's time budget. Saving an entry does not mean it was invoiced, submitted or approved.

After `/timesheetly:log`, expect **“Activity recorded — no time entry created; no budget consumed by this action.”** The activity appears in the Manual timeline lane. Review its date, duration and project in the desktop app, aggregate it with the relevant other events, review the proposed entries and save them. The MCP cannot perform that step. Several events can describe overlapping work; their durations must not be summed as booked time. `/timesheetly:status` and `/timesheetly:week` query time entries, so their totals may remain unchanged after an activity was recorded.

For “book this to the customer/order/budget”, the assistant must explain that it cannot create that booking and ask before substituting an activity. See the packaged [terminology and response rules](skills/timesheetly/references/semantics.md).

The current server does not expose timer start/stop/pause, direct time-entry creation/editing/deletion, aggregation, submission or file export. Overnight intervals cannot be recorded losslessly by the current same-day activity API. Use the desktop app for those operations.

The plugin does not automatically record coding sessions, install session hooks, download a binary, or read SQLite/keychain data itself. MCP data access is local, but requested tool results enter the AI conversation and are processed under the host's data-handling settings.

## macOS: immediate exit or untrusted-program warning

For Exit 137/SIGKILL or a Gatekeeper warning, first install the official Desktop **0.16.2 or newer**, open the app once, check the configured launcher path and reconnect in `/mcp`. 0.16.2 fixes the known MCP helper packaging/notarization issue, although Exit 137 can have other causes. Keep the entire app bundle; do not copy its inner helper executable, disable Gatekeeper or remove quarantine attributes. If the current release still fails, collect the macOS/Desktop versions and the client's MCP error for support.

## Verify development changes

Validate the installable package with the real Claude CLI:

```bash
claude plugin validate --strict /absolute/path/to/ts-agent-plugins/adapters/claude-code
```

Run the real-binary integration tests with Node.js 22+ and SQLCipher available on PATH, and with matching desktop migrations:

```bash
TIMESHEETLY_MCP_TEST_BINARY=/absolute/path/to/timesheetly-mcp \
TIMESHEETLY_MIGRATIONS_DIR=/absolute/path/to/ts-desktop-tauri/src-tauri/migrations \
node --test tests/mcp-integration.test.mjs
```

The tests create fresh encrypted databases in the system temporary directory. They pass the fixture path and an ephemeral key explicitly, never open a real user database, and remove fixtures after each test. No paid model call is required. The tests cover real MCP calls and persistence, not the quality of a model's interpretation of every natural-language request. There is no compilation step or production JavaScript to instrument for coverage.

## References

- [Claude plugin manifest and user configuration](https://code.claude.com/docs/en/plugins-reference)
- [Claude MCP integration](https://code.claude.com/docs/en/mcp)
- [Timesheet.io reference plugin](https://github.com/timesheetIO/timesheet-plugin) — interaction reference; this plugin uses Timesheetly's own local protocol.

Copyright Timesheetly. All rights reserved. No open-source license is granted by this package.
