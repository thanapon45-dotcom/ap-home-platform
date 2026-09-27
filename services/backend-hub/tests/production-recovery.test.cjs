const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { findDuplicate, loadPublishedEvidence } = require('../blog-dedupe.cjs');
process.env.SUPABASE_URL = 'https://db.test';
process.env.SUPABASE_SERVICE_KEY = 'test-only';
process.env.HUB_SECRET = 'test-secret';
process.env.WP_URL = 'https://wp.test';
process.env.N8N_BLOG_WEBHOOK_URL = 'https://n8n.test/webhook';
const originalFetch = global.fetch;
let server, base, state, wp, writes, dispatches, failWp, failWrite;
const item = (keyword, id = keyword) => ({ id, keyword, date: '2026-01-01', status: 'pending', category: 35 });
before(async () => {
  const { app } = require('../server.cjs');
  server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { global.fetch = originalFetch; await new Promise(r => server.close(r)); });
beforeEach(() => {
  state = { blog: { status: 'idle', runId: '', startedAt: '' }, history: [], content_queue: [], fb_queue: [] };
  wp = []; writes = 0; dispatches = 0; failWp = false; failWrite = false;
  global.fetch = async (input, options = {}) => {
    const url = new URL(input);
    if (url.hostname === 'db.test' && url.pathname.endsWith('hub_state')) {
      if (options.method === 'POST') {
        if (failWrite) return new Response('unavailable', { status: 503 });
        state = JSON.parse(options.body).value; writes++; return new Response(null, { status: 204 });
      }
      return Response.json([{ value: structuredClone(state) }]);
    }
    if (url.hostname === 'db.test') return Response.json([]);
    if (url.hostname === 'wp.test') return failWp ? new Response('', { status: 503 }) : Response.json(wp, { headers: { 'x-wp-totalpages': '1' } });
    if (url.hostname === 'n8n.test') { dispatches++; return Response.json({ ok: true }); }
    throw new Error('Unexpected external request: ' + url.origin);
  };
});
async function post(path, body = {}, header = 'x-hub-token') {
  const r = await originalFetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', [header]: 'test-secret' }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
}
test('v1 auth rejects v2 header; reset dry-run preserves terminal evidence', async () => {
  state.blog.status = 'failed'; state.blog.runId = 'old_run';
  assert.equal((await post('/action/blog/reset', { dryRun: true }, 'x-hub-secret')).status, 401);
  const r = await post('/action/blog/reset', { dryRun: true });
  assert.equal(r.status, 200); assert.equal(r.data.dryRun, true); assert.equal(state.blog.runId, 'old_run'); assert.equal(writes, 0);
});
test('build rejects published WordPress topic and normalized duplicates in batch', async () => {
  wp = [{ id: 1005, title: { rendered: 'ปทุมธานี โซนไหนราคาที่ดินขึ้นเร็วที่สุด 5 ปีที่ผ่านมา' }, slug: 'old' }];
  const r = await post('/action/blog/queue/build', { items: [item(wp[0].title.rendered), item('New Topic'), item(' new  topic ', 'other')] });
  assert.equal(r.status, 200); assert.equal(r.data.count, 1); assert.equal(r.data.rejected.length, 2); assert.equal(state.content_queue.length, 1);
});
test('all-duplicate build preserves original queue', async () => {
  state.content_queue = [item('existing scheduled topic')];
  state.history = [{ engine: 'blog', keyword: 'published', status: 'published' }];
  assert.equal((await post('/action/blog/queue/build', { items: [item('published')] })).status, 409);
  assert.equal(state.content_queue[0].keyword, 'existing scheduled topic'); assert.equal(writes, 0);
});
test('brand-failed and Facebook-only history are not publication evidence', () => {
  state.history = [{ engine: 'blog', keyword: 'retry', status: 'failed', message: 'brand_guardrail_violation' }, { engine: 'fb', keyword: 'retry', status: 'published' }];
  assert.equal(findDuplicate(item('retry'), state, [], []), null);
  state.history.push({ engine: 'blog', keyword: 'retry', status: 'failed', message: 'duplicate_slug_exists' });
  assert.equal(findDuplicate(item('retry'), state, [], []).reason, 'keyword_already_published');
});
test('pre-dispatch duplicate is quarantined and never calls WF1', async () => {
  state.content_queue = [item('published')]; wp = [{ id: 1, title: { rendered: 'published: subtitle' } }];
  const r = await post('/action/blog/queue/run-next');
  assert.equal(r.data.skipped, true); assert.equal(state.content_queue[0].status, 'failed'); assert.equal(dispatches, 0);
});
test('evidence outage fails closed and leaves pending queue unchanged', async () => {
  state.content_queue = [item('new')]; failWp = true;
  assert.equal((await post('/action/blog/queue/run-next')).status, 503);
  assert.equal(state.content_queue[0].status, 'pending'); assert.equal(dispatches, 0); assert.equal(writes, 0);
});
test('state write failure never dispatches a job', async () => {
  state.content_queue = [item('new')]; failWrite = true;
  assert.equal((await post('/action/blog/queue/run-next')).status, 503); assert.equal(dispatches, 0);
});
test('two simultaneous run-next requests dispatch only one workflow', async () => {
  state.content_queue = [item('new')];
  const results = await Promise.all([post('/action/blog/queue/run-next'), post('/action/blog/queue/run-next')]);
  assert.deepEqual(results.map(x => x.status).sort(), [200, 409]); assert.equal(dispatches, 1);
});
test('queue audit dry-run does not mutate; apply preserves IDs and evidence', async () => {
  state.content_queue = [item('published', 'original-id'), item('new')]; wp = [{ id: 3, title: { rendered: 'published' } }];
  assert.equal((await post('/action/blog/queue/audit')).data.results[0].duplicate.postId, 3); assert.equal(writes, 0);
  await post('/action/blog/queue/audit', { apply: true });
  assert.equal(state.content_queue[0].id, 'original-id'); assert.equal(state.content_queue[0].status, 'failed'); assert.equal(state.content_queue[1].status, 'pending');
});
test('publication scan includes second WordPress page', async () => {
  const data = await loadPublishedEvidence({ supabaseUrl: 'https://db.test', supabaseKey: 'x', wpUrl: 'https://wp.test', fetchImpl: async url => {
    if (url.hostname === 'db.test') return Response.json([]);
    const rows = url.searchParams.get('page') === '1' ? Array.from({length:100}, (_, i) => ({id:i,title:{rendered:'old'+i}})) : [{id:1005,title:{rendered:'target'}}];
    return Response.json(rows, {headers:{'x-wp-totalpages':'2'}});
  }});
  assert.equal(data.wordpress.length, 101); assert.equal(findDuplicate(item('target'), state, [], data.wordpress).postId, 1005);
});
test('TelegramNotifier sends special characters as plain text', async () => {
  const https = require('node:https'); const original = https.request; let sent;
  https.request = (_options, callback) => {
    const req = new EventEmitter(); req.setTimeout = () => req; req.write = text => { sent = JSON.parse(text); };
    req.end = () => { const response = new EventEmitter(); callback(response); response.emit('data', Buffer.from('{"ok":true}')); response.emit('end'); }; return req;
  };
  try {
    const { TelegramNotifier } = require('../dist/infrastructure/telegram/TelegramNotifier.js');
    await new TelegramNotifier('test', 'test').sendStructured({ title: 'Health', body: 'run_da089n87 _ * [ ] < >', level: 'warn' });
    assert.equal(sent.parse_mode, undefined); assert.ok(sent.text.includes('run_da089n87 _ * [ ] < >'));
  } finally { https.request = original; }
});
test('failed health notification is retried on next check, then cooldown applies after success', async () => {
  const { HealthMonitor } = require('../dist/modules/health/HealthMonitor.js'); let attempts = 0;
  const monitor = new HealthMonitor({}, { sendStructured: async () => { if (++attempts === 1) throw new Error('offline'); } });
  await monitor.alert('test', 'title', 'body', 'warn');
  await monitor.alert('test', 'title', 'body', 'warn');
  await monitor.alert('test', 'title', 'body', 'warn');
  assert.equal(attempts, 2);
});
test('guarded reset cannot clobber a different run', async () => {
  state.blog = { status: 'running', runId: 'new-run' };
  const r = await post('/action/blog/reset', { expectedRunId: 'old-run' });
  assert.equal(r.status, 409); assert.equal(writes, 0); assert.equal(state.blog.runId, 'new-run');
});
test('guarded reset closes only the matching running queue item', async () => {
  state.blog = { status: 'running', runId: 'stale-run' };
  state.content_queue = [{ ...item('old'), status: 'running', runId: 'stale-run' }, item('future')];
  const r = await post('/action/blog/reset', { expectedRunId: 'stale-run' });
  assert.equal(r.status, 200); assert.equal(state.blog.status, 'idle');
  assert.equal(state.content_queue[0].status, 'failed'); assert.equal(state.content_queue[1].status, 'pending');
});
