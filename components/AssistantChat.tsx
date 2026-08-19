// components/AssistantChat.tsx
//
// Floating chat widget for AP-Home Platform OS Dashboard.
// Talks to app/api/assistant/route.ts (Claude tool-calling + Hub/Supabase).
//
// Mount once, globally — e.g. in app/layout.tsx:
//   import AssistantChat from "@/components/AssistantChat";
//   ...
//   <body>{children}<AssistantChat /></body>
//
// Write actions (run_fb_queue_next, run_blog_now) always pause for an explicit
// Confirm click before anything actually executes on the Hub.

"use client";

import { useEffect, useRef, useState } from "react";

type DisplayMessage = {
  role: "user" | "assistant" | "system";
  text: string;
};

type PendingConfirm = {
  toolUseId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
};

const TOOL_LABELS: Record<string, (input: Record<string, unknown>) => string> = {
  run_fb_queue_next: () => "โพสต์ FB ตัวถัดไปในคิว ตอนนี้เลย",
  run_blog_now: (input) =>
    `รัน Blog Runner ด้วย keyword: "${input.keyword ?? ""}" (category ${input.category ?? 13}, slot ${
      input.slot ?? "morning"
    })`,
};

export default function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [apiMessages, setApiMessages] = useState<any[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [displayMessages, pendingConfirm, loading]);

  async function callAssistant(payload: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.error) {
        setDisplayMessages((prev) => [...prev, { role: "system", text: `⚠️ ${data.error}` }]);
        setPendingConfirm(null);
        return;
      }

      setApiMessages(data.messages || []);

      if (data.needsConfirmation) {
        setPendingConfirm({
          toolUseId: data.toolUseId,
          toolName: data.toolName,
          toolInput: data.toolInput || {},
        });
        return;
      }

      setPendingConfirm(null);
      if (data.text) {
        setDisplayMessages((prev) => [...prev, { role: "assistant", text: data.text }]);
      }
    } catch (e: any) {
      setDisplayMessages((prev) => [...prev, { role: "system", text: `⚠️ ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setDisplayMessages((prev) => [...prev, { role: "user", text }]);

    const nextApiMessages = [...apiMessages, { role: "user", content: text }];
    setApiMessages(nextApiMessages);
    await callAssistant({ messages: nextApiMessages });
  }

  async function handleConfirm() {
    if (!pendingConfirm) return;
    setDisplayMessages((prev) => [...prev, { role: "system", text: `✅ ยืนยันแล้ว — กำลังสั่งงาน...` }]);
    await callAssistant({ messages: apiMessages, confirmedToolUseId: pendingConfirm.toolUseId });
  }

  async function handleCancel() {
    if (!pendingConfirm) return;
    setDisplayMessages((prev) => [...prev, { role: "system", text: `❌ ยกเลิกคำสั่งนี้แล้ว` }]);
    await callAssistant({ messages: apiMessages, cancelledToolUseId: pendingConfirm.toolUseId });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold w-14 h-14 shadow-2xl flex items-center justify-center text-2xl"
        aria-label="เปิด AP-Home Assistant"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[92vw] h-[560px] max-h-[80vh] rounded-3xl border border-slate-800 bg-slate-900/95 backdrop-blur shadow-2xl flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <div>
          <div className="text-sm font-semibold text-slate-100">AP-Home Assistant</div>
          <div className="text-xs text-slate-500">ถาม-ตอบ + สั่งงาน Hub ได้</div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-slate-400 hover:text-slate-200 text-lg leading-none"
          aria-label="ปิด"
        >
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {displayMessages.length === 0 && (
          <div className="text-xs text-slate-500 text-center mt-8">
            ลองถาม เช่น &quot;สถานะ FB queue ตอนนี้เป็นไงบ้าง&quot; หรือ &quot;มี lead ใหม่กี่คน&quot;
          </div>
        )}
        {displayMessages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`rounded-2xl px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-cyan-500 text-slate-950"
                  : m.role === "system"
                  ? "bg-slate-800/60 text-slate-400 text-xs italic"
                  : "bg-slate-800 text-slate-100"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {pendingConfirm && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <div className="text-xs text-amber-300 uppercase tracking-wide">ต้องยืนยันก่อน</div>
            <div className="text-sm text-slate-100">
              {(TOOL_LABELS[pendingConfirm.toolName]?.(pendingConfirm.toolInput)) ??
                `เรียก ${pendingConfirm.toolName}`}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold py-2 disabled:opacity-50"
              >
                ยืนยัน สั่งเลย
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm py-2 disabled:opacity-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {loading && !pendingConfirm && (
          <div className="text-xs text-slate-500 italic">กำลังคิด...</div>
        )}
      </div>

      <div className="p-3 border-t border-slate-800 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={loading || !!pendingConfirm}
          placeholder="พิมพ์คำถามหรือสั่งงาน..."
          className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={loading || !!pendingConfirm || !input.trim()}
          className="rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-semibold px-4 text-sm"
        >
          ส่ง
        </button>
      </div>
    </div>
  );
}
