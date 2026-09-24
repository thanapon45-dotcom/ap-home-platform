const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const originalFetch = global.fetch;
const originalEnv = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY };
afterEach(() => {
  global.fetch = originalFetch;
  for (const [key, value] of [['SUPABASE_URL', originalEnv.url], ['SUPABASE_SERVICE_KEY', originalEnv.key]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
function loadRoute(file) {
  const filename = path.resolve(__dirname, '..', file);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', js)(createRequire(filename), module, module.exports);
  return module.exports;
}
function setup({ projectFailure = false, marketFailure = false } = {}) {
  process.env.SUPABASE_URL = 'https://example.test';
  process.env.SUPABASE_SERVICE_KEY = 'test-only';
  const rows = { projects: [], reno_deals: [{ id: 'separate-flip' }] };
  const calls = [];
  global.fetch = async (url, init = {}) => {
    const u = new URL(url); const table = u.pathname.split('/').at(-1);
    calls.push({ table, url: u, init });
    if ((projectFailure && table === 'projects') || (marketFailure && table === 'market_insights')) return Response.json({}, { status: 503 });
    if (init.method === 'POST') { rows[table].push(...JSON.parse(init.body)); return Response.json(JSON.parse(init.body)); }
    let data = rows[table] || [];
    const area = u.searchParams.get('area_name');
    if (area) data = data.filter(r => r.area_name === area.slice(3));
    return Response.json(data);
  };
  return { rows, calls, brains: loadRoute('app/api/brains/context/route.ts') };
}
const request = (query = '') => new NextRequest('http://localhost/api/brains/context' + query);

test('saved Land Analyzer project reaches Brains with budget fields and remains separate from flips', async () => {
  const { brains, rows } = setup();
  const project = { id: 'land-1', name: 'Saved project', area_name: 'รังสิต', land_price: 1000000, build_cost: 12000, roi: 20 };
  const projects = loadRoute('app/api/projects/route.ts');
  const saved = await projects.POST(new NextRequest('http://localhost/api/projects', { method: 'POST', body: JSON.stringify(project), headers: { 'content-type': 'application/json' } }));
  assert.equal(saved.status, 200);
  const result = await (await brains.GET(request())).json();
  assert.deepEqual(result.land_analysis.projects, rows.projects);
  assert.equal(result.land_analysis.business_model, 'build_to_sell');
  assert.equal(result.land_analysis.count, 1);
  assert.equal(result.land_analysis.projects[0].build_cost, 12000);
  assert.deepEqual(result.investment.deals, [{ id: 'separate-flip' }]);
  assert.equal(result.evidence.relationships_inferred, false);
});
test('area is encoded and filters saved projects; cap applies to new source', async () => {
  const { brains, rows, calls } = setup();
  const area = 'รังสิต & คลอง 1';
  rows.projects.push({ id: 'yes', area_name: area }, { id: 'no', area_name: 'อื่น' });
  const result = await (await brains.GET(request('?area=' + encodeURIComponent(area) + '&limit=999'))).json();
  assert.deepEqual(result.land_analysis.projects.map(x => x.id), ['yes']);
  const call = calls.find(c => c.table === 'projects');
  assert.equal(call.url.searchParams.get('area_name'), 'eq.' + area);
  assert.equal(call.url.searchParams.get('limit'), '50');
  assert.equal(call.init.cache, 'no-store');
});
test('an empty successful read means zero saved projects', async () => {
  const { brains } = setup();
  const result = await (await brains.GET(request())).json();
  assert.equal(result.land_analysis.status, 'available');
  assert.equal(result.land_analysis.count, 0);
});
test('project source failure preserves existing context and is not represented as zero projects', async () => {
  const { brains } = setup({ projectFailure: true });
  const response = await brains.GET(request());
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.land_analysis.status, 'unavailable');
  assert.equal(result.land_analysis.count, null);
  assert.equal(result.investment.count, 1);
});
test('existing source failure still reports an error', async () => {
  const { brains } = setup({ marketFailure: true });
  const response = await brains.GET(request());
  assert.equal(response.status, 500);
  assert.equal((await response.json()).ok, false);
});
test('missing configuration fails before any request', async () => {
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_KEY;
  global.fetch = () => { throw new Error('must not fetch'); };
  const brains = loadRoute('app/api/brains/context/route.ts');
  assert.equal((await brains.GET(request())).status, 500);
});
