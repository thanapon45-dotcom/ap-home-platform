$JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tdnBhZ3ZxeWZta2toenV1emRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQxNzY1MiwiZXhwIjoyMDkxOTkzNjUyfQ.kQiQ2t3NP1Cy9cDQdWzA1O4swsH7ANLl0hZ6LJikWyA"
$BASE = "https://omvpagvqyfmkkhzuuzda.supabase.co/storage/v1/object/qc-standards"

# แก้บั๊ก: paint/ref2.jpg ที่อัปโหลดรอบก่อนดันเป็นไฟล์เดียวกับ ref1 (เผลอชี้ path ซ้ำ)
# รอบนี้เปลี่ยนไปใช้รูปผนังภายในช่วงฉาบสีรองพื้นแทน เพื่อให้เป็นรูปคนละมุมกับ ref1
$file = "D:\Finnhouses brand\งานสี\LINE_ALBUM_งานสี_260419_2.jpg"
$url  = "$BASE/paint/ref2.jpg"

try {
    $bytes = [System.IO.File]::ReadAllBytes($file)
    Invoke-RestMethod -Uri $url -Method Put `
        -Headers @{ Authorization = "Bearer $JWT"; "Content-Type" = "image/jpeg"; apikey = $JWT } `
        -Body $bytes | Out-Null
    Write-Host "paint/ref2.jpg (overwrite): OK" -ForegroundColor Green
} catch {
    Write-Host "paint/ref2.jpg: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}
