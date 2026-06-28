$ErrorActionPreference = "Stop"

$Project = "./lib"
$OutDir = "./compiled"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$Targets = @(
    @{
        GOOS = "windows"
        GOARCH = "amd64"
        CC = "x86_64-w64-mingw32-gcc"
        EXT = "lib"
    },
    @{
        GOOS = "linux"
        GOARCH = "amd64"
        CC = "x86_64-linux-gnu-gcc"
        EXT = "a"
    },
    @{
        GOOS = "linux"
        GOARCH = "arm64"
        CC = "aarch64-linux-gnu-gcc"
        EXT = "a"
    },
    @{
        GOOS = "darwin"
        GOARCH = "amd64"
        CC = "o64-clang"
        EXT = "a"
    },
    @{
        GOOS = "darwin"
        GOARCH = "arm64"
        CC = "oa64-clang"
        EXT = "a"
    }
)

foreach ($Target in $Targets) {

    $env:GOOS = $Target.GOOS
    $env:GOARCH = $Target.GOARCH
    $env:CGO_ENABLED = "1"
    $env:CC = $Target.CC

    $BaseName = "next-lxd.$($Target.GOOS)-$($Target.GOARCH)"
    $Output = Join-Path $OutDir "$BaseName.$($Target.EXT)"

    Write-Host ""
    Write-Host "==========================================="
    Write-Host "Building $BaseName"
    Write-Host "==========================================="

    & go build -trimpath -buildmode=c-archive -o $Output $Project

    if ($LASTEXITCODE -ne 0) {
        throw "Build failed for $BaseName"
    }

    $Header = [System.IO.Path]::ChangeExtension($Output, ".h")

    if (Test-Path $Header) {
        Rename-Item $Header "$BaseName.h" -Force
    }

    Write-Host "[OK] Done"
}

Write-Host ""
Write-Host "All builds completed."