param([switch]$NoBrowser,[ValidateSet('preflight','change','tools','resources','takeoff','planning')][string]$Scenario='preflight',[ValidateRange(1024,65535)][int]$Port=9698)
$ErrorActionPreference='Stop'
$taskRoot=$PSScriptRoot
$serverFile=Join-Path $taskRoot 'local-efb\server.cjs'
$identityTool=Join-Path $taskRoot 'scripts\build-identity.cjs'
$baseUrl='http://127.0.0.1:'+$Port
$demoUrl=$baseUrl+'/demo.html?autoplay=1&scenario='+$Scenario
$nodePath=(Get-Command node.exe -ErrorAction SilentlyContinue).Source
if(-not $nodePath -or -not (Test-Path -LiteralPath $nodePath)){throw '未找到 Node.js。请安装 Node.js 并加入 PATH。'}
$identityText=& $nodePath $identityTool inspect $taskRoot
if($LASTEXITCODE -ne 0){throw '本目录构建身份缺失或无效。请先运行 Build-EFB.ps1，再启动演示。'}
$expected=$identityText | ConvertFrom-Json
if(-not $expected.sourceCurrent -or -not $expected.presentation){throw '本目录源码与构建不一致，或缺少演示构建。请先运行 Build-EFB.ps1，再启动演示。'}
function Assert-MatchingHealth($health){
  if($health.application -ne 'a330efb' -or -not $health.ready -or -not $health.presentation -or -not $health.sourceCurrent -or $health.directoryId -ne $expected.directoryId -or $health.build.buildId -ne $expected.build.buildId){
    throw ('端口 '+$Port+' 上的服务不是本目录的当前构建。当前目录: '+$expected.directory+'；当前构建: '+$expected.build.version+'/'+$expected.build.buildId+'；占用服务目录: '+$health.directory+'；占用构建: '+$health.build.version+'/'+$health.build.buildId+'。请在占用服务所属目录运行 Stop-EFB-Demo.ps1 -Port '+$Port+'，或为本目录选择其他 -Port；未停止任何进程。')
  }
}
$connection=New-Object System.Net.Sockets.TcpClient
try{$pending=$connection.ConnectAsync('127.0.0.1',$Port);$occupied=$pending.Wait(700) -and $connection.Connected}catch{$occupied=$false}finally{$connection.Dispose()}
if($occupied){
  try{$health=Invoke-RestMethod ($baseUrl+'/__health') -TimeoutSec 2}catch{throw ('端口 '+$Port+' 已被旧构建或其他服务占用，无法验证构建身份。请停止该服务所属目录的服务，或选择其他 -Port；未停止任何进程。')}
  Assert-MatchingHealth $health
}else{
  $logDir=Join-Path $taskRoot 'logs';New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  $logName=if($Port -eq 9698){'demo'}else{'demo-'+$Port}
  $process=Start-Process -FilePath $nodePath -ArgumentList ('"'+$serverFile+'" --port '+$Port) -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir ($logName+'.stdout.log')) -RedirectStandardError (Join-Path $logDir ($logName+'.stderr.log'))
  $ready=$false
  for($attempt=0;$attempt -lt 20;$attempt++){
    Start-Sleep -Milliseconds 250
    $process.Refresh()
    if($process.HasExited){throw ('演示服务启动失败，请查看 logs\'+$logName+'.stderr.log。端口可能已被其他进程占用。')}
    try{$check=Invoke-RestMethod ($baseUrl+'/__health') -TimeoutSec 1}catch{continue}
    Assert-MatchingHealth $check
    if($check.processId -ne $process.Id){throw '端口由其他进程响应，未复用或终止该进程。请选择其他 -Port。'}
    $ready=$true;break
  }
  if(-not $ready){throw ('演示服务未就绪，请查看 logs\'+$logName+'.stderr.log。')}
  $process.Id | Set-Content -LiteralPath (Join-Path $logDir ($logName+'.pid'))
}
Write-Host ('A330EFB '+$expected.build.version+' / build '+$expected.build.buildId+' 已就绪: '+$demoUrl)
Write-Host '打开后自动播放；空格或 Esc 暂停；右上角可选择场景和保存资料。'
if(-not $NoBrowser){Start-Process $demoUrl}