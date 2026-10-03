param([switch]$NoBrowser,[ValidateSet('preflight','change','tools')][string]$Scenario='preflight')
$ErrorActionPreference='Stop'
$taskRoot=$PSScriptRoot
$serverFile=Join-Path $taskRoot 'local-efb\server.cjs'
$demoUrl='http://127.0.0.1:9698/demo.html?autoplay=1&scenario='+$Scenario
$running=$false
try {
  $health=Invoke-RestMethod 'http://127.0.0.1:9698/__health' -TimeoutSec 2
  if($health.application -eq 'a330efb' -and $health.presentation){$running=$true}
  else{throw '端口 9698 已被其他服务占用。'}
} catch {if($_.Exception.Message -like '*已被其他服务占用*'){throw}}
if(-not $running){
  $nodePath=(Get-Command node.exe -ErrorAction SilentlyContinue).Source
  if(-not $nodePath -or -not (Test-Path -LiteralPath $nodePath)){throw '未找到 Node.js。请安装 Node.js 并加入 PATH。'}
  if(-not (Test-Path -LiteralPath (Join-Path $taskRoot 'local-efb\dist\demo.html'))){throw '缺少演示构建产物，请运行 Build-EFB.ps1。'}
  $logDir=Join-Path $taskRoot 'logs';New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  $process=Start-Process -FilePath $nodePath -ArgumentList ('"'+$serverFile+'" --port 9698') -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'demo.stdout.log') -RedirectStandardError (Join-Path $logDir 'demo.stderr.log')
  $process.Id | Set-Content -LiteralPath (Join-Path $logDir 'demo.pid')
  $ready=$false
  for($attempt=0;$attempt -lt 20;$attempt++){
    Start-Sleep -Milliseconds 250
    try{$check=Invoke-RestMethod 'http://127.0.0.1:9698/__health' -TimeoutSec 1;if($check.application -eq 'a330efb' -and $check.presentation){$ready=$true;break}}catch{}
    if($process.HasExited){throw '演示服务启动失败，请查看 logs\demo.stderr.log。'}
  }
  if(-not $ready){throw '演示服务未就绪，请查看 logs\demo.stderr.log。'}
}
Write-Host ('A330 EFB 投标演示已就绪: '+$demoUrl)
Write-Host '打开后自动播放；空格或 Esc 暂停；右上角可选择场景和保存资料。'
if(-not $NoBrowser){Start-Process $demoUrl}
