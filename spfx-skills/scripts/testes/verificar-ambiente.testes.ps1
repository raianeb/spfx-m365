#requires -Version 5.1
<#
.SYNOPSIS
  Testes do verificar-ambiente.ps1 com comandos simulados (sem depender do que está instalado na máquina).

.DESCRIPTION
  Cada cenário cria, numa pasta temporária, versões falsas de node, npm, git, yo e heft,
  roda o script com somente essa pasta no PATH e confere o status de cada item e o código de saída.
  Funciona no Windows (arquivos .cmd) e no Linux/macOS (scripts sh). Sem dependência de Pester.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File spfx-skills\scripts\testes\verificar-ambiente.testes.ps1
#>
[CmdletBinding()]
param(
    [string] $Script = (Join-Path $PSScriptRoot '..\verificar-ambiente.ps1'),
    [string] $Referencia = (Join-Path $PSScriptRoot '..\..\docs\versoes-referencia.md')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$EmWindows = if ($PSVersionTable.PSEdition -eq 'Desktop') { $true } else { [bool](Get-Variable -Name IsWindows -ValueOnly -ErrorAction SilentlyContinue) }
$Utf8SemBom = New-Object System.Text.UTF8Encoding $false
$Timeout = 3
$Falhas = New-Object System.Collections.Generic.List[string]
$Total = 0

function Get-JsonNpm {
    param([string] $VersaoGerador)
    if (-not $VersaoGerador) { return '{}' }
    return '{"dependencies":{"@microsoft/generator-sharepoint":{"version":"' + $VersaoGerador + '"}}}'
}

function New-Falso {
    <# Cria um comando falso. $Linhas = linhas impressas; -Trava = não termina; -LeEntrada = lê stdin antes (simula pergunta interativa). #>
    param([string] $Pasta, [string] $Nome, [string[]] $Linhas, [switch] $Trava, [switch] $LeEntrada, [string] $JsonLs)
    if ($EmWindows) {
        $corpo = @('@echo off')
        if ($LeEntrada) { $corpo += 'set /p resposta=' }
        if ($JsonLs) { $corpo += ('if "%~1"=="ls" ( echo ' + $JsonLs + ' & exit /b 0 )') }
        if ($Trava) { $corpo += 'ping -n 60 127.0.0.1 >nul' }
        foreach ($l in $Linhas) { $corpo += "echo $l" }
        [System.IO.File]::WriteAllText((Join-Path $Pasta "$Nome.cmd"), (($corpo -join "`r`n") + "`r`n"), $Utf8SemBom)
    } else {
        $corpo = @('#!/bin/sh')
        if ($LeEntrada) { $corpo += 'read resposta' }
        if ($JsonLs) { $corpo += ('if [ "$1" = "ls" ]; then echo ''' + $JsonLs + '''; exit 0; fi') }
        if ($Trava) { $corpo += '/bin/sleep 60' }
        foreach ($l in $Linhas) { $corpo += "echo '$l'" }
        $caminho = Join-Path $Pasta $Nome
        [System.IO.File]::WriteAllText($caminho, (($corpo -join "`n") + "`n"), $Utf8SemBom)
        & chmod +x $caminho
    }
}

function Get-AmbientePadrao {
    <# Ambiente completo e correto. Cada cenário altera só o que precisa. #>
    return [ordered]@{
        node = @{ Linhas = @('v26.1.0') }
        npm  = @{ Linhas = @('10.9.0'); JsonLs = (Get-JsonNpm '1.24.1') }
        git  = @{ Linhas = @('git version 2.45.1.windows.1') }
        yo   = @{ Linhas = @('5.1.0'); LeEntrada = $true }
        heft = @{ Linhas = @('@rushstack/heft 1.3.2') }
    }
}

function Invoke-Cenario {
    param([string] $Nome, $Ambiente, [string] $Ref = $Referencia)
    $pasta = Join-Path ([System.IO.Path]::GetTempPath()) ("verif-amb-" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $pasta | Out-Null
    $pathOriginal = $env:PATH
    try {
        foreach ($nomeCmd in $Ambiente.Keys) {
            $def = $Ambiente[$nomeCmd]
            if ($null -eq $def) { continue }
            $p = @{ Pasta = $pasta; Nome = $nomeCmd; Linhas = @($def.Linhas) }
            if ($def.ContainsKey('Trava') -and $def.Trava) { $p.Trava = $true }
            if ($def.ContainsKey('LeEntrada') -and $def.LeEntrada) { $p.LeEntrada = $true }
            if ($def.ContainsKey('JsonLs')) { $p.JsonLs = $def.JsonLs }
            New-Falso @p
        }
        if ($EmWindows) { $env:PATH = "$pasta;$env:SystemRoot\System32" } else { $env:PATH = $pasta }

        $relogio = [System.Diagnostics.Stopwatch]::StartNew()
        $saida = & $Script -Referencia $Ref -TimeoutSegundos $Timeout -Json | Out-String
        $codigo = $LASTEXITCODE
        $relogio.Stop()

        $dados = $null
        try { $dados = $saida | ConvertFrom-Json } catch { }
        return @{ Nome = $Nome; Codigo = $codigo; Dados = $dados; Segundos = $relogio.Elapsed.TotalSeconds; Saida = $saida }
    } finally {
        $env:PATH = $pathOriginal
        Remove-Item -LiteralPath $pasta -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Assert-Igual {
    param([string] $Cenario, [string] $O, $Esperado, $Obtido)
    $script:Total++
    if ("$Esperado" -ne "$Obtido") { $script:Falhas.Add("[$Cenario] $O : esperado '$Esperado', obtido '$Obtido'") }
}

function Assert-Status {
    param($R, [hashtable] $Esperados, [int] $Codigo, [bool] $Pronto)
    Assert-Igual $R.Nome 'código de saída' $Codigo $R.Codigo
    if ($null -eq $R.Dados) { $script:Total++; $script:Falhas.Add("[$($R.Nome)] saída não é JSON: $($R.Saida)"); return }
    Assert-Igual $R.Nome 'pronto' $Pronto $R.Dados.pronto
    foreach ($item in $Esperados.Keys) {
        $achado = @($R.Dados.itens | Where-Object { $_.Item -eq $item }) | Select-Object -First 1
        $status = if ($achado) { $achado.Status } else { '(item não listado)' }
        Assert-Igual $R.Nome "status de $item" $Esperados[$item] $status
    }
}

function Write-Cenario { param($R) Write-Host ("  {0,-38} saída={1}  {2:N1}s" -f $R.Nome, $R.Codigo, $R.Segundos) }

Write-Host "Testando $Script"
Write-Host "Referência: $Referencia"
Write-Host ''

$tudoOk = @{ 'Node.js' = 'OK'; 'npm' = 'OK'; 'Git' = 'OK'; 'Yeoman (yo)' = 'OK'; 'Heft CLI (global)' = 'OK'; 'Gerador SPFx' = 'OK' }

# 1. Ambiente completo; yo lê stdin (simula pergunta de estatística) e não pode travar
$r = Invoke-Cenario 'tudo-ok' (Get-AmbientePadrao); Write-Cenario $r
Assert-Status $r $tudoOk 0 $true
$script:Total++; if ($r.Segundos -ge $Timeout) { $Falhas.Add("[tudo-ok] demorou $($r.Segundos)s: algum comando esperou entrada") }

# 2. Node 22 dentro do mínimo: aceita, não bloqueia
$a = Get-AmbientePadrao; $a.node = @{ Linhas = @('v22.14.0') }
$r = Invoke-Cenario 'node-22-aceita' $a; Write-Cenario $r
Assert-Status $r @{ 'Node.js' = 'ACEITA' } 0 $true

# 3. Node 22 abaixo do mínimo da linha
$a = Get-AmbientePadrao; $a.node = @{ Linhas = @('v22.11.0') }
$r = Invoke-Cenario 'node-22-abaixo-minimo' $a; Write-Cenario $r
Assert-Status $r @{ 'Node.js' = 'DIVERGENTE' } 1 $false

# 4. Node 20: linha não suportada
$a = Get-AmbientePadrao; $a.node = @{ Linhas = @('v20.18.0') }
$r = Invoke-Cenario 'node-20-nao-suportado' $a; Write-Cenario $r
Assert-Status $r @{ 'Node.js' = 'DIVERGENTE' } 1 $false

# 5. Node e npm ausentes: gerador também aparece como ausente
$a = Get-AmbientePadrao; $a.node = $null; $a.npm = $null
$r = Invoke-Cenario 'node-npm-ausentes' $a; Write-Cenario $r
Assert-Status $r @{ 'Node.js' = 'AUSENTE'; 'npm' = 'AUSENTE'; 'Gerador SPFx' = 'AUSENTE' } 1 $false

# 6. Gerador não instalado
$a = Get-AmbientePadrao; $a.npm = @{ Linhas = @('10.9.0'); JsonLs = (Get-JsonNpm '') }
$r = Invoke-Cenario 'gerador-ausente' $a; Write-Cenario $r
Assert-Status $r @{ 'Gerador SPFx' = 'AUSENTE' } 1 $false

# 7. Gerador em outra versão
$a = Get-AmbientePadrao; $a.npm = @{ Linhas = @('10.9.0'); JsonLs = (Get-JsonNpm '1.22.0') }
$r = Invoke-Cenario 'gerador-divergente' $a; Write-Cenario $r
Assert-Status $r @{ 'Gerador SPFx' = 'DIVERGENTE' } 1 $false

# 8. Heft global ausente: só aviso
$a = Get-AmbientePadrao; $a.heft = $null
$r = Invoke-Cenario 'heft-ausente-aviso' $a; Write-Cenario $r
Assert-Status $r @{ 'Heft CLI (global)' = 'AVISO' } 0 $true

# 9. Git abaixo do mínimo
$a = Get-AmbientePadrao; $a.git = @{ Linhas = @('git version 2.30.0') }
$r = Invoke-Cenario 'git-antigo' $a; Write-Cenario $r
Assert-Status $r @{ 'Git' = 'DIVERGENTE' } 1 $false

# 10. Versão fora da primeira linha (aviso antes da versão)
$a = Get-AmbientePadrao; $a.git = @{ Linhas = @('warning: configuracao antiga', 'git version 2.45.1') }
$r = Invoke-Cenario 'versao-na-segunda-linha' $a; Write-Cenario $r
Assert-Status $r @{ 'Git' = 'OK' } 0 $true

# 11. Comando travado: tempo limite, sem travar o script
$a = Get-AmbientePadrao; $a.yo = @{ Linhas = @('5.1.0'); Trava = $true }
$r = Invoke-Cenario 'yo-travado-timeout' $a; Write-Cenario $r
Assert-Status $r @{ 'Yeoman (yo)' = 'ERRO' } 1 $false
$script:Total++; if ($r.Segundos -gt ($Timeout + 10)) { $Falhas.Add("[yo-travado-timeout] demorou $($r.Segundos)s: o tempo limite não interrompeu") }

# 12. Referência sem bloco json
$refRuim = Join-Path ([System.IO.Path]::GetTempPath()) ("ref-" + [guid]::NewGuid().ToString('N') + '.md')
[System.IO.File]::WriteAllText($refRuim, "# Sem dados`n", $Utf8SemBom)
$r = Invoke-Cenario 'referencia-sem-json' (Get-AmbientePadrao) $refRuim; Write-Cenario $r
Assert-Igual $r.Nome 'código de saída' 2 $r.Codigo

# 13. Referência com json inválido
[System.IO.File]::WriteAllText($refRuim, "# Ruim`n``````json`n{ ""spfx"": `n``````n", $Utf8SemBom)
$r = Invoke-Cenario 'referencia-json-invalido' (Get-AmbientePadrao) $refRuim; Write-Cenario $r
Assert-Igual $r.Nome 'código de saída' 2 $r.Codigo
Remove-Item -LiteralPath $refRuim -Force -ErrorAction SilentlyContinue

# 14. Referência inexistente
$r = Invoke-Cenario 'referencia-inexistente' (Get-AmbientePadrao) (Join-Path ([System.IO.Path]::GetTempPath()) 'nao-existe.md'); Write-Cenario $r
Assert-Igual $r.Nome 'código de saída' 2 $r.Codigo

Write-Host ''
if ($Falhas.Count -eq 0) {
    Write-Host "OK: $Total verificações, 0 falhas." -ForegroundColor Green
    exit 0
}
Write-Host "FALHOU: $($Falhas.Count) de $Total verificações." -ForegroundColor Red
$Falhas | ForEach-Object { Write-Host " - $_" }
exit 1
