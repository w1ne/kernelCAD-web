# kernelCAD CLI installer for Windows x64.
#   irm https://kernelcad.com/install.ps1 | iex
#
# Env:
#   $env:KERNELCAD_VERSION='v0.17.4'  pin a release (default: latest)
#   $env:KERNELCAD_INSTALL_DIR=...    directory for the kernelcad.cmd launcher
#   $env:KERNELCAD_HOME=...           versioned install root
#   $env:KERNELCAD_NO_MODIFY_PATH=1   never update the user PATH

$ErrorActionPreference = 'Stop'

$Repo = 'w1ne/kernelCAD-web'
$Platform = 'windows-x86_64'
$Version = if ($env:KERNELCAD_VERSION) { $env:KERNELCAD_VERSION } else { 'latest' }
$HomeDir = if ($env:KERNELCAD_HOME) { $env:KERNELCAD_HOME } else { Join-Path $HOME '.kernelcad' }
$InstallDir = if ($env:KERNELCAD_INSTALL_DIR) { $env:KERNELCAD_INSTALL_DIR } else { Join-Path $HomeDir 'bin' }

function Stop-Install([string]$Message) {
    throw "kernelCAD install failed: $Message"
}

function Write-Info([string]$Message) {
    Write-Host "  $Message"
}

function Write-Ok([string]$Message) {
    Write-Host "  ✓ $Message" -ForegroundColor Green
}

$Architecture = $env:PROCESSOR_ARCHITECTURE
if ($env:PROCESSOR_ARCHITEW6432) {
    $Architecture = $env:PROCESSOR_ARCHITEW6432
}
if ($Architecture -ne 'AMD64') {
    Stop-Install "unsupported platform: Windows $Architecture; supported: Windows x86_64"
}

if ($Version -eq 'latest') {
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers @{
            Accept = 'application/vnd.github+json'
            'User-Agent' = 'kernelcad-installer'
        }
        $Version = $Release.tag_name
    } catch {
        Stop-Install "could not resolve the latest release; see https://github.com/$Repo/releases and pin KERNELCAD_VERSION"
    }
}
if ($Version -notmatch '^v[0-9]+\.[0-9]+\.[0-9]+$') {
    Stop-Install 'KERNELCAD_VERSION must look like v0.17.4'
}

$ArchiveName = "kernelcad-$($Version.Substring(1))-$Platform.zip"
$BaseUrl = "https://github.com/$Repo/releases/download/$Version"
$Destination = Join-Path (Join-Path $HomeDir 'versions') $Version
$TempDir = Join-Path ([IO.Path]::GetTempPath()) ("kernelcad-install-" + [Guid]::NewGuid().ToString('N'))
$ArchivePath = Join-Path $TempDir $ArchiveName
$ChecksumPath = Join-Path $TempDir 'SHA256SUMS'
$UnpackDir = Join-Path $TempDir 'unpacked'

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

    Write-Info "Installing kernelCAD $Version ($Platform)"
    try {
        Invoke-WebRequest -Uri "$BaseUrl/$ArchiveName" -OutFile $ArchivePath -UseBasicParsing
        Invoke-WebRequest -Uri "$BaseUrl/SHA256SUMS" -OutFile $ChecksumPath -UseBasicParsing
    } catch {
        Stop-Install "could not download the $Platform archive or SHA256SUMS for $Version; check https://github.com/$Repo/releases"
    }

    $ChecksumEntries = @(Get-Content -LiteralPath $ChecksumPath | Where-Object {
        $_ -match '^([0-9a-fA-F]{64})\s+\*?(.+)$' -and $Matches[2] -eq $ArchiveName
    })
    if ($ChecksumEntries.Count -ne 1) {
        Stop-Install "SHA256SUMS has no unique entry for $ArchiveName"
    }
    $ExpectedHash = [regex]::Match($ChecksumEntries[0], '^([0-9a-fA-F]{64})').Groups[1].Value.ToLowerInvariant()
    $ActualHash = (Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($ExpectedHash -ne $ActualHash) {
        Stop-Install "SHA-256 mismatch for $ArchiveName"
    }
    Write-Ok 'verified SHA-256'

    Expand-Archive -LiteralPath $ArchivePath -DestinationPath $UnpackDir -Force
    $PayloadDir = Join-Path $UnpackDir "kernelcad-$($Version.Substring(1))-$Platform"
    if (-not (Test-Path -LiteralPath (Join-Path $PayloadDir 'runtime/node.exe') -PathType Leaf)) {
        Stop-Install 'archive does not contain its bundled Node.js runtime'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $PayloadDir 'dist/cli/index.js') -PathType Leaf)) {
        Stop-Install 'archive does not contain the kernelCAD CLI'
    }

    $VersionsDir = Join-Path $HomeDir 'versions'
    New-Item -ItemType Directory -Path $VersionsDir -Force | Out-Null
    if (Test-Path -LiteralPath $Destination) {
        Remove-Item -LiteralPath $Destination -Recurse -Force
    }
    Move-Item -LiteralPath $PayloadDir -Destination $Destination

    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    $LauncherPath = Join-Path $InstallDir 'kernelcad.cmd'
    $VersionLauncher = Join-Path $Destination 'bin/kernelcad.cmd'
    Set-Content -LiteralPath $LauncherPath -Encoding Ascii -Value "@echo off`r`n`"$VersionLauncher`" %*`r`n"

    & $LauncherPath --version *> $null
    if ($LASTEXITCODE -ne 0) {
        & $LauncherPath --help *> $null
        if ($LASTEXITCODE -ne 0) {
            Stop-Install 'kernelcad installed but did not start'
        }
    }

    $PathWasAdded = $false
    if ($env:KERNELCAD_NO_MODIFY_PATH -ne '1') {
        $UserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
        $PathEntries = @($UserPath -split ';' | Where-Object { $_ })
        if (-not ($PathEntries | Where-Object { $_.TrimEnd('\') -ieq $InstallDir.TrimEnd('\') })) {
            $NewUserPath = (@($PathEntries) + $InstallDir) -join ';'
            [Environment]::SetEnvironmentVariable('Path', $NewUserPath, 'User')
            $env:Path = "$InstallDir;$env:Path"
            $PathWasAdded = $true
        }
    }

    Write-Ok "kernelCAD is ready: $LauncherPath"
    if ($PathWasAdded) {
        Write-Info 'Added the launcher directory to your user PATH; open a new terminal to use kernelcad.'
    } elseif ($env:KERNELCAD_NO_MODIFY_PATH -eq '1') {
        Write-Info "Add this directory to your user PATH if needed: $InstallDir"
    } else {
        Write-Info 'The launcher directory is already on your user PATH.'
    }

    Write-Host "`nRun locally:`n  kernelcad import-step part.step --out imported`n  kernelcad evaluate imported/part.kcad.ts"
} finally {
    if (Test-Path -LiteralPath $TempDir) {
        Remove-Item -LiteralPath $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
