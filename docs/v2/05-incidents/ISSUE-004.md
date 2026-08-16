## ISSUE-004 — Railway ไม่ auto-deploy หลัง git push
**Date**: 2026-06-30  
**Severity**: Medium  
**Status**: Workaround documented

**Symptoms**: git push สำเร็จ แต่ Railway ยังรัน code เก่า → smoke test ยังได้ NOT_FOUND

**Root cause**: Railway GitHub integration ไม่ trigger auto-deploy ในบางกรณี

**Workaround**: เปิด Railway dashboard → กด Redeploy ด้วยตนเอง

**Detection**: ตรวจ Railway build logs timestamp vs git push timestamp

---
