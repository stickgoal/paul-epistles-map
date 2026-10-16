# run-cdp.ps1 -- launch an isolated headless Chrome, run a CDP script, then close ONLY
# the instance we started.
#
# Why this file exists: `taskkill /IM chrome.exe` kills EVERY Chrome process on the
# machine, including the user's own browsing windows. That is unacceptable. This helper
# records the PID of the process it launches and terminates only that process tree
# (taskkill /PID <pid> /T). It also uses a dedicated --user-data-dir so the automation
# browser never touches the user's real profile.
#
# NOTE: comments are ASCII-only on purpose. Windows PowerShell 5.1 reads .ps1 as GBK
# unless the file has a UTF-8 BOM, so non-ASCII comments get mangled and break parsing.
#
# Usage (from Git Bash):
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-cdp.ps1 verify.mjs
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-cdp.ps1 debug-ux.mjs 1280 800

param(
  [Parameter(Mandatory = $true)][string]$Script,
  [int]$Width = 1280,
  [int]$Height = 800
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

$root = (Get-Location).Path
$profileDir = Join-Path $root '.cdp-profile'
$chrome = Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'

if (-not (Test-Path $chrome)) {
  Write-Host "chrome.exe not found: $chrome"
  exit 1
}

Write-Host "[cdp] launching isolated headless Chrome ${Width}x${Height} ..."
$proc = Start-Process -FilePath $chrome -PassThru -WindowStyle Hidden -ArgumentList @(
  '--headless=new'
  '--no-sandbox'
  '--disable-gpu'
  "--window-size=$Width,$Height"
  '--remote-debugging-port=9222'
  "--user-data-dir=$profileDir"
  'about:blank'
)

$code = 1
try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 250
    try {
      $null = Invoke-RestMethod -Uri 'http://127.0.0.1:9222/json/version' -TimeoutSec 1
      $ready = $true
      break
    } catch { }
  }
  if (-not $ready) { throw 'CDP port 9222 did not become ready' }

  Write-Host "[cdp] running $Script ..."
  # Force UTF-8 on stdout: Windows PowerShell 5.1 otherwise decodes node's UTF-8
  # output as GBK, turning Chinese assertions into mojibake (values are still
  # correct in the browser -- this only fixes how they display here).
  $env:PYTHONIOENCODING = 'utf-8'
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  & node $Script
  $code = $LASTEXITCODE
}
catch {
  Write-Host "[cdp] ERROR: $_"
  $code = 1
}
finally {
  if ($proc -and -not $proc.HasExited) {
    Write-Host "[cdp] closing headless Chrome PID $($proc.Id) (this process tree only) ..."
    taskkill /PID $proc.Id /T /F | Out-Null
  }
}

exit $code
