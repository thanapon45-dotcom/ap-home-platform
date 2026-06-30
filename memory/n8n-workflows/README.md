# n8n Workflows — File Index

> เก็บ workflow JSON ที่ใช้งานอยู่ไว้ที่นี่ เพื่อ backup และ version control

## ไฟล์ปัจจุบัน (active)

| ไฟล์ | Version | Hub Endpoint | Status |
|---|---|---|---|
| `WF1 (8_wb_fix).json` | v8 | Hub v2 `/webhook/n8n?token=<hmac>` | Active |
| `WF2 (5_hub_v2).json` | v5 | Hub v2 `/webhook/image-done` | Active |
| `Queue Auto-run (4).json` | v4 | Hub v2 `/api/blog/queue/run-next` via Vercel | Active |
| `Wake-up workflow.json` | latest | Hub v2 `/api/health/state` | Active |

## Naming Convention

```
wf_{domain}_{feature}.json   ← ชื่อใหม่ที่ควรใช้ (ตาม AI_TEAM.md §12)
WF1 (8_wb_fix).json          ← ชื่อเก่าที่ใช้อยู่จริง
```

## Rules
- ห้าม activate 2 workflows ที่ใช้ webhook path เดียวกัน พร้อมกัน
- ก่อน import: deactivate เวอร์ชันเก่าก่อน
- Deprecated workflows → ย้ายไป `archive/` ก่อน delete จาก n8n

## archive/
เก็บ workflows เก่าที่ไม่ใช้แล้ว
