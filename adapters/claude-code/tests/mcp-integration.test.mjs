import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { createInterface } from 'node:readline';
import test from 'node:test';

const binary = process.env.TIMESHEETLY_MCP_TEST_BINARY;
const migrations = process.env.TIMESHEETLY_MIGRATIONS_DIR;
assert.ok(binary && isAbsolute(binary), 'Set TIMESHEETLY_MCP_TEST_BINARY to an absolute binary path');
assert.ok(migrations && isAbsolute(migrations), 'Set TIMESHEETLY_MIGRATIONS_DIR to matching desktop migrations');
const config = JSON.parse(readFileSync(new URL('../.mcp.json', import.meta.url)));
const now = '2026-11-02T08:00:00+00:00';

async function fixture(t, writesEnabled = true) {
  const dir = mkdtempSync(join(tmpdir(), 'timesheetly-plugin-test-'));
  const db = join(dir, 'fixture with spaces.db');
  const key = randomBytes(32).toString('hex');
  let child;
  t.after(async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const stopped = new Promise(resolve => child.once('close', resolve));
      child.stdin.end();
      const killTimer = setTimeout(() => child.kill('SIGKILL'), 2000);
      await stopped;
      clearTimeout(killTimer);
    }
    rmSync(dir, { recursive: true, force: true });
  });

  function sql(body, json = false) {
    const result = spawnSync('sqlcipher', ['-batch', db], {
      input: `.bail on\nPRAGMA key = "x'${key}'";\n${json ? '.mode json\n' : ''}${body}\n`,
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 4 * 1024 * 1024,
    });
    assert.equal(result.status, 0, (result.error?.message || result.stderr || 'SQLCipher failed').replaceAll(key, '[test key]'));
    if (json) {
      const start = result.stdout.indexOf('[');
      return start < 0 ? [] : JSON.parse(result.stdout.slice(start));
    }
  }

  const migrationSql = readdirSync(migrations).sort().filter(name => /^\d.*_/.test(name)).map(name => {
    const version = name.split('_')[0].replaceAll('-', '');
    assert.match(version, /^\d+$/);
    return `BEGIN;\n${readFileSync(join(migrations, name, 'up.sql'), 'utf8')}\n` +
      `INSERT INTO __diesel_schema_migrations(version) VALUES ('${version}');\nCOMMIT;`;
  }).join('\n');
  sql(`CREATE TABLE __diesel_schema_migrations(version VARCHAR(50) PRIMARY KEY NOT NULL, run_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);
    ${migrationSql}
    INSERT INTO projects(id, name, is_active, created_at, updated_at, sync_status, is_deleted, budget_warnings_enabled, organization_id)
    VALUES (701, 'Plugin test project', 1, '${now}', '${now}', 'pending', 0, 0, 'plugin-test-org'),
           (702, 'Other organization', 1, '${now}', '${now}', 'pending', 0, 0, 'other-org');
    INSERT OR REPLACE INTO settings(key, value, created_at, updated_at) VALUES
      ('timezone', 'Europe/Berlin', '${now}', '${now}'),
      ('active_organization_id', 'plugin-test-org', '${now}', '${now}'),
      ('mcp_source_event_writes_enabled', '${writesEnabled}', '${now}', '${now}');`);

  const server = config.mcpServers.timesheetly;
  assert.equal(server.type, 'stdio');
  assert.equal(server.command, '${user_config.mcp_binary}');
  // The fixture override deliberately bypasses the user's registry and keychain.
  child = spawn(binary, [...server.args, '--db', db], {
    env: { ...process.env, TIMESHEETLY_DB: db, TIMESHEETLY_MCP_KEY_HEX: key, RUST_LOG: 'error' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-5000); });
  let nextId = 1;
  const pending = new Map();
  function failAll(error) {
    for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(error); }
    pending.clear();
  }
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    let message;
    try { message = JSON.parse(line); } catch { failAll(new Error('Non-JSON data on MCP stdout')); return; }
    const waiter = pending.get(message.id);
    if (waiter) {
      clearTimeout(waiter.timer);
      pending.delete(message.id);
      waiter.resolve(message);
    }
  });
  child.on('error', failAll);
  child.stdin.on('error', failAll);
  child.on('close', code => failAll(new Error(`MCP exited (${code}): ${stderr.replaceAll(key, '[test key]')}`)));
  function request(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`MCP timeout for ${method}: ${stderr.replaceAll(key, '[test key]')}`));
      }, 15000);
      pending.set(id, { resolve, reject, timer });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }
  const initialized = await request('initialize', {
    protocolVersion: '2024-11-05', capabilities: {},
    clientInfo: { name: 'timesheetly-plugin-test', version: '0.1.0' },
  });
  assert.equal(initialized.result.serverInfo.name, 'timesheetly');
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  async function call(name, args = {}, expectError = false) {
    const response = await request('tools/call', { name, arguments: args });
    assert.equal(response.error, undefined, JSON.stringify(response.error));
    assert.equal(Boolean(response.result.isError), expectError, JSON.stringify(response.result));
    const text = response.result.content.filter(item => item.type === 'text').map(item => item.text).join('\n');
    return expectError ? text : JSON.parse(text);
  }
  return { sql, call, request };
}

