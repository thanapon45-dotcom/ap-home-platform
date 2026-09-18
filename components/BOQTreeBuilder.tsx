'use client';

// ============================================================================
// BOQ Tree Builder — AP-Home Platform OS
// ============================================================================
// หน้าที่: กรอกปริมาณ BOQ ต่อโปรเจกต์ แบบ tree ตามหมวดหมู่ (boq_categories)
// คำนวณราคาอัตโนมัติจาก master catalog (product_catalog) หรือกรอกเอง (custom)
//
// Data flow: Browser → /api/boq/* (Vercel proxy) → Hub (boq-routes.cjs) → Supabase
// ทุก endpoint อ้างอิงตาม boq-routes.cjs ที่ deploy แล้ว (Sep 17, 2026)
//
// v1 scope (ตาม memory ที่ confirm กับ Archi):
//   - กรอกปริมาณเอง ไม่มี auto quantity takeoff จาก DWG
//   - CAD room import เป็นฟีเจอร์แยก (staging + approve) ไม่ได้อยู่ในหน้านี้
//   - Payment milestones เป็นฟีเจอร์แยก ไม่ได้อยู่ในหน้านี้
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Search,
  FolderTree,
  Loader2,
  X,
  FilePlus2,
} from 'lucide-react';

// ----------------------------------------------------------------------------
// Types — ตรงกับ boq_schema.sql
// ----------------------------------------------------------------------------
interface Category {
  id: string;
  parent_id: string | null;
  code: string | null;
  name: string;
  level: number;
  overhead_percent: number;
  sort_order: number;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
}

interface Product {
  id: string;
  sku: string | null;
  category: string;
  name: string;
  brand: string | null;
  model: string | null;
  spec: string | null;
  unit: string;
  material_unit_price: number;
  labor_unit_price: number;
}

interface LineItem {
  id: string;
  boq_project_id: string;
  category_id: string;
  product_id: string | null;
  custom_name: string | null;
  quantity: number;
  unit: string;
  material_unit_price: number;
  labor_unit_price: number;
  material_total: number;
  labor_total: number;
  line_total: number;
  source: 'manual' | 'cad_import';
  note: string | null;
}

interface Project {
  id: string;
  project_name: string;
  customer_name: string | null;
  address: string | null;
  usable_area_sqm: number | null;
  status: 'draft' | 'active' | 'approved' | 'completed' | 'cancelled';
}

interface Summary {
  category_summary: {
    category_id: string;
    category_name: string;
    overhead_percent: number;
    material_total: number;
    labor_total: number;
    subtotal: number;
    overhead_amount: number;
    total_with_overhead: number;
  }[];
  grand_total: number;
  price_per_sqm: number | null;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
const baht = (n: number | null | undefined) =>
  `฿${Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;

function buildTree(categories: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  categories.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: CategoryNode[] = [];
  categories.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

// รวม category ลูกทั้งหมดของ node หนึ่ง (ใช้หา line items ของทั้งกิ่ง ไม่ใช่แค่ leaf)
function collectIds(node: CategoryNode): string[] {
  return [node.id, ...node.children.flatMap(collectIds)];
}

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`/api/boq/${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

// ============================================================================
// Main component
// ============================================================================
export default function BOQTreeBuilder() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);

  const tree = useMemo(() => buildTree(categories), [categories]);

  // ---- load: projects + categories (ครั้งเดียวตอนเปิดหน้า) --------------------
  const loadProjects = useCallback(async () => {
    const data = await api('projects');
    setProjects(data.items || []);
    if (!projectId && data.items?.length) setProjectId(data.items[0].id);
  }, [projectId]);

  const loadCategories = useCallback(async () => {
    const data = await api('categories');
    setCategories(data.items || []);
  }, []);

