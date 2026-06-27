$JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tdnBhZ3ZxeWZta2toenV1emRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQxNzY1MiwiZXhwIjoyMDkxOTkzNjUyfQ.kQiQ2t3NP1Cy9cDQdWzA1O4swsH7ANLl0hZ6LJikWyA"
$BASE = "https://omvpagvqyfmkkhzuuzda.supabase.co/storage/v1/object/qc-standards"

$uploads = @(
    @{ file = "D:\Finnhouses brand\งานก่อฉาบ\LINE_ALBUM_งานก่อฉาบ_260419_1.jpg"; key = "plaster/ref1.jpg";  label = "plaster" },
    @{ file = "D:\Finnhouses brand\งานคอนกรีต\335062_0.jpg";                      key = "concrete/ref1.jpg"; label = "concrete" },
    @{ file = "D:\Finnhouses brand\งานสี\LINE_ALBUM_งานสี_260419_1.jpg";           key = "paint/ref1.jpg";   label = "paint" },
    @{ file = "D:\Finnhouses brand\งานเส้น Line Level\LINE_ALBUM_งานMark Line_Level_260419_1.jpg"; key = "level/ref1.jpg"; label = "level" }
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

Write-Host "`nDone." -ForegroundColor Cyan
