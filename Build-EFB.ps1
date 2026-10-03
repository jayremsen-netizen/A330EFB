$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
  if(-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)){throw 'Install Node.js 24.14.0 and add it to PATH.'}
  if(-not (Test-Path -LiteralPath 'node_modules\vite\bin\vite.js')){
    npm.cmd ci
    if($LASTEXITCODE -ne 0){throw 'npm ci failed.'}
  }
  npm.cmd run build
  if($LASTEXITCODE -ne 0){throw 'A330EFB build failed.'}
} finally {Pop-Location}
