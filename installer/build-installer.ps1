# Build the rmhcode Windows installer
# Prerequisites: Node.js >= 18, Inno Setup 6 (iscc.exe in PATH or default location)
#
# Usage: .\installer\build-installer.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$InstallerDir = Join-Path $ProjectRoot "installer"
$DistDir = Join-Path $ProjectRoot "dist"

Write-Host "`n  Building rmhcode Windows installer...`n" -ForegroundColor Cyan

# ── Step 1: Generate icon ────────────────────────────────────────────────
Write-Host "> Generating icon..." -ForegroundColor Magenta
node (Join-Path $InstallerDir "generate-icon.mjs")
if ($LASTEXITCODE -ne 0) {
    Write-Host "x Failed to generate icon" -ForegroundColor Red
    exit 1
}

# ── Step 2: Ensure LICENSE exists ────────────────────────────────────────
$licensePath = Join-Path $ProjectRoot "LICENSE"
if (-not (Test-Path $licensePath)) {
    Write-Host "> Creating MIT LICENSE file..." -ForegroundColor Magenta
    $version = (Get-Content (Join-Path $ProjectRoot "package.json") | ConvertFrom-Json).version
    @"
MIT License

Copyright (c) $(Get-Date -Format yyyy) RMH Studios

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"@ | Set-Content $licensePath -Encoding UTF8
}

# ── Step 3: Find Inno Setup compiler ────────────────────────────────────
$iscc = $null

# Check PATH first
if (Get-Command iscc -ErrorAction SilentlyContinue) {
    $iscc = "iscc"
} else {
    # Check default install locations
    $candidates = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
        "${env:LOCALAPPDATA}\Programs\Inno Setup 6\ISCC.exe"
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) {
            $iscc = $path
            break
        }
    }
}

if (-not $iscc) {
    Write-Host "x Inno Setup 6 not found." -ForegroundColor Red
    Write-Host "  Install from: https://jrsoftware.org/isdl.php" -ForegroundColor Yellow
    Write-Host "  Or install via: winget install JRSoftware.InnoSetup" -ForegroundColor Yellow
    exit 1
}

Write-Host "> Using Inno Setup: $iscc" -ForegroundColor Magenta

# ── Step 4: Create dist directory ────────────────────────────────────────
if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir -Force | Out-Null
}

# ── Step 5: Read version from package.json ───────────────────────────────
$pkgJson = Get-Content (Join-Path $ProjectRoot "package.json") | ConvertFrom-Json
$version = $pkgJson.version
Write-Host "> Building version: $version" -ForegroundColor Magenta

# ── Step 6: Build installer ─────────────────────────────────────────────
Write-Host "> Compiling installer..." -ForegroundColor Magenta
$issFile = Join-Path $InstallerDir "rmhcode.iss"

& $iscc /DMyAppVersion="$version" $issFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nx Build failed!" -ForegroundColor Red
    exit 1
}

# ── Done ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "> Installer built successfully!" -ForegroundColor Green
$installer = Get-ChildItem "$DistDir\*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($installer) {
    Write-Host "  Output: $($installer.FullName)" -ForegroundColor Cyan
    Write-Host "  Size: $([math]::Round($installer.Length / 1MB, 2)) MB" -ForegroundColor Cyan
}
Write-Host ""