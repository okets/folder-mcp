# Windows Python Performance Optimization Script
param(
    [switch]$WhatIf = $false,
    [switch]$Force = $false
)

Write-Host "Windows Python Performance Optimization" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check admin status
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "WARNING: Not running as Administrator" -ForegroundColor Yellow
    if (-not $WhatIf) {
        Write-Host "Administrator privileges required to modify Windows Defender settings." -ForegroundColor Red
        Write-Host "Run as Administrator or use -WhatIf to see what would be done." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "WhatIf mode: Showing what would be done..." -ForegroundColor Cyan
    Write-Host ""
}

# Find Python installations
$pythonPaths = @(
    "$env:LOCALAPPDATA\Programs\Python\Python313",
    "$env:LOCALAPPDATA\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0"
)

Write-Host "Searching for Python installations:" -ForegroundColor Cyan
$foundPaths = @()
foreach ($path in $pythonPaths) {
    if (Test-Path $path) {
        Write-Host "  Found: $path" -ForegroundColor Green
        $foundPaths += $path
    } else {
        Write-Host "  Not found: $path" -ForegroundColor Gray
    }
}

if ($foundPaths.Count -eq 0) {
    Write-Host "No Python installations found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Python installations to optimize: $($foundPaths.Count)" -ForegroundColor Green

# Check current exclusions (only if admin)
$pathsToAdd = $foundPaths
if ($isAdmin) {
    try {
        $currentExclusions = (Get-MpPreference).ExclusionPath
        $pathsToAdd = @()
        foreach ($path in $foundPaths) {
            if ($currentExclusions -notcontains $path) {
                $pathsToAdd += $path
            } else {
                Write-Host "  Already excluded: $path" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "Could not check current exclusions: $_" -ForegroundColor Yellow
        $pathsToAdd = $foundPaths
    }
}

if ($pathsToAdd.Count -eq 0) {
    Write-Host "All Python paths are already excluded!" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "Paths to add to Windows Defender exclusions:" -ForegroundColor Yellow
foreach ($path in $pathsToAdd) {
    Write-Host "  + $path" -ForegroundColor White
}

if ($WhatIf) {
    Write-Host ""
    Write-Host "WhatIf: Would add $($pathsToAdd.Count) paths to exclusions" -ForegroundColor Cyan
    Write-Host "To actually apply changes, run as Administrator without -WhatIf" -ForegroundColor Yellow
    exit 0
}

if (-not $Force) {
    $response = Read-Host "Add these paths to Windows Defender exclusions? (y/N)"
    if ($response -notmatch "^[Yy]") {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit 0
    }
}

# Add exclusions
Write-Host ""
Write-Host "Adding exclusions..." -ForegroundColor Cyan
$successCount = 0
foreach ($path in $pathsToAdd) {
    try {
        Add-MpPreference -ExclusionPath $path
        Write-Host "  Success: $path" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "  Failed: $path - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Optimization complete!" -ForegroundColor Green
Write-Host "Successfully added: $successCount exclusions" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart folder-mcp daemon" -ForegroundColor White
Write-Host "2. Test Python import speed" -ForegroundColor White
Write-Host "3. Python should now load 2-5x faster" -ForegroundColor White
