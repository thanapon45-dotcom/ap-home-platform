@echo off
setlocal

set JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tdnBhZ3ZxeWZta2toenV1emRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQxNzY1MiwiZXhwIjoyMDkxOTkzNjUyfQ.kQiQ2t3NP1Cy9cDQdWzA1O4swsH7ANLl0hZ6LJikWyA
set BASE=https://omvpagvqyfmkkhzuuzda.supabase.co/storage/v1/object/qc-standards

echo Uploading reference photos to Supabase qc-standards...
echo.

curl -s -o NUL -w "plaster:  %%{http_code}\n" -X PUT "%BASE%/plaster/ref1.jpg" ^
  -H "Authorization: Bearer %JWT%" -H "Content-Type: image/jpeg" ^
  --data-binary "@D:\Finnhouses brand\งานก่อฉาบ\LINE_ALBUM_งานก่อฉาบ_260419_1.jpg"

curl -s -o NUL -w "concrete: %%{http_code}\n" -X PUT "%BASE%/concrete/ref1.jpg" ^
  -H "Authorization: Bearer %JWT%" -H "Content-Type: image/jpeg" ^
  --data-binary "@D:\Finnhouses brand\งานคอนกรีต\335062_0.jpg"

curl -s -o NUL -w "paint:    %%{http_code}\n" -X PUT "%BASE%/paint/ref1.jpg" ^
  -H "Authorization: Bearer %JWT%" -H "Content-Type: image/jpeg" ^
  --data-binary "@D:\Finnhouses brand\งานสี\LINE_ALBUM_งานสี_260419_1.jpg"

curl -s -o NUL -w "level:    %%{http_code}\n" -X PUT "%BASE%/level/ref1.jpg" ^
  -H "Authorization: Bearer %JWT%" -H "Content-Type: image/jpeg" ^
  --data-binary "@D:\Finnhouses brand\งานเส้น Line Level\LINE_ALBUM_งานMark Line_Level_260419_1.jpg"

echo.
echo Done! 200 = success, 400/401 = error
pause
