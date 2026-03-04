# rmhcode Windows installer
# Usage: irm https://raw.githubusercontent.com/ka1kqi/rmhcode/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

# ── Config ───────────────────────────────────────────────────────────────
$Repo = "https://github.com/ka1kqi/rmhcode.git"
$InstallDir = if ($env:RMHCODE_INSTALL_DIR) { $env:RMHCODE_INSTALL_DIR } else { "$env:USERPROFILE\.rmhcode" }
$BinDir = if ($env:RMHCODE_BIN_DIR) { $env:RMHCODE_BIN_DIR } else { "$env:USERPROFILE\.local\bin" }

# ── Colors ───────────────────────────────────────────────────────────────
function Write-Blue   { param($msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Purple { param($msg) Write-Host $msg -ForegroundColor Magenta }
function Write-Green  { param($msg) Write-Host "> $msg" -ForegroundColor Green }
function Write-Err    { param($msg) Write-Host "x $msg" -ForegroundColor Red }

function Write-Banner {
    Write-Host ""
    Write-Host " ###    ###### ###   ######  ##  ## ###### ###### ###### #######" -ForegroundColor Cyan
    Write-Host "  ##   ##   ## #### ###### ##  ## ##     ##   ## ##  ## ##     " -ForegroundColor Cyan
    Write-Host "   ##  ###### ## ## ## ###### ##     ##   ## ##  ## #####  " -ForegroundColor Magenta
    Write-Host "  ##   ##  ## ##    ## ##  ## ##     ##   ## ##  ## ##     " -ForegroundColor Magenta
    Write-Host " ##    ##  ## ##    ## ##  ## ###### ###### ###### #######" -ForegroundColor DarkMagenta
    Write-Host "  installer" -ForegroundColor DarkGray
    Write-Host ""
}

# ── Preflight checks ────────────────────────────────────────────────────
function Test-Dependencies {
    $missing = @()

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        $missing += "node (>= 18)"
    } else {
        $nodeMajor = (node -e "console.log(process.versions.node.split('.')[0])") | Out-String
        $nodeMajor = $nodeMajor.Trim()
        if ([int]$nodeMajor -lt 18) {
            $nodeVer = (node -v) | Out-String
            $missing += "node >= 18 (found $($nodeVer.Trim()))"
        }
    }

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        $missing += "git"
    }

    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        $missing += "npm"
    }

    if ($missing.Count -gt 0) {
        Write-Err "Missing required dependencies: $($missing -join ', ')"
        Write-Host ""
        Write-Host "Install Node.js >= 18 from https://nodejs.org" -ForegroundColor Yellow
        Write-Host "Install Git from https://git-scm.com" -ForegroundColor Yellow
        exit 1
    }
}

# ── Install ──────────────────────────────────────────────────────────────
function Install-Rmhcode {
    # Clone or update
    if (Test-Path "$InstallDir\.git") {
        Write-Green "Updating existing installation..."
        git -C $InstallDir checkout -- . 2>$null
        git -C $InstallDir pull --ff-only --quiet
    } else {
        if (Test-Path $InstallDir) {
            Remove-Item -Recurse -Force $InstallDir
        }
        Write-Green "Cloning rmhcode..."
        git clone --depth 1 --quiet $Repo $InstallDir
    }

    # Install deps and build patched CLI
    Write-Green "Installing dependencies and patching CLI..."
    Push-Location $InstallDir
    try {
        npm install 2>&1 | Select-Object -Last 3
    } finally {
        Pop-Location
    }
    Write-Host "> Patched CLI built" -ForegroundColor Green
}

# ── Create wrapper script ────────────────────────────────────────────────
function Install-Wrapper {
    if (-not (Test-Path $BinDir)) {
        New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
    }

    # Create a .cmd wrapper for Windows
    $cmdWrapper = "$BinDir\rmhcode.cmd"
    $cmdContent = "@echo off`r`nnode `"$InstallDir\bin\rmhcode.mjs`" %*"
    Set-Content -Path $cmdWrapper -Value $cmdContent -Encoding ASCII

    # Also create a PowerShell wrapper
    $ps1Wrapper = "$BinDir\rmhcode.ps1"
    $ps1Content = "#!/usr/bin/env pwsh`nnode `"$InstallDir\bin\rmhcode.mjs`" @args"
    Set-Content -Path $ps1Wrapper -Value $ps1Content -Encoding UTF8

    Write-Host "> Installed rmhcode to $cmdWrapper" -ForegroundColor Green
}

# ── PATH check ───────────────────────────────────────────────────────────
function Test-PathEntry {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -split ";" | Where-Object { $_ -eq $BinDir }) {
        return
    }

    Write-Host ""
    Write-Green "$BinDir is not in your PATH."

    $addToPath = Read-Host "  Add it to your user PATH now? (Y/n)"
    if ($addToPath -ne "n" -and $addToPath -ne "N") {
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if ($currentPath) {
            $newPath = "$currentPath;$BinDir"
        } else {
            $newPath = $BinDir
        }
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        $env:Path = "$env:Path;$BinDir"
        Write-Host "> Added $BinDir to user PATH" -ForegroundColor Green
        Write-Host "  Restart your terminal for the change to take effect." -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "  Add it manually:" -ForegroundColor Yellow
        Write-Host "  `$env:Path += `";$BinDir`"" -ForegroundColor DarkGray
        Write-Host "  Or permanently:" -ForegroundColor Yellow
        Write-Host "  [Environment]::SetEnvironmentVariable('Path', `$env:Path + ';$BinDir', 'User')" -ForegroundColor DarkGray
    }
}

# ── Verify ───────────────────────────────────────────────────────────────
function Test-Installation {
    if (Test-Path "$BinDir\rmhcode.cmd") {
        Write-Host ""
        Write-Host "> rmhcode is ready! Run it with:" -ForegroundColor Green
        Write-Host ""
        Write-Host "  rmhcode" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Err "Installation failed - $BinDir\rmhcode.cmd not found"
        exit 1
    }
}

# ── Uninstall hint ───────────────────────────────────────────────────────
function Write-UninstallHint {
    Write-Host "To uninstall: Remove-Item -Recurse ~\.rmhcode, ~\.local\bin\rmhcode.*" -ForegroundColor DarkGray
    Write-Host ""
}

# ── Main ─────────────────────────────────────────────────────────────────
Write-Banner
Test-Dependencies
Install-Rmhcode
Install-Wrapper
Test-PathEntry
Test-Installation
Write-UninstallHint