function event(clientRef, overrides = {}) {
  return {
    summary: 'Completed integration work', date: '2026-11-02',
    start_time_local: '09:00', end_time_local: '10:30', project_id: 701,
    client_ref: clientRef, ...overrides,
  };
}

test('actual binary advertises the tools used by the plugin and respects organization scope', async t => {
  const mcp = await fixture(t);
  const result = await mcp.request('tools/list');
  const tools = result.result.tools;
  for (const name of ['get_active_projects', 'get_all_projects', 'get_archived_projects', 'get_current_project',
    'get_todays_summary', 'get_time_entries', 'get_source_events_by_date_range',
    'get_project_budget_status', 'get_revenue_summary', 'create_source_events']) {
    assert.ok(tools.some(tool => tool.name === name), `Missing tool ${name}`);
  }
  const write = tools.find(tool => tool.name === 'create_source_events');
  assert.equal(write.annotations.readOnlyHint, false);
  assert.deepEqual(write.inputSchema.required, ['events']);
  const projects = await mcp.call('get_active_projects');
  assert.ok(projects.some(project => project.id === 701));
  assert.ok(!projects.some(project => project.id === 702));
  const summary = await mcp.call('get_todays_summary');
  assert.equal(typeof summary.total_minutes, 'number');
  assert.equal(typeof summary.entry_count, 'number');
});

test('disabled writes return guidance and persist no activity', async t => {
  const mcp = await fixture(t, false);
  const error = await mcp.call('create_source_events', { events: [event('disabled-1')] }, true);
  assert.match(error, /Settings > Network > MCP access/);
  assert.equal(mcp.sql('SELECT COUNT(*) AS n FROM source_events;', true)[0].n, 0);
});

test('activity writes convert local time, retry without duplication, and report partial skips', async t => {
  const mcp = await fixture(t);
  const events = [event('save-1'), event('foreign-1', { project_id: 702 }),
    event('invalid-1', { end_time_local: '08:00' })];
  const first = await mcp.call('create_source_events', { events });
  assert.equal(first.timezone, 'Europe/Berlin');
  assert.equal(first.created.length, 1);
  assert.equal(first.skipped.length, 2);
  assert.ok(first.skipped.every(item => item.reason));
  const id = first.created[0].id;
  assert.equal(Date.parse(first.created[0].start_utc), Date.parse('2026-11-02T08:00:00Z'));
  assert.equal(Date.parse(first.created[0].end_utc), Date.parse('2026-11-02T09:30:00Z'));
  const retry = await mcp.call('create_source_events', { events: [event('save-1')] });
  assert.deepEqual(retry.created, []);
  assert.equal(retry.already_present[0].id, id);
  const rows = mcp.sql('SELECT id, source_type, organization_id, metadata FROM source_events;', true);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_type, 'manual');
  assert.equal(rows[0].organization_id, 'plugin-test-org');
  assert.deepEqual(JSON.parse(rows[0].metadata), { origin: 'mcp', client: 'timesheetly-plugin-test' });
  assert.equal(mcp.sql('SELECT COUNT(*) AS n FROM time_entries;', true)[0].n, 0);
  const listed = await mcp.call('get_source_events_by_date_range', {
    start_date: '2026-11-02', end_date: '2026-11-02', source_type: 'manual', limit: 1, offset: 0,
  });
  assert.equal(listed.total_count, 1);
  assert.equal(listed.items[0].id, id);
});

