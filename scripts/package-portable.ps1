$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$packageJson = Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json
$version = $packageJson.version
$releaseExe = Join-Path $root "src-tauri\target\release\rodots.exe"

if (!(Test-Path $releaseExe)) {
  throw "rodots.exe was not found. Run npm run tauri -- build first."
}

$distRoot = Join-Path $root "dist-portable"
$portableName = "RoDots-$version-portable"
$portableDir = Join-Path $distRoot $portableName
$zipPath = Join-Path $distRoot "$portableName.zip"

if (Test-Path $portableDir) {
  Remove-Item -LiteralPath $portableDir -Recurse -Force
}
if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $portableDir | Out-Null
Copy-Item -LiteralPath $releaseExe -Destination (Join-Path $portableDir "rodots.exe")
Copy-Item -LiteralPath (Join-Path $root "portable\README.md") -Destination (Join-Path $portableDir "README.md")
Copy-Item -LiteralPath (Join-Path $root "portable\config") -Destination (Join-Path $portableDir "config") -Recurse
Copy-Item -LiteralPath (Join-Path $root "portable\extensions") -Destination (Join-Path $portableDir "extensions") -Recurse
Copy-Item -LiteralPath (Join-Path $root "examples") -Destination (Join-Path $portableDir "examples") -Recurse

Compress-Archive -LiteralPath $portableDir -DestinationPath $zipPath -Force
Write-Output $zipPath
