// Run with Node 24 (the production runtime): node --test scripts/test-assistant-blog-queue.cjs
// Execute the real route with mocked Hub/Claude transport. No live writes or API costs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');

const source = stripTypeScriptTypes(
  readFileSync(join(__dirname, '../app/api/assistant/route.ts'), 'utf8'),
  { mode: 'strip' }
).replace('import { NextRequest, NextResponse } from "next/server";', '')
  .replace(/^export /gm, '');

const item = (overrides = {}) => ({
  id: 'q1', keyword: 'หัวข้อทดสอบ', date: '2026-10-01', slot: 'morning',
  status: 'pending', category: 12, runId: '', postUrl: '', ...overrides,
});

function harness(initialState, { httpStatus = 200, claudeResponses = [] } = {}) {
  let state = initialState;
  const requests = [];
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-09-28T18:00:00.000Z'])); }
  }
  const context = {
    process: { env: { HUB_URL: 'https://hub.test', HUB_SECRET: 'test-only' } },
    Date: FixedDate, Intl, URLSearchParams, console,
    NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) },
    fetch: async (url, options = {}) => {
      requests.push({ url, options });
      if (url === 'https://api.anthropic.com/v1/messages') {
        assert.ok(claudeResponses.length, 'Unexpected Claude call');
        return { ok: true, json: async () => claudeResponses.shift() };
      }
      assert.equal(url, 'https://hub.test/api/state', 'Must only read Hub state');
      assert.equal(options.method ?? 'GET', 'GET', 'Must not mutate the queue');
      assert.equal(options.cache, 'no-store');
      assert.equal(options.headers['x-hub-token'], 'test-only');
      return { ok: httpStatus === 200, status: httpStatus, json: async () => state };
    },
  };
  vm.runInNewContext(source + '\nthis.api = { executeTool, POST };', context);
  return { ...context.api, requests, setState: value => { state = value; } };
}

test('canonical content_queue wins over conflicting legacy blog_queue; all dates and statuses survive', async () => {
  const h = harness({ content_queue: [item(), item({ id: 'q2', date: '2026-09-29', status: 'published' })], blog_queue: [] });
  const result = await h.executeTool('get_dashboard_summary', {});
  assert.equal(result.blog_queue_length, 2);
  assert.equal(result.blog_queue_status, 'available');
  assert.equal(result.content_queue[0].keyword, 'หัวข้อทดสอบ');
  assert.equal(result.content_queue[0].date, '2026-10-01');
  assert.equal(result.content_queue[1].status, 'published');
  assert.equal(result.automatic_trigger_status, 'unverified');
});

test('a successfully read empty array is explicitly empty', async () => {
  const result = await harness({ content_queue: [] }).executeTool('get_dashboard_summary', {});
  assert.equal(result.blog_queue_status, 'empty');
  assert.equal(result.blog_queue_length, 0);
  assert.equal(result.content_queue.length, 0);
  assert.equal(result.blog_queue_error, null);
});

test('missing/null/wrong-type arrays and malformed rows are unknown, never zero', async () => {
  for (const bad of [undefined, null, {}, '[]', [null], [item({ date: 123 })], [item({ slot: 'invalid' })]]) {
    const result = await harness({ content_queue: bad, blog_queue: [item()] }).executeTool('get_dashboard_summary', {});
    assert.equal(result.blog_queue_status, 'unavailable');
    assert.equal(result.blog_queue_length, null);
    assert.equal(result.content_queue, null);
    assert.ok(result.blog_queue_error);
  }
});

test('HTTP and application-level Hub errors cannot become empty queues', async () => {
  await assert.rejects(harness({}, { httpStatus: 503 }).executeTool('get_dashboard_summary', {}), /HTTP 503/);
  for (const bad of [null, [], { error: 'failed', content_queue: [] }, { ok: false, content_queue: [] }]) {
    await assert.rejects(harness(bad).executeTool('get_dashboard_summary', {}), /unavailable/);
  }
});

test('Bangkok date is correct after Thai midnight while UTC is still the prior day', async () => {
  const result = await harness({ content_queue: [] }).executeTool('get_dashboard_summary', {});
  assert.equal(result.today_bangkok, '2026-09-29');
  assert.equal(result.timezone, 'Asia/Bangkok');
  assert.equal(result.fetched_at, '2026-09-28T18:00:00.000Z');
});

test('successive tool calls re-read current queue rather than caching stale results', async () => {
  const h = harness({ content_queue: [] });
  assert.equal((await h.executeTool('get_dashboard_summary', {})).blog_queue_length, 0);
  h.setState({ content_queue: [item()] });
  assert.equal((await h.executeTool('get_dashboard_summary', {})).blog_queue_length, 1);
  assert.equal(h.requests.length, 2);
});

test('unrelated payload metadata is excluded and source data is not mutated', async () => {
  const state = { content_queue: [item({ callbackToken: 'private-test-metadata' })] };
  const before = JSON.stringify(state);
  const result = await harness(state).executeTool('get_dashboard_summary', {});
  assert.equal(JSON.stringify(result).includes('private-test-metadata'), false);
  assert.equal(JSON.stringify(state), before);
});

test('POST passes the actual canonical queue result back to the model', async () => {
  const h = harness({ content_queue: [item()], blog_queue: [] }, { claudeResponses: [
    { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'read1', name: 'get_dashboard_summary', input: {} }] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: 'test answer' }] },
  ] });
  const response = await h.POST({ json: async () => ({ messages: [{ role: 'user', content: 'อีก 3 วันมี keyword อะไร' }] }) });
  assert.equal(response.status, 200);
  const secondRequest = JSON.parse(h.requests[2].options.body);
  const toolResult = JSON.parse(secondRequest.messages.at(-1).content[0].content);
  assert.equal(toolResult.content_queue[0].date, '2026-10-01');
  assert.equal(toolResult.blog_queue_length, 1);
});

test('write confirmation gate still prevents unconfirmed Blog runs', async () => {
  const h = harness({}, { claudeResponses: [
    { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'write1', name: 'run_blog_now', input: { keyword: 'test' } }] },
  ] });
  const response = await h.POST({ json: async () => ({ messages: [{ role: 'user', content: 'run test' }] }) });
  assert.equal(response.body.needsConfirmation, true);
  assert.equal(h.requests.length, 1);
});
