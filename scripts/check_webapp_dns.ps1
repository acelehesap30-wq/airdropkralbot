param(
  [string]$EnvPath = ".env",
  [int]$TimeoutSec = 12
)

$ErrorActionPreference = "Stop"

function Get-EnvValue {
  param([string]$Path, [string]$Key)
  if (-not (Test-Path $Path)) { return "" }
  $pattern = "^\s*$([Regex]::Escape($Key))\s*=\s*(.*)\s*$"
  foreach ($line in Get-Content $Path) {
    if ($line -match $pattern) { return $matches[1] }
  }
  return ""
}

function Invoke-CurlProbe {
  param([string]$Url, [int]$Timeout = 12)
  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if (-not $curl) {
    return $null
  }
  try {
    $output = & curl.exe -I -L --max-time $Timeout --silent --show-error $Url 2>&1
    if ($LASTEXITCODE -ne 0) {
      return @{
        ok = $false
        message = ($output | Out-String).Trim()
      }
    }
    $lines = @($output -split "`r?`n" | Where-Object { $_ -match '^HTTP/' })
    $last = $lines | Select-Object -Last 1
    $status = 0
    if ($last -match '^HTTP/\S+\s+(\d{3})') {
      $status = [int]$matches[1]
    }
    return @{
      ok = $true
      status = $status
      message = ($output | Out-String).Trim()
    }
  } catch {
    return @{
      ok = $false
      message = $_.Exception.Message
    }
  }
}

function Invoke-UrlProbe {
  param([string]$Url, [int]$Timeout = 12)
  try {
    $res = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec $Timeout
    return @{
      ok = $true
      status = [int]$res.StatusCode
      transport = "powershell"
      message = ""
    }
  } catch {
    $pwMessage = $_.Exception.Message
    $curlResult = Invoke-CurlProbe -Url $Url -Timeout $Timeout
    if ($curlResult -and $curlResult.ok -and $curlResult.status -ge 200) {
      return @{
        ok = $true
        status = [int]$curlResult.status
        transport = "curl"
        message = $pwMessage
      }
    }
    return @{
      ok = $false
      status = 0
      transport = if ($curlResult) { "curl" } else { "powershell" }
      message = if ($curlResult -and $curlResult.message) { $curlResult.message } else { $pwMessage }
    }
  }
}

$webappUrl = Get-EnvValue -Path $EnvPath -Key "WEBAPP_PUBLIC_URL"
if (-not $webappUrl) {
  Write-Error "WEBAPP_PUBLIC_URL missing in $EnvPath"
  exit 1
}

try {
  $uri = [Uri]$webappUrl
} catch {
  Write-Error "WEBAPP_PUBLIC_URL is not a valid URL: $webappUrl"
  exit 1
}

$webHost = $uri.Host
$parts = $webHost.Split(".")
$root = if ($parts.Length -ge 2) { "$($parts[$parts.Length - 2]).$($parts[$parts.Length - 1])" } else { $webHost }

Write-Host "WEBAPP_PUBLIC_URL: $webappUrl" -ForegroundColor Cyan
Write-Host "Host: $webHost" -ForegroundColor Cyan
Write-Host "Root domain: $root" -ForegroundColor Cyan
Write-Host ""

try {
  $ns = Resolve-DnsName -Type NS $root -ErrorAction Stop | Select-Object -ExpandProperty NameHost
  Write-Host ("NS: " + ($ns -join ", ")) -ForegroundColor Green
} catch {
  Write-Host "NS lookup failed." -ForegroundColor Yellow
}

Write-Host ""
try {
  $records = Resolve-DnsName $webHost -ErrorAction Stop
  $records | Format-Table -AutoSize
} catch {
  Write-Host "Host resolve failed: $webHost" -ForegroundColor Yellow
}

Write-Host ""
$base = "$($uri.Scheme)://$($uri.Host)"
$paths = @("/health", "/webapp")
$httpsFailures = 0
foreach ($p in $paths) {
  $url = "$base$p"
  $probe = Invoke-UrlProbe -Url $url -Timeout $TimeoutSec
  if ($probe.ok) {
    $suffix = if ($probe.transport -eq "curl") { " (curl fallback)" } else { "" }
    Write-Host ("OK   " + $url + " -> " + $probe.status + $suffix) -ForegroundColor Green
    if ($probe.message) {
      Write-Host ("      PowerShell probe note: " + $probe.message) -ForegroundColor DarkGray
    }
  } else {
    Write-Host ("FAIL " + $url + " -> " + $probe.message) -ForegroundColor Yellow
    if ($url -like "https://*") {
      $httpsFailures += 1
    }
  }
}

Write-Host ""
try {
  $httpHealth = Invoke-WebRequest -UseBasicParsing "http://$webHost/health" -TimeoutSec 12
  $code = [int]$httpHealth.StatusCode
  Write-Host ("HTTP fallback check: http://$webHost/health -> " + $code) -ForegroundColor Cyan
} catch {
  $raw = ""
  if ($_.Exception.Response) {
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        $raw = $reader.ReadToEnd()
      }
    } catch {}
  }
  $msg = $_.Exception.Message
  Write-Host ("HTTP fallback failed: " + $msg) -ForegroundColor Yellow
  if ($raw) {
    Write-Host ("HTTP body: " + $raw.Trim()) -ForegroundColor Yellow
  }
  if ($raw -match "error code:\s*1001") {
    Write-Host ""
    Write-Host "Detected Cloudflare 1001. This usually means custom domain is not active on Render yet." -ForegroundColor Red
    Write-Host "Fix:" -ForegroundColor Cyan
    Write-Host "  1) Render -> airdropkral-admin -> Settings -> Custom Domains"
    Write-Host "  2) Add host: $webHost"
    Write-Host "  3) Wait SSL certificate to become Active"
    Write-Host "  4) Keep Namecheap CNAME: $webHost -> airdropkral-admin.onrender.com"
  }
}

if ($httpsFailures -gt 0) {
  Write-Host ""
  Write-Host "If HTTPS still fails, do local tunnel fallback:" -ForegroundColor Cyan
  Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/use_ngrok_local.ps1 -StartAdmin -StartBot"
}
