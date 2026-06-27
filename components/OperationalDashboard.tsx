"use client";

import { useCallback, useEffect, useState } from "react";

type DlqItem = {
  id: string;
  service: string;
  operation: string;
  route: string;
  target_url: string;
  method: string;
  status: string;
  attempts: number;
  correlation_id: string;
  error_message: string;
  created_at: string;
  updated_at: string;
};

type OpsSummary = {
  ok: boolean;
  generatedAt?: string;
  validation?: {
    ok: boolean;
    missing: string[];
    entries: Array<{ name: string; required: boolean; configured: boolean; description: string }>;
  };
  checks?: {
    supabase?: { ok: boolean; status: string };
    fbBackend?: { ok: boolean; status: string };
  };
  state?: {
    system?: { hubStatus?: string; lastError?: string; updatedAt?: string; stateKey?: string };
    blog?: { status?: string; queue?: number; published?: number; failed?: number; updatedAt?: string };
    fb?: { status?: string; queue?: number; drafts?: number; published?: number; failed?: number; updatedAt?: string };
  };
  dlq?: { total: number; items: DlqItem[] };
};

const OPS_URL = "/api/ops/summary";

function statusColor(ok: boolean) {
  return ok ? "#10b981" : "#f43f5e";
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  const color = statusColor(ok);
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 999,
      border: `1px solid ${color}33`,
      background: `${color}12`,
      color,
      fontSize: 12,
      fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}

export default function OperationalDashboard() {
  const [data, setData] = useState<OpsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [retryingId, setRetryingId] = useState("");

  const load = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch(OPS_URL, { cache: "no-store", signal: AbortSignal.timeout(6000) });
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `Ops summary returned ${res.status}`);
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ops summary");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const retryDlq = async (id: string) => {
    setRetryingId(id);
    try {
      const res = await fetch(`/api/ops/dlq/${encodeURIComponent(id)}/retry`, {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `Retry returned ${res.status}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetryingId("");
    }
  };

  const validation = data?.validation;
  const dlq = data?.dlq?.items ?? [];
  const checks = data?.checks ?? {};
  const state = data?.state ?? {};
  const missing = validation?.missing ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#22d3ee", fontWeight: 700 }}>
            OPERATIONS
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", marginTop: 4 }}>
            Validation, health, and dead letters
          </div>
        </div>
        <button
          onClick={load}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.08)",
            background: "rgba(255,255,255,.03)",
            color: "#e2e8f0",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ↻ {refreshing ? "Refreshing" : "Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 12, padding: "12px 14px", color: "#fca5a5", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".1em" }}>Hub Config</div>
          <div style={{ marginTop: 8 }}><Badge ok={!!validation?.ok} label={validation?.ok ? "Ready" : "Missing"} /></div>
          <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 8 }}>{missing.length ? missing.join(", ") : "No missing required env vars"}</div>
        </div>
        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".1em" }}>Supabase</div>
          <div style={{ marginTop: 8 }}><Badge ok={!!checks.supabase?.ok} label={checks.supabase?.status || "unknown"} /></div>
          <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 8 }}>{state.system?.stateKey || "hub_state"}</div>
        </div>
        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".1em" }}>FB Backend</div>
          <div style={{ marginTop: 8 }}><Badge ok={!!checks.fbBackend?.ok} label={checks.fbBackend?.status || "unknown"} /></div>
          <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 8 }}>Publish service</div>
        </div>
        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".1em" }}>Dead Letters</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#f1f5f9", marginTop: 8 }}>{data?.dlq?.total ?? 0}</div>
          <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 4 }}>Open items waiting for retry</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 16 }}>
        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "#22d3ee" }}>Environment</div>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {(validation?.entries ?? []).map((item) => (
              <div key={item.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div>
                  <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{item.description}</div>
                </div>
                <Badge ok={item.configured} label={item.configured ? "Set" : "Missing"} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "#22d3ee" }}>Service State</div>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
              <div style={{ color: "#64748b", fontSize: 11 }}>Hub</div>
              <div style={{ color: "#f1f5f9", fontWeight: 700, marginTop: 4 }}>{state.system?.hubStatus || "idle"}</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{state.system?.lastError || "No recent error"}</div>
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
              <div style={{ color: "#64748b", fontSize: 11 }}>Blog</div>
              <div style={{ color: "#f1f5f9", fontWeight: 700, marginTop: 4 }}>
                {state.blog?.status || "idle"} · q {state.blog?.queue ?? 0} · p {state.blog?.published ?? 0} · f {state.blog?.failed ?? 0}
              </div>
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
              <div style={{ color: "#64748b", fontSize: 11 }}>FB</div>
              <div style={{ color: "#f1f5f9", fontWeight: 700, marginTop: 4 }}>
                {state.fb?.status || "idle"} · q {state.fb?.queue ?? 0} · p {state.fb?.published ?? 0} · f {state.fb?.failed ?? 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "rgba(15,20,40,.85)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "#22d3ee" }}>Dead Letter Queue</div>
        {loading ? (
          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 12 }}>Loading operational data...</div>
        ) : dlq.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 12 }}>No dead letters right now.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {dlq.map((item) => (
              <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr auto", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div>
                  <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13 }}>{item.operation}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{item.error_message || "No error message"}</div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>{item.route || item.target_url}</div>
                </div>
                <div style={{ color: "#cbd5e1", fontSize: 12 }}>
                  <div>status: {item.status}</div>
                  <div>attempts: {item.attempts}</div>
                  <div>correlation: {item.correlation_id || "n/a"}</div>
                </div>
                <button
                  onClick={() => retryDlq(item.id)}
                  disabled={retryingId === item.id}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(34,211,238,.28)",
                    background: "rgba(34,211,238,.12)",
                    color: "#22d3ee",
                    fontWeight: 700,
                    cursor: retryingId === item.id ? "not-allowed" : "pointer",
                  }}
                >
                  {retryingId === item.id ? "Retrying..." : "↻ Retry"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
