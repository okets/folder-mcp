# Windows Python Performance Optimization Script
# Adds Python directories to Windows Defender exclusions for faster ML package loading

param(
    [switch]$WhatIf = $false,
    [switch]$Force = $false
)

Write-Host "Windows Python Performance Optimization" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script requires Administrator privileges to modify Windows Defender settings." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run PowerShell as Administrator and try again:" -ForegroundColor Yellow
    Write-Host "1. Right-click on PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as administrator'" -ForegroundColor Yellow
    Write-Host "3. Navigate to this directory and run the script again" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Define common Python installation paths
$pythonPaths = @(
    "$env:LOCALAPPDATA\Programs\Python",
    "$env:APPDATA\Python", 
    "$env:PROGRAMFILES\Python*",
    "$env:PROGRAMFILES(X86)\Python*"
)

# Find existing Python installations
$foundPaths = @()
foreach ($pathPattern in $pythonPaths) {
    $expandedPaths = Get-ChildItem -Path $pathPattern -Directory -ErrorAction SilentlyContinue
    if ($expandedPaths) {
        $foundPaths += $expandedPaths.FullName
    }
}

if ($foundPaths.Count -eq 0) {
    Write-Host "WARNING: No Python installations found in common locations." -ForegroundColor Yellow
    Write-Host "You may need to manually add your Python directory to Windows Defender exclusions." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common Python locations to check:" -ForegroundColor White
    foreach ($path in $pythonPaths) {
        Write-Host "  - $path" -ForegroundColor Gray
    }
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host "Found Python installations:" -ForegroundColor Green
foreach ($path in $foundPaths) {
    Write-Host "  - $path" -ForegroundColor White
}
Write-Host ""

# Get current exclusions to avoid duplicates
try {
    $currentExclusions = (Get-MpPreference).ExclusionPath
} catch {
    Write-Host "ERROR: Could not read Windows Defender preferences. Ensure Windows Defender is enabled." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check which paths need to be added
$pathsToAdd = @()
foreach ($path in $foundPaths) {
    $alreadyExcluded = $currentExclusions | Where-Object { $_ -eq $path }
    if (-not $alreadyExcluded) {
        $pathsToAdd += $path
    }
}

if ($pathsToAdd.Count -eq 0) {
    Write-Host "All Python paths are already excluded from Windows Defender scanning." -ForegroundColor Green
    Write-Host ""
    Write-Host "Your Python should already load faster. If you're still experiencing slow startup:" -ForegroundColor Yellow
    Write-Host "1. Restart folder-mcp daemon" -ForegroundColor Yellow
    Write-Host "2. Test with: python -c \"import torch, sentence_transformers; print('Fast import test')\"" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host "Paths to add to Windows Defender exclusions:" -ForegroundColor Yellow
foreach ($path in $pathsToAdd) {
    Write-Host "  + $path" -ForegroundColor White
}
Write-Host ""

if ($WhatIf) {
    Write-Host "WhatIf mode: Would add the above paths to Windows Defender exclusions." -ForegroundColor Cyan
    Write-Host "Run without -WhatIf to actually apply changes." -ForegroundColor Cyan
    Read-Host "Press Enter to exit"
    exit 0
}

if (-not $Force) {
    $response = Read-Host "Add these paths to Windows Defender exclusions? (y/N)"
    if ($response -notin @('y', 'Y', 'yes', 'Yes', 'YES')) {
        Write-Host "Operation cancelled." -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 0
    }
}

# Add exclusions
$successCount = 0
$errorCount = 0

Write-Host ""
Write-Host "Adding exclusions..." -ForegroundColor Cyan

foreach ($path in $pathsToAdd) {
    try {
        Add-MpPreference -ExclusionPath $path
        Write-Host "  ✓ Added: $path" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "  ✗ Failed: $path - $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "Optimization Results:" -ForegroundColor Cyan
Write-Host "  Successfully added: $successCount exclusions" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "  Failed to add: $errorCount exclusions" -ForegroundColor Red
}

if ($successCount -gt 0) {
    Write-Host ""
    Write-Host "SUCCESS! Python should now load much faster." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Restart folder-mcp daemon for best results" -ForegroundColor White
    Write-Host "2. Test performance with: python -c \"import torch; print('Fast!')\"" -ForegroundColor White
    Write-Host "3. Add folders to folder-mcp - first load should be ~2-5 seconds instead of 10-30 seconds" -ForegroundColor White
}

Write-Host ""
Read-Host "Press Enter to exit"