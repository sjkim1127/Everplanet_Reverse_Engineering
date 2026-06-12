$ErrorActionPreference = "Stop"

# Ignore vendor and logs
if (-not (Test-Path ".gitignore")) {
    Set-Content -Path ".gitignore" -Value "vendor/`n*.log`nfrida_live.log.err"
} else {
    Add-Content -Path ".gitignore" -Value "vendor/`n*.log`nfrida_live.log.err"
}

# Add .gitignore first
git add .gitignore
git commit -m "Add .gitignore to exclude vendor and logs"
git push

# Get all untracked and modified files
$files = git ls-files --others --modified --exclude-standard

if (-not $files) {
    Write-Host "No files to push."
    exit
}

$batchSizeLimit = 100MB
$currentBatchSize = 0
$currentBatchFiles = @()
$batchCount = 1

foreach ($file in $files) {
    # Resolve file path
    $filePath = Resolve-Path $file -ErrorAction SilentlyContinue
    if (-not $filePath) { continue }
    
    $fileInfo = Get-Item $filePath
    $fileSize = $fileInfo.Length
    
    # If a single file is larger than the limit, we must add it alone in a batch
    if ($fileSize -ge $batchSizeLimit -and $currentBatchFiles.Count -gt 0) {
        # Process current batch first
        Write-Host "Processing Batch $batchCount ($($currentBatchFiles.Count) files, $([math]::Round($currentBatchSize/1MB, 2)) MB)"
        $currentBatchFiles | ForEach-Object { git add "`"$_`"" }
        git commit -m "Batch $($batchCount): Add files"
        git push
        $batchCount++
        $currentBatchFiles = @()
        $currentBatchSize = 0
    }
    
    $currentBatchFiles += $file
    $currentBatchSize += $fileSize
    
    if ($currentBatchSize -ge $batchSizeLimit) {
        Write-Host "Processing Batch $batchCount ($($currentBatchFiles.Count) files, $([math]::Round($currentBatchSize/1MB, 2)) MB)"
        $currentBatchFiles | ForEach-Object { git add "`"$_`"" }
        git commit -m "Batch $($batchCount): Add files"
        git push
        $batchCount++
        $currentBatchFiles = @()
        $currentBatchSize = 0
    }
}

if ($currentBatchFiles.Count -gt 0) {
    Write-Host "Processing Final Batch $batchCount ($($currentBatchFiles.Count) files, $([math]::Round($currentBatchSize/1MB, 2)) MB)"
    $currentBatchFiles | ForEach-Object { git add "`"$_`"" }
    git commit -m "Batch $($batchCount): Add files"
    git push
}

Write-Host "All batches pushed successfully!"
