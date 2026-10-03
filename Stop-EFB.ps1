$pidFile=Join-Path $PSScriptRoot 'logs\efb.pid'
if (-not (Test-Path -LiteralPath $pidFile)) {Write-Host '没有本任务的服务记录。';exit}
$efbPid=[int](Get-Content -LiteralPath $pidFile -Raw)
$efbProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$efbPid"
$expected=Join-Path $PSScriptRoot 'local-efb\server.cjs'
if ($efbProcess -and $efbProcess.CommandLine.Contains($expected)) {Stop-Process -Id $efbPid;Write-Host '已停止本任务的 EFB 服务。'} else {Write-Host 'PID 已失效或进程不匹配，未停止任何进程。'}