  useEffect(() => {
    loadProjects().catch((e) => setError(e.message));
    loadCategories().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- load: line items + summary (เมื่อเปลี่ยนโปรเจกต์) ----------------------
  const refreshProject = useCallback(async (pid: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api(`projects/${pid}`);
      setLineItems(data.line_items || []);
      setSummary(data.summary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectId) refreshProject(projectId);
  }, [projectId, refreshProject]);

  // ---- คำนวณยอดต่อ node ของ tree (รวมลูกทั้งหมด) ------------------------------
  const totalsByCategory = useMemo(() => {
    const raw = new Map<string, { total: number; count: number }>();
    for (const item of lineItems) {
      const cur = raw.get(item.category_id) || { total: 0, count: 0 };
      cur.total += Number(item.line_total || 0);
      cur.count += 1;
      raw.set(item.category_id, cur);
    }
    const rollup = new Map<string, { total: number; count: number }>();
    function walk(node: CategoryNode) {
      let total = raw.get(node.id)?.total || 0;
      let count = raw.get(node.id)?.count || 0;
      for (const child of node.children) {
        walk(child);
        const c = rollup.get(child.id)!;
        total += c.total;
        count += c.count;
      }
      rollup.set(node.id, { total, count });
    }
    tree.forEach(walk);
    return rollup;
  }, [lineItems, tree]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedCategory = categories.find((c) => c.id === selectedCatId) || null;
  const visibleItems = selectedCatId
    ? lineItems.filter((i) => i.category_id === selectedCatId)
    : [];

  // ---- actions ---------------------------------------------------------------
  const handleQuantityChange = async (item: LineItem, quantity: number) => {
    if (quantity === item.quantity) return;
    setLineItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity } : i))
    ); // optimistic
    try {
      await api(`line-items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      if (projectId) await refreshProject(projectId);
    } catch (e: any) {
      setError(e.message);
      if (projectId) refreshProject(projectId); // rollback ด้วยการโหลดของจริง
    }
  };

  const handleDeleteItem = async (item: LineItem) => {
    if (!confirm(`ลบรายการ "${item.custom_name || 'รายการนี้'}" ?`)) return;
    try {
      await api(`line-items/${item.id}`, { method: 'DELETE' });
      if (projectId) await refreshProject(projectId);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAddCategory = async (
    name: string,
    parent_id: string | null,
    overhead_percent: number
  ) => {
    const parent = parent_id ? categories.find((c) => c.id === parent_id) : null;
    await api('categories', {
      method: 'POST',
      body: JSON.stringify({
        name,
        parent_id,
        level: parent ? parent.level + 1 : 0,
        overhead_percent,
        sort_order: categories.filter((c) => c.parent_id === parent_id).length,
      }),
    });
    await loadCategories();
    setShowNewCategory(false);
  };

  const handleCreateProject = async (payload: {
    project_name: string;
    customer_name: string;
    address: string;
    usable_area_sqm: string;
  }) => {
    const body = {
      project_name: payload.project_name,
      customer_name: payload.customer_name || null,
      address: payload.address || null,
      usable_area_sqm: payload.usable_area_sqm ? Number(payload.usable_area_sqm) : null,
      status: 'draft',
    };
    const created = await api('projects', { method: 'POST', body: JSON.stringify(body) });
    await loadProjects();
    setProjectId(created.item.id);
    setShowNewProject(false);
  };

  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-5">
        {/* ---------- Header: project selector ---------- */}
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl px-5 py-4 md:px-7 md:py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">BOQ</p>
            <h1 className="text-2xl md:text-3xl font-bold">ถอดราคา BOQ</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={projectId || ''}
              onChange={(e) => setProjectId(e.target.value)}
              className="bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm min-w-[240px]"
            >
              {projects.length === 0 && <option value="">ยังไม่มีโปรเจกต์</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name} {p.customer_name ? `— ${p.customer_name}` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-sm hover:bg-cyan-500/25 transition"
            >
              <FilePlus2 size={16} /> โปรเจกต์ใหม่
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ---------- Body: tree + items ---------- */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Category tree */}
          <div className="lg:col-span-4 rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-300">
                <FolderTree size={18} />
                <span className="font-semibold">หมวดหมู่ BOQ</span>
              </div>
              <button
                onClick={() => setShowNewCategory(true)}
                className="text-xs px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 transition text-slate-300"
              >
                + หมวด
              </button>
            </div>

            {tree.length === 0 ? (
              <div className="text-sm text-slate-500 py-8 text-center border border-dashed border-slate-700 rounded-2xl">
                ยังไม่มีหมวดหมู่ — กด &quot;+ หมวด&quot; เพื่อเริ่มสร้าง
              </div>
            ) : (
              <div className="space-y-1">
                {tree.map((node) => (
                  <CategoryRow
                    key={node.id}
                    node={node}
                    depth={0}
                    expanded={expanded}
                    onToggle={toggleExpand}
                    selectedId={selectedCatId}
                    onSelect={setSelectedCatId}
                    totals={totalsByCategory}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="lg:col-span-8 rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl p-5">
            {!selectedCategory ? (
              <div className="text-slate-500 text-sm py-16 text-center">
                เลือกหมวดหมู่ทางซ้ายเพื่อดู/เพิ่มรายการ
              </div>
            ) : (
              <LineItemsPanel
                category={selectedCategory}
                items={visibleItems}
                projectId={projectId}
                onQuantityChange={handleQuantityChange}
                onDelete={handleDeleteItem}
                onAdded={() => projectId && refreshProject(projectId)}
                loading={loading}
              />
            )}
          </div>
        </section>

        {/* ---------- Summary bar ---------- */}
        {summary && <SummaryBar summary={summary} />}
      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={handleCreateProject}
        />
      )}
      {showNewCategory && (
        <NewCategoryModal
          categories={categories}
          onClose={() => setShowNewCategory(false)}
          onCreate={handleAddCategory}
        />
      )}
    </div>
  );
}

// ============================================================================
// Category tree row (recursive)
// ============================================================================
function CategoryRow({
  node,
  depth,
  expanded,
  onToggle,
  selectedId,
  onSelect,
  totals,
}: {
  node: CategoryNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  totals: Map<string, { total: number; count: number }>;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const stats = totals.get(node.id) || { total: 0, count: 0 };

  return (
    <div>
      <div
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: `${depth * 16}px` }}
        className={`flex items-center justify-between gap-2 rounded-xl px-2 py-2 cursor-pointer text-sm transition ${
          isSelected
            ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-200'
            : 'border border-transparent hover:bg-slate-800/60 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(node.id);
              }}
              className="shrink-0 text-slate-500 hover:text-slate-300"
            >
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-[14px] shrink-0" />
          )}
          <span className="truncate">
            {node.code ? `${node.code} · ` : ''}
            {node.name}
          </span>
          {node.overhead_percent > 0 && (
            <span className="shrink-0 text-[10px] text-amber-300/80">
              +{node.overhead_percent}%
            </span>
          )}
        </div>
        <div className="shrink-0 text-xs text-slate-400">
          {stats.count > 0 && (
            <span>
              {stats.count} รายการ · {baht(stats.total)}
            </span>
          )}
        </div>
      </div>
      {hasChildren && isOpen && (
        <div>
          {node.children.map((child) => (
            <CategoryRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
              totals={totals}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Line items panel — ตาราง + ฟอร์มเพิ่มรายการ
// ============================================================================
function LineItemsPanel({
  category,
  items,
  projectId,
  onQuantityChange,
  onDelete,
  onAdded,
  loading,
}: {
  category: Category;
  items: LineItem[];
  projectId: string | null;
  onQuantityChange: (item: LineItem, qty: number) => void;
  onDelete: (item: LineItem) => void;
  onAdded: () => void;
  loading: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const subtotal = items.reduce((s, i) => s + Number(i.line_total || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{category.name}</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {items.length} รายการ · รวม {baht(subtotal)}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm hover:bg-emerald-500/25 transition"
        >
          <Plus size={16} /> เพิ่มรายการ
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center text-slate-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-slate-500 py-10 text-center border border-dashed border-slate-700 rounded-2xl">
          ยังไม่มีรายการในหมวดนี้
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                <th className="py-2 px-1 font-medium">รายการ</th>
                <th className="py-2 px-1 font-medium w-24">ปริมาณ</th>
                <th className="py-2 px-1 font-medium w-16">หน่วย</th>
                <th className="py-2 px-1 font-medium w-28 text-right">วัสดุ/หน่วย</th>
                <th className="py-2 px-1 font-medium w-28 text-right">แรงงาน/หน่วย</th>
                <th className="py-2 px-1 font-medium w-28 text-right">รวม</th>
                <th className="py-2 px-1 w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  onQuantityChange={onQuantityChange}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && projectId && (
        <AddItemForm
          projectId={projectId}
          categoryId={category.id}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            onAdded();
          }}
        />
      )}
    </div>
  );
}

function LineItemRow({
  item,
  onQuantityChange,
  onDelete,
}: {
  item: LineItem;
  onQuantityChange: (item: LineItem, qty: number) => void;
  onDelete: (item: LineItem) => void;
}) {
  const [qty, setQty] = useState(String(item.quantity));

  return (
    <tr className="border-b border-slate-800/60 hover:bg-slate-800/30">
      <td className="py-2 px-1">
        <div className="text-slate-200">{item.custom_name || '(สินค้าจาก catalog)'}</div>
        {item.note && <div className="text-xs text-slate-500 mt-0.5">{item.note}</div>}
      </td>
      <td className="py-2 px-1">
        <input
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onBlur={() => onQuantityChange(item, Number(qty) || 0)}
          className="w-20 bg-slate-800/70 border border-slate-700 rounded-lg px-2 py-1 text-right"
          step="0.001"
          min="0"
        />
      </td>
      <td className="py-2 px-1 text-slate-400">{item.unit}</td>
      <td className="py-2 px-1 text-right text-slate-300">{baht(item.material_unit_price)}</td>
      <td className="py-2 px-1 text-right text-slate-300">{baht(item.labor_unit_price)}</td>
      <td className="py-2 px-1 text-right font-medium text-slate-100">{baht(item.line_total)}</td>
      <td className="py-2 px-1">
        <button
          onClick={() => onDelete(item)}
          className="text-slate-500 hover:text-rose-400 transition"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
}

// ============================================================================
// Add item form — จาก catalog (ค้นหา + autofill ราคา) หรือกรอกเอง
// ============================================================================
function AddItemForm({
  projectId,
  categoryId,
  onClose,
  onAdded,
}: {
  projectId: string;
  categoryId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [customMaterial, setCustomMaterial] = useState('');
  const [customLabor, setCustomLabor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode !== 'catalog' || !search.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api(`catalog?q=${encodeURIComponent(search)}&active=true`);
        setResults(data.items || []);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, mode]);

  const canSubmit =
    Number(quantity) > 0 &&
    (mode === 'catalog' ? !!selected : customName.trim().length > 0 && customUnit.trim().length > 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      const body: any = {
        boq_project_id: projectId,
        category_id: categoryId,
        quantity: Number(quantity),
      };
      if (mode === 'catalog' && selected) {
        body.product_id = selected.id;
        body.unit = selected.unit;
        body.custom_name = selected.name;
      } else {
        body.custom_name = customName;
        body.unit = customUnit;
        body.material_unit_price = Number(customMaterial) || 0;
        body.labor_unit_price = Number(customLabor) || 0;
      }
      await api('line-items', { method: 'POST', body: JSON.stringify(body) });
      onAdded();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">เพิ่มรายการ BOQ</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('catalog')}
            className={`flex-1 py-2 rounded-xl text-sm border transition ${
              mode === 'catalog'
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
          >
            จาก Catalog
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 py-2 rounded-xl text-sm border transition ${
              mode === 'custom'
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
          >
            รายการเฉพาะกิจ
          </button>
        </div>

        {mode === 'catalog' ? (
          <div className="space-y-3">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                autoFocus
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelected(null);
                }}
                placeholder="ค้นหาชื่อสินค้า เช่น กระเบื้อง, สายไฟ..."
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm"
              />
            </div>

            {searching && <div className="text-xs text-slate-500">กำลังค้นหา...</div>}

            {!selected && results.length > 0 && (
              <div className="max-h-52 overflow-y-auto space-y-1 border border-slate-800 rounded-xl p-1">
                {results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelected(p);
                      setResults([]);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-sm"
                  >
                    <div className="text-slate-200">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      {[p.brand, p.spec].filter(Boolean).join(' · ')} — {baht(p.material_unit_price + p.labor_unit_price)}/{p.unit}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm flex items-center justify-between">
                <div>
                  <div className="text-slate-100">{selected.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    วัสดุ {baht(selected.material_unit_price)} + แรงงาน{' '}
                    {baht(selected.labor_unit_price)} / {selected.unit}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400">ปริมาณ{selected ? ` (${selected.unit})` : ''}</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full mt-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                step="0.001"
                min="0"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400">ชื่อรายการ</label>
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full mt-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400">หน่วย</label>
                <input
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  placeholder="ตร.ม."
                  className="w-full mt-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">วัสดุ/หน่วย</label>
                <input
                  type="number"
                  value={customMaterial}
                  onChange={(e) => setCustomMaterial(e.target.value)}
                  className="w-full mt-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">แรงงาน/หน่วย</label>
                <input
                  type="number"
                  value={customLabor}
                  onChange={(e) => setCustomLabor(e.target.value)}
                  className="w-full mt-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400">ปริมาณ</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full mt-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                step="0.001"
                min="0"
              />
            </div>
          </div>
        )}

        {err && <div className="mt-3 text-xs text-rose-300">{err}</div>}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex-1 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-sm hover:bg-emerald-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'กำลังเพิ่ม...' : 'เพิ่มรายการ'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// New project modal
// ============================================================================
function NewProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (p: {
    project_name: string;
    customer_name: string;
    address: string;
    usable_area_sqm: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    project_name: '',
    customer_name: '',
    address: '',
    usable_area_sqm: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!form.project_name.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      await onCreate(form);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">โปรเจกต์ BOQ ใหม่</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">ชื่อโปรเจกต์</label>
            <input
              autoFocus
              value={form.project_name}
              onChange={(e) => setForm({ ...form, project_name: e.target.value })}
              className="w-full mt-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">ชื่อลูกค้า</label>
            <input
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              className="w-full mt-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">ที่อยู่/ทำเล</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full mt-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">พื้นที่ใช้สอย (ตร.ม.)</label>
            <input
              type="number"
              value={form.usable_area_sqm}
              onChange={(e) => setForm({ ...form, usable_area_sqm: e.target.value })}
              className="w-full mt-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        {err && <div className="mt-3 text-xs text-rose-300">{err}</div>}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={submit}
            disabled={!form.project_name.trim() || submitting}
            className="flex-1 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-sm hover:bg-cyan-500/30 transition disabled:opacity-40"
          >
            {submitting ? 'กำลังสร้าง...' : 'สร้างโปรเจกต์'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// New category modal
// ============================================================================
function NewCategoryModal({
  categories,
  onClose,
  onCreate,
}: {
  categories: Category[];
  onClose: () => void;
  onCreate: (name: string, parentId: string | null, overhead: number) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [overhead, setOverhead] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      await onCreate(name.trim(), parentId || null, Number(overhead) || 0);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">เพิ่มหมวดหมู่ BOQ</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">ชื่อหมวด</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น งานโครงสร้าง, งานสถาปัตย์"
              className="w-full mt-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">หมวดแม่ (ไม่เลือก = หมวดหลัก)</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full mt-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm"
            >
              <option value="">— หมวดหลัก —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {'　'.repeat(c.level)}
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {!parentId && (
            <div>
              <label className="text-xs text-slate-400">
                ค่าดำเนินการ + กำไร (%) — ใช้กับหมวดหลักเท่านั้น
              </label>
              <input
                type="number"
                value={overhead}
                onChange={(e) => setOverhead(e.target.value)}
                className="w-full mt-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        {err && <div className="mt-3 text-xs text-rose-300">{err}</div>}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || submitting}
            className="flex-1 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-sm hover:bg-cyan-500/30 transition disabled:opacity-40"
          >
            {submitting ? 'กำลังเพิ่ม...' : 'เพิ่มหมวด'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Summary bar — sticky footer สรุปยอดรวม
// ============================================================================
function SummaryBar({ summary }: { summary: Summary }) {
  const [expandedView, setExpandedView] = useState(false);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl p-5 sticky bottom-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-6">


          <Stat label="รวมทั้งหมด" value={baht(summary.grand_total)} accent="cyan" />
          {summary.price_per_sqm != null && (
            <Stat label="ราคา/ตร.ม." value={baht(summary.price_per_sqm)} accent="amber" />
          )}
        </div>
        <button
          onClick={() => setExpandedView((v) => !v)}
          className="text-sm text-slate-400 hover:text-slate-200 transition"
        >
          {expandedView ? 'ซ่อนรายละเอียด' : 'ดูแยกตามหมวด'}
        </button>
      </div>

      {expandedView && (
        <div className="mt-4 pt-4 border-t border-slate-800 overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-1.5 font-medium">หมวด</th>
                <th className="py-1.5 font-medium text-right">ยอดก่อน overhead</th>
                <th className="py-1.5 font-medium text-right">Overhead</th>
                <th className="py-1.5 font-medium text-right">รวม</th>
              </tr>
            </thead>
            <tbody>
              {summary.category_summary.map((c) => (
                <tr key={c.category_id} className="border-t border-slate-800/60">
                  <td className="py-1.5 text-slate-300">{c.category_name}</td>
                  <td className="py-1.5 text-right text-slate-400">{baht(c.subtotal)}</td>
                  <td className="py-1.5 text-right text-slate-400">
                    {baht(c.overhead_amount)} ({c.overhead_percent}%)
                  </td>
                  <td className="py-1.5 text-right text-slate-100 font-medium">
                    {baht(c.total_with_overhead)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'cyan' | 'amber';
}) {
  const color =
    accent === 'cyan' ? 'text-cyan-300' : accent === 'amber' ? 'text-amber-300' : 'text-slate-100';
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
