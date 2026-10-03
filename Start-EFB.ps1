$ErrorActionPreference='Stop'
$taskRoot=$PSScriptRoot
$serverFile=Join-Path $taskRoot 'local-efb\server.cjs'
try {
  $health=Invoke-RestMethod 'http://127.0.0.1:9697/__health' -TimeoutSec 2
  if ($health.application -eq 'a330efb') { Write-Host 'Headwind EFB 已运行: http://127.0.0.1:9697/'; exit 0 }
} catch {}
$nodePath=(Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $nodePath -or -not (Test-Path -LiteralPath $nodePath)) {throw '请先安装 Node.js 24.14.0 或兼容版本。'}
if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'local-efb\dist\index.html'))) {throw '缺少构建产物，请运行 Build-EFB.ps1。'}
$logDir=Join-Path $taskRoot 'logs'; New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$process=Start-Process -FilePath $nodePath -ArgumentList ('"'+$serverFile+'"') -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'efb.stdout.log') -RedirectStandardError (Join-Path $logDir 'efb.stderr.log')
$process.Id | Set-Content -LiteralPath (Join-Path $logDir 'efb.pid')
Start-Sleep -Milliseconds 600
$check=Invoke-RestMethod 'http://127.0.0.1:9697/__health' -TimeoutSec 3
if($check.application -ne 'a330efb'){throw '端口上的服务不是本地 EFB。'}
Write-Host 'Headwind EFB 已启动: http://127.0.0.1:9697/'
Write-Host '页面会自动开机；若主动休眠，点击“唤醒 EFB”。底部“载入演示航班”可加载虚构演示数据。'
