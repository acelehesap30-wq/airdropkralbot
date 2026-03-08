param(
  [string]$TaskName = "AirdropKralBot-V5-LiveOps-15M",
  [int]$StaleMinutes = 60
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$latestJson = Join-Path $repoRoot ".runtime-artifacts\liveops\V5_LIVE_OPS_CAMPAIGN_DISPATCH_latest.json"

function Get-TaskStatus {
  param([string]$Name)
  $raw = cmd /c "schtasks /Query /TN ""$Name"" /FO LIST" 2>&1
  if ($LASTEXITCODE -ne 0) {
    return [pscustomobject]@{
      exists = $false
      status = "missing"
      next_run = ""
      logon_mode = ""
      raw = ($raw -join "`n")
    }
  }
  $status = ""
  $nextRun = ""
  $logonMode = ""
  foreach ($line in $raw) {
    $text = [string]$line
    if ($text -match "^Status:\s*(.+)$") { $status = $matches[1].Trim() }
    if ($text -match "^Next Run Time:\s*(.+)$") { $nextRun = $matches[1].Trim() }
    if ($text -match "^Logon Mode:\s*(.+)$") { $logonMode = $matches[1].Trim() }
  }
  return [pscustomobject]@{
    exists = $true
    status = $status
    next_run = $nextRun
    logon_mode = $logonMode
    raw = ($raw -join "`n")
  }
}

function Get-FileInfoSafe {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    return [pscustomobject]@{
      exists = $false
      path = $Path
      last_write = $null
      age_min = $null
      size = 0
    }
  }
  $item = Get-Item $Path
  $ageMin = [math]::Round(((Get-Date).ToUniversalTime() - $item.LastWriteTimeUtc).TotalMinutes, 2)
  return [pscustomobject]@{
    exists = $true
    path = $Path
    last_write = $item.LastWriteTimeUtc.ToString("o")
    age_min = $ageMin
    size = [int64]$item.Length
  }
}

function Read-JsonSafe {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    return $null
  }
  try {
    return Get-Content $Path -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Get-PropValue {
  param(
    [object]$Source,
    [string]$Name,
    $Fallback = $null
  )
  if ($null -eq $Source) {
    return $Fallback
  }
  $prop = $Source.PSObject.Properties[$Name]
  if ($null -eq $prop) {
    return $Fallback
  }
  if ($null -eq $prop.Value) {
    return $Fallback
  }
  return $prop.Value
}

$task = Get-TaskStatus -Name $TaskName
$jsonInfo = Get-FileInfoSafe -Path $latestJson
$latestPayload = Read-JsonSafe -Path $latestJson

$latestSummary = $null
if ($latestPayload -ne $null) {
  $scheduler = Get-PropValue -Source $latestPayload -Name "scheduler_summary"
  $data = Get-PropValue -Source $latestPayload -Name "data"
  $latestSummary = [pscustomobject]@{
    ok = [bool](Get-PropValue -Source $latestPayload -Name "ok" -Fallback $false)
    skipped = [bool](Get-PropValue -Source $latestPayload -Name "skipped" -Fallback $false)
    reason = [string](Get-PropValue -Source $latestPayload -Name "reason" -Fallback "")
    dispatch_ref = [string](Get-PropValue -Source $data -Name "dispatch_ref" -Fallback "")
    dispatch_source = [string](Get-PropValue -Source $data -Name "dispatch_source" -Fallback "")
    scene_gate_state = [string](Get-PropValue -Source $scheduler -Name "scene_gate_state" -Fallback (Get-PropValue -Source $data -Name "scene_gate_state" -Fallback ""))
    scene_gate_effect = [string](Get-PropValue -Source $scheduler -Name "scene_gate_effect" -Fallback (Get-PropValue -Source $data -Name "scene_gate_effect" -Fallback ""))
    scene_gate_reason = [string](Get-PropValue -Source $scheduler -Name "scene_gate_reason" -Fallback (Get-PropValue -Source $data -Name "scene_gate_reason" -Fallback ""))
    scene_gate_recipient_cap = [int](Get-PropValue -Source $scheduler -Name "scene_gate_recipient_cap" -Fallback (Get-PropValue -Source $data -Name "scene_gate_recipient_cap" -Fallback 0))
  }
}

$ok = $true
if (-not $task.exists) { $ok = $false }
if (-not $jsonInfo.exists -or [double]$jsonInfo.age_min -gt $StaleMinutes) { $ok = $false }

$payload = [pscustomobject]@{
  success = $ok
  task = $task
  latest_json = $jsonInfo
  latest_summary = $latestSummary
  stale_minutes_threshold = $StaleMinutes
}

$payload | ConvertTo-Json -Depth 6

if (-not $ok) {
  exit 1
}
