# tests/auth-smoke.ps1
# Run ONLY against a deployment where AUTH_ENFORCE=true.
# Deliberately never calls mutating routes (run-next, reset, publish, ...):
# if enforcement were off, those would actually execute.
#
# Usage:
#   .\tests\auth-smoke.ps1 -BaseUrl https://ap-home-platform.vercel.app -ConfirmEnforced
#   .\tests\auth-smoke.ps1 -BaseUrl https://... -ConfirmEnforced -WithServiceToken
param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [switch]$ConfirmEnforced,
  [switch]$WithServiceToken
)

if (-not $ConfirmEnforced) {
  Write-Host "Refusing to run: pass -ConfirmEnforced to confirm AUTH_ENFORCE=true on $BaseUrl" -ForegroundColor Yellow
  exit 2
}

$script:fail = 0

function Get-Status([string]$Url, [string]$Method = "GET", $Headers = @{}, $Body = $null, $Session = $null) {
  try {
    $p = @{ Uri = $Url; Method = $Method; Headers = $Headers; UseBasicParsing = $true; MaximumRedirection = 0 }
    if ($Body) { $p.Body = $Body; $p.ContentType = "application/json" }
    if ($Session) { $p.WebSession = $Session }
    return [int](Invoke-WebRequest @p).StatusCode
  } catch {
    if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
    return -1
  }
}

function Check([string]$Name, $Actual, $Expected) {
  if ($Actual -eq $Expected) { Write-Host "PASS  $Name ($Actual)" -ForegroundColor Green }
  else { Write-Host "FAIL  $Name (got $Actual, expected $Expected)" -ForegroundColor Red; $script:fail++ }
}

Write-Host "== 1. No credentials must be rejected ==" 
foreach ($r in @("/api/leads","/api/deals","/api/projects","/api/sites","/api/brains/context","/api/blog/state","/api/quality-gate/accuracy","/api/market-intel/insights")) {
  Check "GET $r without auth" (Get-Status "$BaseUrl$r") 401
}
foreach ($r in @("/api/assistant","/api/fetch-blog")) {
  Check "POST $r without auth" (Get-Status "$BaseUrl$r" "POST" @{} "{}") 401
}
Check "page /dashboard redirects to login" (Get-Status "$BaseUrl/dashboard") 307

Write-Host "== 2. Service token is limited to the allowlist =="
if ($WithServiceToken) {
  $tsec = Read-Host "SERVICE_TOKEN" -AsSecureString
  $tok = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($tsec))
  $h = @{ "x-service-token" = $tok }
  Check "GET /api/leads with service token (must NOT work)" (Get-Status "$BaseUrl/api/leads" "GET" $h) 401
  $tiny = '{"system":"reply with ok","prompt":"ok","maxTokens":8}'
  Check "POST /api/chat with service token" (Get-Status "$BaseUrl/api/chat" "POST" $h $tiny) 200
} else {
  Write-Host "SKIP  (add -WithServiceToken to test)"
}

Write-Host "== 3. Login flow =="
Check "wrong password" (Get-Status "$BaseUrl/api/auth/login" "POST" @{} '{"password":"definitely-wrong"}') 401
$sec = Read-Host "Dashboard password" -AsSecureString
$pw = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$json = '{"password":"' + ($pw -replace '\\','\\\\' -replace '"','\"') + '"}'
try {
  $r = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" -Method POST -Body $json -ContentType "application/json" -SessionVariable sess -UseBasicParsing
  Check "correct password" ([int]$r.StatusCode) 200
  Check "GET /api/leads with session" (Get-Status "$BaseUrl/api/leads" "GET" @{} $null $sess) 200
} catch {
  Write-Host "FAIL  login with correct password" -ForegroundColor Red
  $script:fail++
}

Write-Host ""
if ($script:fail -eq 0) { Write-Host "ALL CHECKS PASSED" -ForegroundColor Green; exit 0 }
else { Write-Host "$($script:fail) CHECK(S) FAILED" -ForegroundColor Red; exit 1 }
