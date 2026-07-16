# QC Standards — Reference Photo Upload (Round 2, session 19)
# ขยายชุดรูปอ้างอิงจาก 4 หมวด (1 รูป/หมวด) เป็น 7 หมวด (หลายรูป/หมวด)
# แหล่งรูป: D:\Finnhouses brand\ (โฟลเดอร์งานจริงของ Finnhouses)
# หลังรันสคริปต์นี้เสร็จ ให้แจ้ง Claude เพื่อ insert แถวใหม่ลงตาราง qc_standards
# (Claude มี Supabase MCP เชื่อมต่อโปรเจกต์ ap-home-platform อยู่แล้ว ไม่ต้องรัน SQL เอง)

$JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tdnBhZ3ZxeWZta2toenV1emRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQxNzY1MiwiZXhwIjoyMDkxOTkzNjUyfQ.kQiQ2t3NP1Cy9cDQdWzA1O4swsH7ANLl0hZ6LJikWyA"
$BASE = "https://omvpagvqyfmkkhzuuzda.supabase.co/storage/v1/object/qc-standards"

$uploads = @(
    # concrete — เพิ่มจาก 1 เป็น 3 รูป (ref1 มีอยู่แล้ว ไม่แตะ)
    @{ file = "D:\Finnhouses brand\งานคอนกรีต\335064_0.jpg";                 key = "concrete/ref2.jpg";   label = "concrete ref2 (pre-pour footing + cover block)" },
    @{ file = "D:\Finnhouses brand\งานคอนกรีต\FB_IMG_1549519166887.jpg";     key = "concrete/ref3.jpg";   label = "concrete ref3 (slab/beam rebar + cover block)" },

    # plaster — เพิ่ม 1 รูป (ref1 มีอยู่แล้ว)
    @{ file = "D:\Finnhouses brand\งานก่อฉาบ\699479721_1495768815680045_2796293880714088289_n.jpg"; key = "plaster/ref2.jpg"; label = "plaster ref2 (masonry coursing before plaster)" },

    # level — เพิ่ม 2 รูป (ref1 มีอยู่แล้ว)
    @{ file = "D:\Finnhouses brand\งานก่อฉาบ\696133451_1495768762346717_8960063077665162866_n.jpg"; key = "level/ref2.jpg"; label = "level ref2 (plumb check with level tool)" },
    @{ file = "D:\Finnhouses brand\งานเส้น Line Level\LINE_ALBUM_งานMark Line_Level_260419_2.jpg"; key = "level/ref3.jpg"; label = "level ref3 (floor level marking)" },

    # paint — เพิ่ม 1 รูป (ref1 มีอยู่แล้ว) — หมวดนี้ยังอ่อน ไม่มีรูปผนังทาสีเสร็จจริง
    @{ file = "D:\Finnhouses brand\งานสี\LINE_ALBUM_งานสี_260419_1.jpg"; key = "paint/ref2.jpg"; label = "paint ref2 (exterior skim coat stage)" },

    # electrical — หมวดใหม่ (ยังไม่เคยมีรูปอ้างอิง)
    @{ file = "D:\Finnhouses brand\งานระบบไฟฟ้า\335089_0.jpg"; key = "electrical/ref1.jpg"; label = "electrical ref1 (conduit routing + junction boxes above ceiling)" },

    # plumbing — หมวดใหม่ (ยังไม่เคยมีรูปอ้างอิง)
    @{ file = "D:\Finnhouses brand\งานระบบน้ำ\LINE_ALBUM_งานระบบน้ำไฟ_260419_2.jpg"; key = "plumbing/ref1.jpg"; label = "plumbing ref1 (pipe hangers, correct clamping)" },

    # finishing — หมวดใหม่ (ยังไม่เคยมีรูปอ้างอิง)
    @{ file = "D:\Finnhouses brand\งานFinishing\335095_0.jpg"; key = "finishing/ref1.jpg"; label = "finishing ref1 (floor waterproofing + window install)" },
    @{ file = "D:\Finnhouses brand\งานฝ้า\LINE_ALBUM_งานฝ้า_260419_1.jpg"; key = "finishing/ref2.jpg"; label = "finishing ref2 (soffit/eave ceiling panel)" }
)

foreach ($u in $uploads) {
    $bytes = [System.IO.File]::ReadAllBytes($u.file)
    $url   = "$BASE/$($u.key)"
    try {
        $resp = Invoke-RestMethod -Uri $url -Method Put `
            -Headers @{ Authorization = "Bearer $JWT"; "Content-Type" = "image/jpeg"; apikey = $JWT } `
            -Body $bytes
        Write-Host "$($u.label): OK" -ForegroundColor Green
    } catch {
        Write-Host "$($u.label): ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nDone. รูปทั้งหมด upload ไปที่ Supabase Storage bucket 'qc-standards' แล้ว" -ForegroundColor Cyan
Write-Host "ขั้นตอนต่อไป: กลับไปแจ้ง Claude ให้ insert แถวใหม่ลงตาราง qc_standards" -ForegroundColor Cyan
