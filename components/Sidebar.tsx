"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard",     icon: "⚡", label: "OS Dashboard",  desc: "Live overview" },
  { href: "/crm",           icon: "🎯", label: "CRM",           desc: "Lead pipeline" },
  { href: "/ai-content",    icon: "✨", label: "AI Content",    desc: "FB content engine" },
  { href: "/marketing",     icon: "📰", label: "Blog Runner",   desc: "n8n → finnhouses.com" },
  { href: "/land-analyzer", icon: "🗺️", label: "Land Analyzer", desc: "วิเคราะห์ที่ดิน" },
  { href: "/budget",        icon: "💰", label: "Budget Tool",   desc: "คำนวณงบสร้างบ้าน" },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside style={{
      width: "var(--sidebar-w)",
      minHeight: "100vh",
      background: "rgba(8,12,28,0.95)",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      flexDirection: "column",
      padding: "20px 12px",
      position: "fixed",
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 100,
      backdropFilter: "blur(12px)",
    }}>
      {/* Logo */}
      <div style={{ padding: "8px 12px 24px" }}>
        <div style={{ fontSize: 11, letterSpacing: ".25em", textTransform: "uppercase", color: "#22d3ee", fontWeight: 700 }}>
          Finnhouses
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", marginTop: 2, fontFamily: "'DM Serif Display', serif" }}>
          Platform
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {NAV.map(({ href, icon, label, desc }) => {
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                background: active ? "rgba(34,211,238,0.1)" : "transparent",
                border: active ? "1px solid rgba(34,211,238,0.2)" : "1px solid transparent",
                transition: "all .2s",
                cursor: "pointer",
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: active ? "#22d3ee" : "#cbd5e1",
                  }}>{label}</div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>{desc}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 10, color: "#334155", textAlign: "center" }}>
          Finnhouses<br/>v1.0.0
        </div>
      </div>
    </aside>
  );
}
