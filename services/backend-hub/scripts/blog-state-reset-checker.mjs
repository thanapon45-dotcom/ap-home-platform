// Railway one-shot recovery/check. Never resets a healthy or terminal run.
// HUB_SECRET references ap-home-platform.HUB_SECRET; no credential is embedded.
const hubUrl = 'https://ap-home-platform-production.up.railway.app';
const hubSecret = process.env.HUB_SECRET || '';
if (!hubSecret) throw new Error('HUB_SECRET not configured');
async function request(path, body) {
  const response = await fetch(hubUrl + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'x-hub-token': hubSecret, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(`${path}: HTTP ${response.status}: ${data.error || 'failed'}`);
  return data;
}
try {
  const before = await request('/api/state');
  const probe = await request('/action/blog/reset', { dryRun: true });
  if (probe.dryRun !== true) throw new Error('Hub does not support safe reset validation');
  console.log('AUTH_CONTRACT_OK x-hub-token /action/blog/reset HTTP 200 (dry-run)');
  const age = Date.now() - Date.parse(before.blog?.startedAt || '');
  if (before.blog?.status === 'running' && Number.isFinite(age) && age > 45 * 60000) {
    await request('/action/blog/reset', { expectedRunId: before.blog.runId });
    console.log('STALE_RUN_RESET', before.blog.runId);
  } else {
    console.log('RESET_SKIPPED', before.blog?.status, before.blog?.runId || 'none');
  }
  const current = await request('/api/state');
  if (current.blog?.status !== 'running') {
    const audit = await request('/action/blog/queue/audit', { apply: true });
    console.log('QUEUE_AUDIT', JSON.stringify(audit));
    // This known published topic must fail without replacing the queue or invoking WF1.
    const response = await fetch(hubUrl + '/action/blog/queue/build', {
      method: 'POST', headers: { 'x-hub-token': hubSecret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun: true, items: [{ keyword: 'ปทุมธานี โซนไหนราคาที่ดินขึ้นเร็วที่สุด 5 ปีที่ผ่านมา', date: '2026-09-27', category: 35 }] }),
      signal: AbortSignal.timeout(60000),
    });
    const result = await response.json();
    if (response.status !== 409 || !result.rejected?.length) throw new Error('Duplicate build prevention verification failed');
    console.log('DUPLICATE_BUILD_BLOCKED', JSON.stringify(result.rejected));
  }
  const after = await request('/api/state');
  if (before.blog?.status !== 'running' && JSON.stringify(before.blog) !== JSON.stringify(after.blog)) throw new Error('Terminal blog evidence changed unexpectedly');
  if (JSON.stringify(before.fb_queue) !== JSON.stringify(after.fb_queue)) throw new Error('Facebook queue changed during check');
  console.log('CHECK_COMPLETE', JSON.stringify({ status: after.blog?.status, runId: after.blog?.runId, queue: after.content_queue?.length }));
} catch (error) {
  console.error('CHECK_FAILED', error.message);
  process.exitCode = 1;
}
