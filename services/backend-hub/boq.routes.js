// ============================================================================
// Hub API — BOQ (ถอดราคา) Feature v1
// ============================================================================
// วิธีติดตั้งใน services/backend-hub/server.cjs:
//
//   const boqRouter = require('./boq.routes');
//   app.use('/api/boq', requireHubToken, boqRouter);  // ใช้ auth middleware เดิมของ Hub
//
// ต้องมี env vars (มีอยู่แล้วในระบบ): SUPABASE_URL, SUPABASE_SERVICE_KEY
// ⚠️ ต้องเป็น service_role key เท่านั้น — ตาราง BOQ ทั้งหมดเปิด RLS แบบ
//    service_role-only ตอนรัน migration (anon key จะโดน 42501 ทุก request)
//
// Dependency: @supabase/supabase-js (ควรมีอยู่แล้วใน package.json ของ Hub)
// ============================================================================

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function fail(res, status, message, extra = {}) {
  return res.status(status).json({ ok: false, error: message, ...extra });
}

// ============================================================================
// PRODUCT CATALOG
// ============================================================================

// GET /api/boq/catalog?category=floor&active=true&q=กระเบื้อง
router.get('/catalog', async (req, res) => {
  const { category, active, q } = req.query;
  let query = supabase.from('product_catalog').select('*').order('category').order('name');
  if (category) query = query.eq('category', category);
  if (active !== undefined) query = query.eq('is_active', active === 'true');
  if (q) query = query.ilike('name', `%${q}%`);
  const { data, error } = await query;
  if (error) return fail(res, 500, error.message);
  res.json({ ok: true, items: data });
});

// POST /api/boq/catalog
// body: { sku?, category, name, brand?, model?, spec?, unit, material_unit_price?, labor_unit_price?, price_source? }
router.post('/catalog', async (req, res) => {
  const body = req.body || {};
  if (!body.category || !body.name || !body.unit) {
    return fail(res, 400, 'category, name, unit are required');
  }
  const { data, error } = await supabase.from('product_catalog').insert(body).select().single();
  if (error) return fail(res, 500, error.message);
  res.json({ ok: true, item: data });
});

