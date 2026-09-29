"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const next = new URLSearchParams(window.location.search).get("next");
        const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
        window.location.assign(dest);
        return;
      }
      if (res.status === 401) setError("รหัสผ่านไม่ถูกต้อง");
      else if (res.status === 500) setError("ระบบยังไม่ได้ตั้งค่ารหัสผ่าน (ตรวจ env บน Vercel)");
      else setError("เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง");
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-6 text-slate-100">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl"
      >
        <h1 className="text-2xl font-bold">AP-Home Platform OS</h1>
        <p className="mt-2 text-sm text-slate-400">เข้าสู่ระบบเพื่อใช้งานแดชบอร์ด</p>

        <label htmlFor="password" className="mt-8 block text-sm text-slate-300">
          รหัสผ่าน
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        />

        {error && (
          <p role="alert" className="mt-3 text-sm text-rose-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="mt-6 w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50"
        >
          {busy ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
