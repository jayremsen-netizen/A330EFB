param([ValidateRange(1024,65535)][int]$Port=9698)
$ErrorActionPreference='Stop'
$logName=if($Port -eq 9698){'demo'}else{'demo-'+$Port}
$pidFile=Join-Path $PSScriptRoot ('logs\'+$logName+'.pid')
if(-not (Test-Path -LiteralPath $pidFile)){Write-Host '没有本演示的服务记录。';exit}
$demoPid=[int](Get-Content -LiteralPath $pidFile -Raw)
$demoProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$demoPid"
$expected=Join-Path $PSScriptRoot 'local-efb\server.cjs'
if($demoProcess -and $demoProcess.CommandLine -and $demoProcess.CommandLine.Contains($expected) -and $demoProcess.CommandLine -match ('--port\s+'+$Port+'(?:\s|$)')){
  Stop-Process -Id $demoPid
  Remove-Item -LiteralPath $pidFile
  Write-Host '已停止本任务的投标演示服务。'
}else{Write-Host 'PID 已失效或进程不匹配，未停止任何进程。'}