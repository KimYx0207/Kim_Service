[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Project", "User")]
    [string]$Scope,

    [string]$ProjectRoot,

    [switch]$Apply,

    [switch]$Rollback
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$installer = Join-Path $scriptDir "scripts\install.py"

if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) {
    throw "Installer core not found: $installer"
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command python3 -ErrorAction SilentlyContinue
}
if (-not $python) {
    throw "Python 3 is required. This installer never installs Python or Semgrep automatically."
}

$arguments = @($installer, "--scope", $Scope.ToLowerInvariant())
if ($ProjectRoot) {
    $arguments += @("--project-root", $ProjectRoot)
}
if ($Apply) {
    $arguments += "--apply"
}
if ($Rollback) {
    $arguments += "--rollback"
}

& $python.Source @arguments
exit $LASTEXITCODE
