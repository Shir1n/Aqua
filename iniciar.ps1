# Inicia las tres aplicaciones en terminales independientes, sin depender de GNU make.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Node.js/npm no están instalados o no aparecen en PATH.' }
foreach ($dir in @('frontend','backend','solicitud')) {
  if (-not (Test-Path (Join-Path $dir 'node_modules'))) {
    Write-Host "Instalando dependencias de $dir..."
    & npm.cmd ci --prefix $dir
    if ($LASTEXITCODE -ne 0) { throw "Error instalando $dir" }
  }
}
foreach ($dir in @('backend','frontend','solicitud')) {
  $cmd = "Set-Location -LiteralPath '$($PSScriptRoot.Replace("'", "''"))'; npm.cmd --prefix $dir run dev"
  Start-Process powershell.exe -ArgumentList '-NoExit','-NoProfile','-Command', $cmd
}
Write-Host 'Servicios iniciados en tres ventanas. Espera los mensajes de Vite y API AquaChile.'
