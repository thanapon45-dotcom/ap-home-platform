## ISSUE-007 — Market Intel `content_frames` ไม่เคยเขียนสำเร็จเลยตั้งแต่ live
**Date**: 2026-07-02 (session 19e)  
**Severity**: High  
**Status**: Resolved ✅

**Symptoms**: ตาราง `content_frames` ไม่มีแถวเลยทั้งที่ Market Intelligence Collector "live" มาตั้งแต่ 29 พ.ค. — ไม่มี error โผล่ที่ไหนเลย

**Root cause**: Column mismatch ระหว่าง insert payload กับ schema จริงของ `content_frames` รวมกับ `try/catch` ที่กลืน error เงียบๆแทนที่จะ throw/log

**Fix**: แก้ column mapping ให้ตรง schema, เพิ่ม success/fail status เข้า Telegram notification กันเกิดซ้ำแบบไม่รู้ตัว, backfill เขียน FB post ใหม่ 26 โพสต์แทนของเดิมที่หายไป

**Lesson**: ห้ามให้ `try/catch` รอบ DB write กลืน error เงียบๆเด็ดขาด — ต้อง surface pass/fail ไปที่ monitored channel (Telegram) เสมอ

---