function seedTimeEntries(mcp) {
  mcp.sql(`INSERT INTO time_entries(description, start_time, end_time, project_id, entry_type, organization_id, created_at)
    VALUES ('Completed', '2026-11-02T08:00:00+00:00', '2026-11-02T09:00:00+00:00', 701, 'regular', 'plugin-test-org', '${now}'),
           ('Running', '2026-11-02T10:00:00+00:00', NULL, 701, 'regular', 'plugin-test-org', '${now}'),
           ('Leave', '2026-11-02T11:00:00+00:00', '2026-11-02T12:00:00+00:00', 701, 'absence', 'plugin-test-org', '${now}'),
           ('Foreign', '2026-11-02T13:00:00+00:00', '2026-11-02T14:00:00+00:00', 702, 'regular', 'other-org', '${now}'),
           ('Carry-in', '2026-11-01T22:30:00+00:00', '2026-11-02T01:00:00+00:00', 701, 'regular', 'plugin-test-org', '${now}');`);
}

test('time-entry pages include overlapping entries and preserve running/absence fields and organization scope', async t => {
  const mcp = await fixture(t);
  seedTimeEntries(mcp);
  const items = [];
  for (let offset = 0; offset < 4; offset += 1) {
    const page = await mcp.call('get_time_entries', {
      start_date: '2026-11-02', end_date: '2026-11-02', limit: 1, offset,
    });
    assert.equal(page.total_count, 4);
    assert.equal(page.items.length, 1);
    items.push(...page.items);
  }
  assert.equal(new Set(items.map(item => item.id)).size, 4);
  assert.ok(items.every(item => item.project_id === 701));
  assert.ok(items.some(item => item.description === 'Carry-in'));
  assert.ok(items.some(item => item.end_time === null));
  assert.ok(items.some(item => item.entry_type === 'absence'));
});

test('concurrent deletion changes the page total and a fresh read recovers the skipped entry', async t => {
  const mcp = await fixture(t);
  seedTimeEntries(mcp);
  const range = { start_date: '2026-11-02', end_date: '2026-11-02', limit: 2 };
  const first = await mcp.call('get_time_entries', { ...range, offset: 0 });
  assert.equal(first.total_count, 4);
  const removedId = first.items[0].id;
  assert.ok(Number.isSafeInteger(removedId));
  mcp.sql(`DELETE FROM time_entries WHERE id = ${removedId};`);
  const next = await mcp.call('get_time_entries', { ...range, offset: 2 });
  assert.equal(next.total_count, 3);
  const unstableIds = new Set([...first.items, ...next.items].map(item => item.id));
  assert.equal(unstableIds.size, 3, 'deduplication alone misleadingly matches the reduced total');
  const restarted = await mcp.call('get_time_entries', { ...range, limit: 200, offset: 0 });
  assert.equal(restarted.total_count, 3);
  assert.equal(restarted.items.length, 3);
  assert.ok(restarted.items.every(item => item.id !== removedId));
  assert.ok(restarted.items.some(item => !unstableIds.has(item.id)), 'the restart must recover a skipped row');
});
