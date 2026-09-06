[CmdletBinding()]
param(
    [string]$ProjectDir = "C:\3S-Fulfillment-Production",
    [string]$PatchedFile = "MasterServer_customer_fulfillment_gemini_trial.py",
    [string]$TargetFile = "MasterServer_customer_fulfillment_fixed.py",
    [int]$Port = 5000
)

$ErrorActionPreference = "Stop"
Set-Location $ProjectDir
$source = Join-Path $ProjectDir $PatchedFile
$target = Join-Path $ProjectDir $TargetFile
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$target.before-gemini-trial-$timestamp.bak"
$logDir = Join-Path $ProjectDir "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if (!(Test-Path $source)) { throw "Patched source not found: $source. Copy MasterServer_customer_fulfillment_gemini_trial.py into $ProjectDir first." }
if (!(Test-Path $target)) { throw "Active target not found: $target. Set -TargetFile to the filename currently used by your service." }

$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
foreach ($listener in $listeners) {
    $pid = $listener.OwningProcess
    if ($pid -and $pid -ne 0) {
        Write-Host "Stopping Python listener PID $pid on port $Port..."
        Stop-Process -Id $pid -Force
    }
}
Start-Sleep -Seconds 2

Copy-Item -LiteralPath $target -Destination $backup -Force
Copy-Item -LiteralPath $source -Destination $target -Force
Write-Host "Backup: $backup"
Write-Host "Installed patched MasterServer: $target"

$stdout = Join-Path $logDir "masterserver.stdout.log"
$stderr = Join-Path $logDir "masterserver.stderr.log"
$python = (Get-Command py.exe -ErrorAction Stop).Source
Start-Process -FilePath $python -ArgumentList "-3.11", $target -WorkingDirectory $ProjectDir -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden | Out-Null

$deadline = (Get-Date).AddSeconds(30)
do {
    Start-Sleep -Milliseconds 500
    $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
} while (!$listening -and (Get-Date) -lt $deadline)

if (!$listening) {
    Write-Host "MasterServer failed to listen. Last stderr lines:" -ForegroundColor Red
    if (Test-Path $stderr) { Get-Content $stderr -Tail 40 }
    throw "MasterServer did not open port $Port. Restore $backup if required."
}

Write-Host "MasterServer is listening on port $Port with the Gemini admin-trial patch."
Write-Host "Next route probe: POST /admin/license/gemini-trial with duration_days=6; expected HTTP 400. HTTP 404 means the patched file is not the active process."
