param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$OutputDirectoryName = "claude-context"
)

$ErrorActionPreference = "Stop"

$projectRootPath = [System.IO.Path]::GetFullPath($ProjectRoot)
$outputRoot = Join-Path $projectRootPath $OutputDirectoryName

if (Test-Path -LiteralPath $outputRoot) {
  $resolvedOutput = [System.IO.Path]::GetFullPath($outputRoot)

  if (-not $resolvedOutput.StartsWith($projectRootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove output outside project root: $resolvedOutput"
  }

  Remove-Item -LiteralPath $resolvedOutput -Recurse -Force
}

New-Item -ItemType Directory -Path $outputRoot | Out-Null

$excludedDirectoryNames = @(
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  $OutputDirectoryName
)

$excludedExtensions = @(
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".zip",
  ".7z",
  ".rar",
  ".pdf",
  ".log",
  ".tsbuildinfo"
)

function Get-RelativeProjectPath {
  param([string]$FullName)

  $fullPath = [System.IO.Path]::GetFullPath($FullName)
  $rootWithSeparator = $projectRootPath.TrimEnd("\", "/") + [System.IO.Path]::DirectorySeparatorChar

  if (-not $fullPath.StartsWith($rootWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "File is outside project root: $fullPath"
  }

  return $fullPath.Substring($rootWithSeparator.Length).Replace("\", "/")
}

function Get-ExclusionReason {
  param([System.IO.FileInfo]$File)

  $relativePath = Get-RelativeProjectPath $File.FullName
  $segments = $relativePath.Split("/")

  foreach ($segment in $segments) {
    if ($excludedDirectoryNames -contains $segment) {
      return "Excluded directory: $segment"
    }
  }

  if ($excludedExtensions -contains $File.Extension.ToLowerInvariant()) {
    return "Excluded binary/archive/log extension: $($File.Extension.ToLowerInvariant())"
  }

  if ($File.Name -match "^\.env($|\.)") {
    return "Secret-bearing environment file"
  }

  if ($File.Name -in @("package-lock.json")) {
    return "Generated dependency lockfile"
  }

  if ($relativePath -eq "tools/build-claude-context.ps1") {
    return "Context generator itself"
  }

  return $null
}

function Get-PartName {
  param([string]$RelativePath)

  if ($RelativePath -match "^(README\.md|note\.md|Admin-neon\.md|\.gitignore|package-lock\.json)$") {
    return "01_PROJECT_OVERVIEW_AND_DOCS.txt"
  }

  if ($RelativePath -match "^(client|server)/(package\.json|README\.md|tsconfig.*\.json|vite\.config\.ts|nest-cli\.json|eslint\.config\.(js|mjs)|index\.html)$") {
    return "01_PROJECT_OVERVIEW_AND_DOCS.txt"
  }

  if ($RelativePath -match "^server/(src/.*\.spec\.ts|test/)") {
    return "05_SERVER_TESTS.txt"
  }

  if ($RelativePath -match "^server/src/(main\.ts|app\.|auth/|database/|character/)") {
    return "02_SERVER_AUTH_DATABASE_CHARACTER.txt"
  }

  if ($RelativePath -match "^server/src/game/battle/") {
    return "04_SERVER_BATTLE_SYSTEM.txt"
  }

  if ($RelativePath -match "^server/src/game/") {
    return "03_SERVER_GAME_DEFINITIONS_AND_SYSTEMS.txt"
  }

  if ($RelativePath -match "^client/src/features/(battles|inventory)/") {
    return "07_CLIENT_BATTLE_AND_INVENTORY.txt"
  }

  if ($RelativePath -match "^client/src/.*\.css$") {
    return "08_CLIENT_STYLES.txt"
  }

  if ($RelativePath -match "^client/src/") {
    return "06_CLIENT_APP_AND_FEATURES.txt"
  }

  if ($RelativePath -match "^client_demo_old/") {
    return "09_LEGACY_CLIENT_DEMO.txt"
  }

  return "10_REMAINING_PROJECT_FILES.txt"
}

function Get-Language {
  param([string]$RelativePath)

  switch ([System.IO.Path]::GetExtension($RelativePath).ToLowerInvariant()) {
    ".ts" { return "typescript" }
    ".tsx" { return "tsx" }
    ".js" { return "javascript" }
    ".mjs" { return "javascript" }
    ".json" { return "json" }
    ".css" { return "css" }
    ".html" { return "html" }
    ".md" { return "markdown" }
    ".sql" { return "sql" }
    ".svg" { return "xml" }
    default { return "text" }
  }
}

$allFiles = Get-ChildItem -LiteralPath $projectRootPath -Recurse -File -Force |
  Sort-Object FullName

$includedFiles = New-Object System.Collections.Generic.List[object]
$excludedFiles = New-Object System.Collections.Generic.List[object]
$partBuilders = @{}

foreach ($file in $allFiles) {
  $relativePath = Get-RelativeProjectPath $file.FullName

  $exclusionReason = Get-ExclusionReason $file

  if ($null -ne $exclusionReason) {
    $excludedFiles.Add([pscustomobject]@{
      Reason = $exclusionReason
      Bytes = $file.Length
    })
    continue
  }

  $partName = Get-PartName $relativePath

  if (-not $partBuilders.ContainsKey($partName)) {
    $partBuilders[$partName] = New-Object System.Text.StringBuilder
    [void]$partBuilders[$partName].AppendLine("# Magisterium source bundle")
    [void]$partBuilders[$partName].AppendLine("# Part: $partName")
    [void]$partBuilders[$partName].AppendLine("# Generated from: $projectRootPath")
    [void]$partBuilders[$partName].AppendLine()
  }

  $content = [System.IO.File]::ReadAllText($file.FullName)
  $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $language = Get-Language $relativePath
  $builder = $partBuilders[$partName]

  [void]$builder.AppendLine()
  [void]$builder.AppendLine("================================================================================")
  [void]$builder.AppendLine("FILE: $relativePath")
  [void]$builder.AppendLine("SHA256: $hash")
  [void]$builder.AppendLine("================================================================================")
  [void]$builder.AppendLine(('```' + $language))
  [void]$builder.AppendLine($content)
  [void]$builder.AppendLine('```')

  $includedFiles.Add([pscustomobject]@{
    Path = $relativePath
    Part = $partName
    Bytes = $file.Length
    Sha256 = $hash
  })
}

foreach ($partName in ($partBuilders.Keys | Sort-Object)) {
  $partPath = Join-Path $outputRoot $partName
  [System.IO.File]::WriteAllText(
    $partPath,
    $partBuilders[$partName].ToString(),
    [System.Text.UTF8Encoding]::new($false)
  )
}

$treeLines = New-Object System.Collections.Generic.List[string]
$treeLines.Add("# Included project files")
$treeLines.Add("")

foreach ($entry in ($includedFiles | Sort-Object Path)) {
  $treeLines.Add($entry.Path)
}

[System.IO.File]::WriteAllLines(
  (Join-Path $outputRoot "PROJECT_TREE.txt"),
  $treeLines,
  [System.Text.UTF8Encoding]::new($false)
)

$manifestLines = New-Object System.Collections.Generic.List[string]
$manifestLines.Add("# Magisterium Claude Context Manifest")
$manifestLines.Add("")
$manifestLines.Add("Included files: $($includedFiles.Count)")
$manifestLines.Add("Excluded files: $($excludedFiles.Count)")
$manifestLines.Add("")
$manifestLines.Add("## Included")
$manifestLines.Add("")
$manifestLines.Add("| File | Bundle part | Bytes | SHA256 |")
$manifestLines.Add("|---|---:|---:|---|")

foreach ($entry in ($includedFiles | Sort-Object Path)) {
  $manifestLines.Add("| $($entry.Path) | $($entry.Part) | $($entry.Bytes) | $($entry.Sha256) |")
}

$manifestLines.Add("")
$manifestLines.Add("## Excluded")
$manifestLines.Add("")
$manifestLines.Add("Generated dependencies/build output, logs, archives, binary images, package lockfiles, and .env files are intentionally excluded.")
$manifestLines.Add("")
$manifestLines.Add("| Category | Files | Bytes |")
$manifestLines.Add("|---|---:|---:|")

foreach ($group in ($excludedFiles | Group-Object Reason | Sort-Object Name)) {
  $totalBytes = ($group.Group | Measure-Object Bytes -Sum).Sum
  $manifestLines.Add("| $($group.Name) | $($group.Count) | $totalBytes |")
}

[System.IO.File]::WriteAllLines(
  (Join-Path $outputRoot "MANIFEST.md"),
  $manifestLines,
  [System.Text.UTF8Encoding]::new($false)
)

$instructions = @'
# How to send Magisterium to Claude Free

You do not need to copy individual source files. Upload the text files from this directory.

## Upload order

Because Claude Free has context and attachment limits, do not upload all ten source parts in one message.

### Batch 1 - architecture and backend foundations

Upload:

1. `UPLOAD_PROMPT.txt`
2. `PROJECT_TREE.txt`
3. `01_PROJECT_OVERVIEW_AND_DOCS.txt`
4. `02_SERVER_AUTH_DATABASE_CHARACTER.txt`
5. `03_SERVER_GAME_DEFINITIONS_AND_SYSTEMS.txt`

Then send:

> This is batch 1/3. Read it carefully and create a structured architecture summary as working memory. Do not propose code changes or give a final conclusion until all three batches arrive.

### Batch 2 - battle, tests, and frontend

Upload:

1. `04_SERVER_BATTLE_SYSTEM.txt`
2. `05_SERVER_TESTS.txt`
3. `06_CLIENT_APP_AND_FEATURES.txt`

Then send:

> This is batch 2/3. Integrate it with batch 1, update your working-memory summary, and map frontend/backend connections. Do not give the final conclusion until batch 3.

### Batch 3 - large UI files, CSS, legacy, and remaining files

Upload:

1. `07_CLIENT_BATTLE_AND_INVENTORY.txt`
2. `08_CLIENT_STYLES.txt`
3. `09_LEGACY_CLIENT_DEMO.txt`
4. `10_REMAINING_PROJECT_FILES.txt`
5. `MANIFEST.md`

Then send:

> This is batch 3/3. The complete source bundle has now been sent. Perform every task in UPLOAD_PROMPT.txt and use MANIFEST.md to confirm coverage.

## If Claude reports attachment or context limits

Read in this priority order:

1. Parts 01-04: current server code and architecture.
2. Parts 06-07: current frontend.
3. Part 05: tests that confirm behavior.
4. Part 08: CSS.
5. Part 09: legacy reference, not the current implementation.

If a new chat is required, ask the old chat to produce a detailed `HANDOFF SUMMARY`. Copy that summary into the new chat before uploading the remaining parts.

## Safety and scope notes

- Never upload `.env`, database URLs, tokens, or secrets.
- Image paths/imports remain visible in source, but image binaries are excluded.
- `package-lock.json` is excluded because it is large generated dependency metadata; direct dependencies remain in `package.json`.
- Logs, build output, dependencies, archives, TypeScript build metadata, and Git internals are intentionally excluded.
- Rebuild after code changes with:
  `powershell -ExecutionPolicy Bypass -File tools/build-claude-context.ps1`
'@

[System.IO.File]::WriteAllText(
  (Join-Path $outputRoot "README_FIRST.md"),
  $instructions,
  [System.Text.UTF8Encoding]::new($false)
)

$prompt = @'
You are reviewing the complete source bundle of the Magisterium project.

The bundle is being uploaded in three batches because this account has limited context. Maintain a compact but detailed working-memory summary after each batch. Do not make code changes.

Important scope rules:

- `client/` and `server/` are the current implementation.
- `client_demo_old/` is historical/reference code only.
- The root README may be outdated; prefer executable code and tests when documentation conflicts with implementation.
- Every bundled source file starts with `FILE: <relative path>` and a SHA256 hash.
- `MANIFEST.md` is the authoritative inventory of included and intentionally excluded files.
- Generated dependencies/build output, logs, archives, package lockfiles, binary images, and `.env` files were intentionally excluded.
- Do not claim a file was inspected unless its `FILE:` section was actually present in an uploaded bundle.

After all three batches are uploaded, produce:

1. A concise architecture map.
2. The complete user flow from authentication through character selection, town, exploration, battle, reward, inventory, inn, market, sanctuary, and smith.
3. Frontend state ownership and navigation.
4. Every REST API endpoint and its authorization requirements.
5. Database schema and runtime persistence behavior.
6. Character model, stats, derived-stat calculation responsibilities, currency, equipment, consumables, progression, and rank.
7. Battle lifecycle, deterministic randomness, turns, targeting, actions, monster automation, rewards, claim/rollback behavior, and persistence limitations.
8. Implemented, partial, placeholder, legacy-only, and documented-but-missing systems.
9. Duplicate contracts or likely frontend/backend drift.
10. Security, correctness, maintainability, and scaling risks, ranked by severity.
11. Test/build coverage and important untested areas.
12. Documentation that is stale or misleading.
13. A practical prioritized roadmap for the next development work.
14. A final coverage statement listing:
    - bundle parts received
    - files or areas actually inspected
    - intentionally excluded categories
    - anything you could not read because of context limits

Be explicit about uncertainty. If context limits prevent complete inspection, say exactly which bundle sections were not retained or analyzed instead of pretending the entire project was read.
'@

[System.IO.File]::WriteAllText(
  (Join-Path $outputRoot "UPLOAD_PROMPT.txt"),
  $prompt,
  [System.Text.UTF8Encoding]::new($false)
)

$summary = $includedFiles |
  Group-Object Part |
  Sort-Object Name |
  ForEach-Object {
    $path = Join-Path $outputRoot $_.Name
    [pscustomobject]@{
      Part = $_.Name
      SourceFiles = $_.Count
      BundleBytes = (Get-Item -LiteralPath $path).Length
    }
  }

$summary | Format-Table -AutoSize
Write-Output ""
Write-Output "Created Claude context bundle at: $outputRoot"
Write-Output "Included source files: $($includedFiles.Count)"
Write-Output "Excluded files: $($excludedFiles.Count)"