// PATCH /api/boq/catalog/:id — ใช้อัปเดตราคาใหม่เป็นหลัก (จะกระทบทุกโปรเจกต์ที่ยังไม่ได้เพิ่มรายการ
// แต่ไม่กระทบ boq_line_items เก่าเพราะเป็น snapshot แล้ว)
router.patch('/catalog/:id', async (req, res) => {
  const body = { ...req.body, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('product_catalog').update(body).eq('id', req.params.id).select().single();
  if (error) return fail(res, 500, error.message);
  res.json({ ok: true, item: data });
});

// ============================================================================
// BOQ CATEGORIES (tree — frontend ประกอบ parent/child เองจาก flat list)
// ============================================================================

// GET /api/boq/categories
router.get('/categories', async (req, res) => {
  const { data, error } = await supabase.from('boq_categories').select('*').order('sort_order');
  if (error) return fail(res, 500, error.message);
  res.json({ ok: true, items: data });
});

// POST /api/boq/categories
// body: { parent_id?, code?, name, level?, overhead_percent?, sort_order? }
router.post('/categories', async (req, res) => {
  const body = req.body || {};
  if (!body.name) return fail(res, 400, 'name is required');
  const { data, error } = await supabase.from('boq_categories').insert(body).select().single();
  if (error) return fail(res, 500, error.message);
  res.json({ ok: true, item: data });
});

// ============================================================================
// BOQ PROJECTS
// ============================================================================

// GET /api/boq/projects?status=active
router.get('/projects', async (req, res) => {
  const { status } = req.query;
  let query = supabase.from('boq_projects').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return fail(res, 500, error.message);
  res.json({ ok: true, items: data });
});

// POST /api/boq/projects
// body: { site_id?, project_name, customer_name?, address?, usable_area_sqm?, created_by? }
router.post('/projects', async (req, res) => {
  const body = req.body || {};
  if (!body.project_name) return fail(res, 400, 'project_name is required');
  const { data, error } = await supabase.from('boq_projects').insert(body).select().single();
  if (error) return fail(res, 500, error.message);
  res.json({ ok: true, item: data });
});

// GET /api/boq/projects/:id — รายละเอียด + line items + milestones + สรุปยอด (รวม overhead ต่อหมวด)
router.get('/projects/:id', async (req, res) => {
  const projectId = req.params.id;

  const [{ data: project, error: pErr }, { data: items, error: iErr }, { data: milestones, error: mErr }] =
    await Promise.all([
      supabase.from('boq_projects').select('*').eq('id', projectId).single(),
      supabase
        .from('boq_line_items')
        .select('*, boq_categories(id, name, code, overhead_percent)')
        .eq('boq_project_id', projectId)
        .order('sort_order'),
      supabase.from('boq_payment_milestones').select('*').eq('boq_project_id', projectId).order('sort_order'),
    ]);

  if (pErr) return fail(res, 404, 'project not found');
  if (iErr) return fail(res, 500, iErr.message);
  if (mErr) return fail(res, 500, mErr.message);

  const byCategory = {};
  for (const it of items) {
    const cat = it.boq_categories;
    const catId = cat?.id || 'uncategorized';
    if (!byCategory[catId]) {
      byCategory[catId] = {
        category_id: catId,
        category_name: cat?.name || '',
        overhead_percent: Number(cat?.overhead_percent || 0),
        material_total: 0,
        labor_total: 0,
        subtotal: 0,
      };
    }
    byCategory[catId].material_total += Number(it.material_total || 0);
    byCategory[catId].labor_total += Number(it.labor_total || 0);
    byCategory[catId].subtotal += Number(it.line_total || 0);
  }

  let grandTotal = 0;
  const categorySummary = Object.values(byCategory).map((c) => {
    const overheadAmount = c.subtotal * (c.overhead_percent / 100);
    const totalWithOverhead = c.subtotal + overheadAmount;
    grandTotal += totalWithOverhead;
    return { ...c, overhead_amount: overheadAmount, total_with_overhead: totalWithOverhead };
  });

  res.json({
    ok: true,
    project,
    line_items: items,
    milestones,
    summary: {
      category_summary: categorySummary,
      grand_total: grandTotal,
      price_per_sqm: project.usable_area_sqm ? grandTotal / project.usable_area_sqm : null,
    },
  });
});

// ============================================================================
// LINE ITEMS
// ============================================================================

// POST /api/boq/line-items
// body: { boq_project_id, category_id, product_id?, custom_name?, quantity, unit?, note?, source? }
// ถ้าส่ง product_id มา ระบบ snapshot ราคาจาก product_catalog ให้อัตโนมัติ (ไม่ต้องส่งราคาเอง)
router.post('/line-items', async (req, res) => {
  const body = req.body || {};
  if (!body.boq_project_id || !body.category_id) {
    return fail(res, 400, 'boq_project_id and category_id are required');
  }
  if (!body.product_id && !body.custom_name) {
    return fail(res, 400, 'either product_id or custom_name is required');
  }

  let unit = body.unit;
  let materialPrice = body.material_unit_price || 0;
  let laborPrice = body.labor_unit_price || 0;

  if (body.product_id) {
    const { data: product, error: prodErr } = await supabase
      .from('product_catalog')
      .select('unit, material_unit_price, labor_unit_price')
      .eq('id', body.product_id)
      .single();
    if (prodErr) return fail(res, 400, 'product_id not found in catalog');
    unit = unit || product.unit;
    materialPrice = product.material_unit_price;
    laborPrice = product.labor_unit_price;
  }

  if (!unit) return fail(res, 400, 'unit is required (or provide product_id)');

  const insertBody = {
    boq_project_id: body.boq_project_id,
    category_id: body.category_id,
    product_id: body.product_id || null,
    custom_name: body.custom_name || null,
    quantity: body.quantity || 0,
    unit,
    material_unit_price: materialPrice,
    labor_unit_price: laborPrice,
    source: body.source || 'manual',
    note: body.note || null,
    sort_order: body.sort_order || 0,
  };

  const { data, error } = await supabase.from('boq_line_items').insert(insertBody).select().single();
  if (error) return fail(res, 500, error.message);
  res.json({ ok: true, item: data });
});

// PATCH /api/boq/line-items/:id — แก้ quantity/note เป็นหลัก (ไม่ re-snapshot ราคาอัตโนมัติ)
router.patch('/line-items/:id', async (req, res) => {
  const allowed = ['quantity', 'note', 'sort_order', 'custom_name'];
  const body = {};
  for (const k of allowed) if (req.body[k] !== undefined) body[k] = req.body[k];
  if (Object.keys(body).length === 0) return fail(res, 400, 'no updatable fields provided');

  const { data, error } = await supabase.from('boq_line_items').update(body).eq('id', req.params.id).select().single();
  if (error) return fail(res, 500, error.message);
  res.json({ ok: true, item: data });
});

// DELETE /api/boq/line-items/:id
router.delete('/line-items/:id', async (req, res) => {
  const { error } = await supabase.from('boq_line_items').delete().eq('id', req.params.id);
  if (error) return fail(res, 500, error.message);
  res.json({ ok: true });
});

// ============================================================================
// PAYMENT MILESTONES (เชื่อมกับ QC Line ผ่าน sites.stage)
// ============================================================================

// POST /api/boq/projects/:id/milestones/generate
// body: { milestones: [{ milestone_name, percent_of_total, qc_trigger_stage? }] }  ผลรวม percent ต้อง = 100
// amount คำนวณจาก grand_total ปัจจุบันของโปรเจกต์อัตโนมัติ (รวม overhead)
router.post('/projects/:id/milestones/generate', async (req, res) => {
  const projectId = req.params.id;
  const { milestones } = req.body || {};
  if (!Array.isArray(milestones) || milestones.length === 0) {
    return fail(res, 400, 'milestones array is required');
  }

  const { data: items, error: iErr } = await supabase
    .from('boq_line_items')
    .select('line_total, boq_categories(id, overhead_percent)')
    .eq('boq_project_id', projectId);
  if (iErr) return fail(res, 500, iErr.message);

  const byCategory = {};
  for (const it of items) {
    const catId = it.boq_categories?.id || 'uncategorized';
    if (!byCategory[catId]) {
      byCategory[catId] = { subtotal: 0, overhead_percent: Number(it.boq_categories?.overhead_percent || 0) };
    }
    byCategory[catId].subtotal += Number(it.line_total || 0);
  }
  const grandTotal = Object.values(byCategory).reduce(
    (sum, c) => sum + c.subtotal * (1 + c.overhead_percent / 100),
    0
  );

  const totalPercent = milestones.reduce((s, m) => s + Number(m.percent_of_total || 0), 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    return fail(res, 400, `percent_of_total ต้องรวมเป็น 100 (ตอนนี้รวม ${totalPercent})`);
  }

  const rows = milestones.map((m, idx) => ({
    boq_project_id: projectId,
    milestone_name: m.milestone_name,
    percent_of_total: m.percent_of_total,
    amount: grandTotal * (m.percent_of_total / 100),
    qc_trigger_stage: m.qc_trigger_stage || null,
    sort_order: idx,
  }));

  // ลบของเก่าก่อนสร้างใหม่ทั้งชุด กัน milestone ซ้ำซ้อนเวลากด generate ซ้ำ
  await supabase.from('boq_payment_milestones').delete().eq('boq_project_id', projectId);
  const { data, error } = await supabase.from('boq_payment_milestones').insert(rows).select();
  if (error) return fail(res, 500, error.message);
  res.json({ ok: true, milestones: data, grand_total: grandTotal });
});

// POST /api/boq/milestones/trigger-by-stage
// body: { site_id, stage }
// เรียกจาก webhook handler เดิมของ Hub เมื่อ sites.stage เปลี่ยน (เช่นตอน QC ผ่านขั้นโครงสร้าง)
// เพื่อ auto-mark milestone ที่ตรง stage เป็น 'invoiced'
router.post('/milestones/trigger-by-stage', async (req, res) => {
  const { site_id, stage } = req.body || {};
  if (!site_id || !stage) return fail(res, 400, 'site_id and stage are required');

  const { data: project, error: pErr } = await supabase
    .from('boq_projects')
    .select('id')
    .eq('site_id', site_id)
    .single();
  if (pErr || !project) return fail(res, 404, 'no boq_project linked to this site_id');

  const { data, error } = await supabase
    .from('boq_payment_milestones')
    .update({ status: 'invoiced', invoiced_at: new Date().toISOString() })
    .eq('boq_project_id', project.id)
    .eq('qc_trigger_stage', stage)
    .eq('status', 'pending')
    .select();
  if (error) return fail(res, 500, error.message);

  res.json({ ok: true, updated: data });
});

// ============================================================================
// CAD RISK-MITIGATION LAYER
// หลักการ: endpoint กลุ่มนี้ไม่เคยเขียนเข้า boq_line_items ตรงๆ เด็ดขาด
// ทุกอย่างพักไว้ที่ cad_room_import_staging จนกว่าจะมีคน approve
// ============================================================================

// POST /api/boq/cad-upload
// body: { boq_project_id?, file_name, file_type, file_size_bytes?, uploaded_by?,
//         health_status, layer_count?, standard_layers_found?, parse_notes?,
//         staged_rooms?: [{ room_name_raw, floor_no? }] }
// หมายเหตุ: health_status/layer_count มาจากผล CAD Health Check script ที่รันแยก
// (ฝั่ง client หรือ n8n) endpoint นี้แค่บันทึกผล ไม่ได้ parse ไฟล์เอง
router.post('/cad-upload', async (req, res) => {
  const body = req.body || {};
  if (!body.file_name || !body.file_type) {
    return fail(res, 400, 'file_name and file_type are required');
  }
  if (!['dwg', 'dxf'].includes(body.file_type)) {
    return fail(res, 400, 'file_type must be dwg or dxf');
  }

  const { data: upload, error: uErr } = await supabase
    .from('cad_file_uploads')
    .insert({
      boq_project_id: body.boq_project_id || null,
      file_name: body.file_name,
      file_type: body.file_type,
      file_size_bytes: body.file_size_bytes || null,
      uploaded_by: body.uploaded_by || null,
      health_status: body.health_status || 'red',
      layer_count: body.layer_count || null,
      standard_layers_found: body.standard_layers_found || null,
      parse_notes: body.parse_notes || null,
    })
    .select()
    .single();
  if (uErr) return fail(res, 500, uErr.message);

  // red = ไม่พยายาม stage อะไรเลย ตรงไปกรอกเองตาม graceful fallback
  let stagedRooms = [];
  if (body.health_status !== 'red' && Array.isArray(body.staged_rooms) && body.staged_rooms.length > 0) {
    const rows = body.staged_rooms.map((r) => ({
      cad_file_upload_id: upload.id,
      room_name_raw: r.room_name_raw,
      floor_no: r.floor_no || null,
    }));
    const { data: staged, error: sErr } = await supabase.from('cad_room_import_staging').insert(rows).select();
    if (sErr) return fail(res, 500, sErr.message);
    stagedRooms = staged;
  }

  res.json({ ok: true, upload, staged_rooms: stagedRooms });
});

// GET /api/boq/cad-staging?cad_file_upload_id=...&approved=false
// ใช้แสดงหน้า "ตรวจสอบก่อนใช้จริง" ให้คนกดยืนยัน/ปฏิเสธทีละแถว
router.get('/cad-staging', async (req, res) => {
  const { cad_file_upload_id, approved } = req.query;
  let query = supabase.from('cad_room_import_staging').select('*').order('floor_no').order('room_name_raw');
  if (cad_file_upload_id) query = query.eq('cad_file_upload_id', cad_file_upload_id);
  if (approved !== undefined) query = query.eq('approved', approved === 'true');
  const { data, error } = await query;
  if (error) return fail(res, 500, error.message);
  res.json({ ok: true, items: data });
});

// PATCH /api/boq/cad-staging/:id/approve
// body: { reviewed_by, mapped_boq_project_id?, room_name_raw?, floor_no? }
// นี่คือจุดเดียวที่ทำให้ข้อมูลจาก CAD "นับเป็นจริง" ในสายตา BOQ — ต้องมีคน approve เสมอ
router.patch('/cad-staging/:id/approve', async (req, res) => {
  const body = req.body || {};
  if (!body.reviewed_by) return fail(res, 400, 'reviewed_by is required');

  const update = {
    reviewed: true,
    approved: true,
    reviewed_by: body.reviewed_by,
    reviewed_at: new Date().toISOString(),
  };
  if (body.mapped_boq_project_id) update.mapped_boq_project_id = body.mapped_boq_project_id;
  if (body.room_name_raw) update.room_name_raw = body.room_name_raw; // เผื่อแก้ชื่อก่อน approve
  if (body.floor_no) update.floor_no = body.floor_no;

  const { data, error } = await supabase
    .from('cad_room_import_staging')
    .update(update)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return fail(res, 500, error.message);
  res.json({ ok: true, item: data });
});

// PATCH /api/boq/cad-staging/:id/reject — ปฏิเสธแถวนี้ ไม่เอาเข้าระบบ
router.patch('/cad-staging/:id/reject', async (req, res) => {
  const { reviewed_by } = req.body || {};
  const { data, error } = await supabase
    .from('cad_room_import_staging')
    .update({
      reviewed: true,
      approved: false,
      reviewed_by: reviewed_by || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return fail(res, 500, error.message);
  res.json({ ok: true, item: data });
});

module.exports = router;
