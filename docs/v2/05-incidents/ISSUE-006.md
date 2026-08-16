## ISSUE-006 — n8n Code node: `URLSearchParams is not defined`
**Date**: 2026-07-02 (session 19d)  
**Severity**: Medium  
**Status**: Resolved ✅

**Symptoms**: Code node ที่ parse LINE postback query string ด้วย `new URLSearchParams(str)` พัง `ReferenceError: URLSearchParams is not defined`

**Root cause**: n8n รัน Code node ผ่าน task-runner แบบ sandboxed VM ที่ไม่ expose Node.js global ทุกตัว (ต่างจาก Node.js ปกติ) — `URLSearchParams`/`fetch` ไม่ชัวร์ว่ามีจริง

**Fix**: Parse query string เองด้วย `.split('&')` + `.split('=')` แทน ใช้ `require('https')` ได้ปกติเพราะเป็น Node built-in module ไม่ใช่ browser/global API

**Rule**: ห้าม assume ว่า global ใดๆ มีอยู่ใน n8n Code node sandbox นอกจาก Node built-in ที่ import ผ่าน `require()` เท่านั้น

---
