# Connect the local server

The plugin starts the executable configured as `mcp_binary` over stdio. There is no HTTP endpoint, API token, npm server or plugin-specific login. The AI host still receives the tool results it requests; local database access does not mean model inference is offline.

1. Open Timesheetly Desktop on this machine and select the intended profile and organization. The app creates/migrates its own database and provisions its keychain entry.
2. Configure the absolute path to a compatible `timesheetly-mcp` binary with `/plugin configure timesheetly@timesheetly`. The macOS default is `/Applications/Timesheetly.app/Contents/MacOS/timesheetly-mcp`. A standalone build is also supported. The binary must be executable; plugin files do not download or rebuild it.
3. Check the Timesheetly server in `/mcp`. Use its reconnect action after changing the binary or desktop profile. If the host offers only restart, ask the user to start a fresh session when convenient; do not interrupt other sessions.
4. For recording, the user enables **Settings → Network → MCP access → Allow MCP clients to create events** in Timesheetly. Read-only use does not need this switch.

Normal configuration has no `--db` argument. The binary resolves the active profile through the app registry and reads its SQLCipher key from the OS keychain. An inherited `TIMESHEETLY_DB` overrides that selection; if the user deliberately configured it, explain that it bypasses active-profile switching checks. Do not add an override as a troubleshooting shortcut. Do not read the user's database or credentials directly. An OS keychain/Touch ID prompt is handled by the user.

If a binary is missing, ask for its location or direct the user to install/build the matching desktop version. If `create_source_events` is missing, a compatible newer MCP binary is needed; do not claim recording is available just because reads work. On schema mismatch, follow the server error: launch the app to apply its own migrations, or update/reconnect the binary. Do not run migrations yourself.

The protocol is platform-neutral; an actual working binary and the desktop app's keychain support are prerequisites on each OS. This plugin's automated smoke validation currently targets the supplied macOS binary; it does not establish Windows/Linux installer support.
