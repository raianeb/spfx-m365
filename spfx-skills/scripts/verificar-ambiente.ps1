#requires -Version 5.1
<#
.SYNOPSIS
  Verifica as ferramentas locais de desenvolvimento SPFx contra docs/versoes-referencia.md.

.DESCRIPTION
  Somente leitura: não instala nem altera nada na máquina.
  Cada comando roda com a entrada padrão fechada (evita perguntas interativas, como a do Yeoman)
  e com tempo limite (evita travar por proxy ou registro npm indisponível).

  Status por item:
    OK          versão esperada
    ACEITA      funciona, mas não é a recomendada (não bloqueia)
    AVISO       item recomendado ausente ou fora da versão (não bloqueia)
    AUSENTE     item obrigatório não encontrado (bloqueia)
    DIVERGENTE  item obrigatório fora da versão aceita (bloqueia)
    ERRO        item obrigatório não respondeu ou não informou versão (bloqueia)

  Códigos de saída: 0 = pronto; 1 = há itens bloqueantes; 2 = erro ao ler a referência.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File spfx-skills\scripts\verificar-ambiente.ps1

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File spfx-skills\scripts\verificar-ambiente.ps1 -Json
#>
[CmdletBinding()]
param(
    [string] $Referencia = (Join-Path $PSScriptRoot '..\docs\versoes-referencia.md'),
    [string] $Guia = 'spfx-skills/docs/configurar-ambiente.md',
    [ValidateRange(1, 300)]
    [int] $TimeoutSegundos = 20,
    [switch] $Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:EmWindows = if ($PSVersionTable.PSEdition -eq 'Desktop') { $true } else { [bool](Get-Variable -Name IsWindows -ValueOnly -ErrorAction SilentlyContinue) }
$script:StatusBloqueantes = @('AUSENTE', 'DIVERGENTE', 'ERRO')

function Read-Referencia {
    param([string] $Caminho)
    if (-not (Test-Path -LiteralPath $Caminho)) { throw "Referência não encontrada: $Caminho" }
    $texto = Get-Content -LiteralPath $Caminho -Raw -Encoding UTF8
    $bloco = [regex]::Match($texto, '(?s)```json\s*(\{.*?\})\s*```')
    if (-not $bloco.Success) { throw "Bloco json não encontrado em $Caminho" }
    try { $dados = $bloco.Groups[1].Value | ConvertFrom-Json }
    catch { throw "Bloco json inválido em ${Caminho}: $($_.Exception.Message)" }
    foreach ($campo in @('spfx', 'node', 'ferramentas', 'pacotesGlobais')) {
        if (-not (Test-Propriedade $dados $campo)) { throw "Campo '$campo' ausente no bloco json de $Caminho" }
    }
    return $dados
}

function Test-Propriedade {
    <# Seguro com Set-StrictMode e com objetos vazios ({}), em que listar os nomes das propriedades falharia. #>
    param($Objeto, [string] $Nome)
    if ($null -eq $Objeto) { return $false }
    return ($null -ne $Objeto.PSObject.Properties[$Nome])
}

function ConvertTo-Versao {
    param([string] $Texto)
    if ([string]::IsNullOrWhiteSpace($Texto)) { return $null }
    $m = [regex]::Match($Texto, '\d+\.\d+\.\d+')
    if ($m.Success) { return [version] $m.Value }
    return $null
}

function Test-Comando {
    param([string] $Comando)
    return [bool](Get-Command -Name $Comando -CommandType Application -ErrorAction SilentlyContinue)
}

function Invoke-ComandoLimitado {
    <# Executa um comando externo com stdin fechado e tempo limite. Retorna @{ Saida; Expirou; Codigo }. #>
    param([string] $Comando, [string[]] $Argumentos)

    $info = New-Object System.Diagnostics.ProcessStartInfo
    $argumentosTexto = ($Argumentos -join ' ')
    if ($script:EmWindows) {
        # cmd.exe resolve shims .cmd (npm, yo, heft) pelo PATHEXT
        $info.FileName = 'cmd.exe'
        $info.Arguments = "/d /c $Comando $argumentosTexto"
    } else {
        $info.FileName = (Get-Command -Name $Comando -CommandType Application | Select-Object -First 1).Source
        $info.Arguments = $argumentosTexto
    }
    $info.UseShellExecute = $false
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.CreateNoWindow = $true

    $processo = [System.Diagnostics.Process]::Start($info)
    try {
        $processo.StandardInput.Close()
        $tarefaSaida = $processo.StandardOutput.ReadToEndAsync()
        $tarefaErro = $processo.StandardError.ReadToEndAsync()

        if (-not $processo.WaitForExit($TimeoutSegundos * 1000)) {
            Stop-ArvoreProcesso $processo
            return @{ Saida = ''; Expirou = $true; Codigo = -1 }
        }
        $processo.WaitForExit()
        return @{ Saida = ($tarefaSaida.Result + "`n" + $tarefaErro.Result); Expirou = $false; Codigo = $processo.ExitCode }
    } finally {
        $processo.Dispose()
    }
}

function Stop-ArvoreProcesso {
    param([System.Diagnostics.Process] $Processo)
    try {
        if ($script:EmWindows) { & taskkill.exe /T /F /PID $Processo.Id 2>&1 | Out-Null }
        elseif ($Processo.GetType().GetMethod('Kill', [type[]] @([bool]))) { $Processo.Kill($true) }  # .NET Core 3+: encerra a árvore
        else { $Processo.Kill() }
    } catch { }
}

function Get-VersaoComando {
    param([string] $Comando, [string[]] $Argumentos)
    if (-not (Test-Comando $Comando)) { return @{ Encontrado = $false; Versao = $null; Expirou = $false } }
    $r = Invoke-ComandoLimitado -Comando $Comando -Argumentos $Argumentos
    return @{ Encontrado = $true; Versao = (ConvertTo-Versao $r.Saida); Expirou = $r.Expirou }
}

function Get-VersaoPacoteGlobal {
    param([string] $Pacote)
    if (-not (Test-Comando 'npm')) { return @{ Versao = $null; Expirou = $false } }
    $r = Invoke-ComandoLimitado -Comando 'npm' -Argumentos @('ls', '-g', $Pacote, '--depth=0', '--json')
    if ($r.Expirou) { return @{ Versao = $null; Expirou = $true } }
    $inicio = $r.Saida.IndexOf('{')
    if ($inicio -lt 0) { return @{ Versao = $null; Expirou = $false } }
    try { $dados = $r.Saida.Substring($inicio) | ConvertFrom-Json }
    catch { return @{ Versao = $null; Expirou = $false } }
    if (-not (Test-Propriedade $dados 'dependencies')) { return @{ Versao = $null; Expirou = $false } }
    $dep = $dados.dependencies.PSObject.Properties[$Pacote]
    if ($null -eq $dep -or -not (Test-Propriedade $dep.Value 'version')) { return @{ Versao = $null; Expirou = $false } }
    return @{ Versao = (ConvertTo-Versao $dep.Value.version); Expirou = $false }
}

function Get-StatusFalha {
    param([bool] $Obrigatorio, [string] $Falha)
    if ($Obrigatorio) { return $Falha }
    return 'AVISO'
}

function New-Resultado {
    param([string] $Item, $Encontrada, [string] $Esperada, [string] $Status, [string] $Detalhe, [string] $Ancora, [bool] $Obrigatorio)
    $textoEncontrada = '-'
    if ($null -ne $Encontrada) { $textoEncontrada = $Encontrada.ToString() }
    return [pscustomobject]@{
        Item        = $Item
        Encontrada  = $textoEncontrada
        Esperada    = $Esperada
        Status      = $Status
        Detalhe     = $Detalhe
        Obrigatorio = $Obrigatorio
        Guia        = "$Guia#$Ancora"
    }
}

function Format-Tabela {
    <# Tabela em texto puro, independente do host (Format-Table -AutoSize pode sair vazio em execução não interativa). #>
    param($Linhas, [string[]] $Colunas)
    $larguras = @{}
    foreach ($c in $Colunas) {
        $larguras[$c] = $c.Length
        foreach ($l in $Linhas) { $t = [string] $l.$c; if ($t.Length -gt $larguras[$c]) { $larguras[$c] = $t.Length } }
    }
    $sb = New-Object System.Text.StringBuilder
    [void] $sb.AppendLine((($Colunas | ForEach-Object { $_.PadRight($larguras[$_]) }) -join '  ').TrimEnd())
    [void] $sb.AppendLine((($Colunas | ForEach-Object { '-' * $larguras[$_] }) -join '  '))
    foreach ($l in $Linhas) {
        [void] $sb.AppendLine((($Colunas | ForEach-Object { ([string] $l.$_).PadRight($larguras[$_]) }) -join '  ').TrimEnd())
    }
    return $sb.ToString()
}

# ---------------------------------------------------------------------------
try { $ref = Read-Referencia $Referencia }
catch {
    if ($Json) { [pscustomobject]@{ pronto = $false; erro = $_.Exception.Message } | ConvertTo-Json }
    else { Write-Host "Erro na referência: $($_.Exception.Message)" -ForegroundColor Red }
    exit 2
}

$resultados = New-Object System.Collections.Generic.List[object]

# Node.js: linha aceita, versão mínima da linha e linha recomendada
$linhas = @($ref.node.linhas)
$esperadaNode = "$($ref.node.recomendada).x (aceitas: " + (($linhas | ForEach-Object { "$($_.minima)+" }) -join ', ') + ')'
$node = Get-VersaoComando -Comando 'node' -Argumentos @('-v')
$detalheNode = ''
if (-not $node.Encontrado) { $statusNode = 'AUSENTE'; $detalheNode = 'node não encontrado no PATH' }
elseif ($node.Expirou) { $statusNode = 'ERRO'; $detalheNode = "não respondeu em $TimeoutSegundos s" }
elseif ($null -eq $node.Versao) { $statusNode = 'ERRO'; $detalheNode = 'versão não identificada' }
else {
    $linha = $linhas | Where-Object { [int] $_.major -eq $node.Versao.Major } | Select-Object -First 1
    if ($null -eq $linha) { $statusNode = 'DIVERGENTE'; $detalheNode = "linha $($node.Versao.Major) não suportada" }
    elseif ($node.Versao -lt [version] $linha.minima) { $statusNode = 'DIVERGENTE'; $detalheNode = "mínimo da linha $($linha.major): $($linha.minima)" }
    elseif ($node.Versao.Major -eq [int] $ref.node.recomendada) { $statusNode = 'OK' }
    else { $statusNode = 'ACEITA'; $detalheNode = "recomendada: linha $($ref.node.recomendada)" }
}
$resultados.Add((New-Resultado -Item 'Node.js' -Encontrada $node.Versao -Esperada $esperadaNode -Status $statusNode -Detalhe $detalheNode -Ancora 'node' -Obrigatorio $true))

# Ferramentas de linha de comando: presença e versão mínima opcional
foreach ($f in @($ref.ferramentas)) {
    $obrig = [bool] $f.obrigatorio
    $esperada = 'presente'
    if ($f.minima) { $esperada = ">= $($f.minima)" }
    $v = Get-VersaoComando -Comando $f.comando -Argumentos @($f.argumentos)
    $detalhe = ''
    if (-not $v.Encontrado) { $status = Get-StatusFalha $obrig 'AUSENTE'; $detalhe = "$($f.comando) não encontrado no PATH" }
    elseif ($v.Expirou) { $status = Get-StatusFalha $obrig 'ERRO'; $detalhe = "não respondeu em $TimeoutSegundos s" }
    elseif ($null -eq $v.Versao) {
        if ($f.minima) { $status = Get-StatusFalha $obrig 'ERRO'; $detalhe = 'versão não identificada' }
        else { $status = 'OK'; $detalhe = 'presente; versão não identificada' }
    }
    elseif ($f.minima -and $v.Versao -lt [version] $f.minima) { $status = Get-StatusFalha $obrig 'DIVERGENTE'; $detalhe = "mínimo: $($f.minima)" }
    else { $status = 'OK' }
    $resultados.Add((New-Resultado -Item $f.item -Encontrada $v.Versao -Esperada $esperada -Status $status -Detalhe $detalhe -Ancora $f.guia -Obrigatorio $obrig))
}

# Pacotes npm globais: versão exata
foreach ($p in @($ref.pacotesGlobais)) {
    $obrig = [bool] $p.obrigatorio
    $v = Get-VersaoPacoteGlobal -Pacote $p.pacote
    $detalhe = ''
    if ($v.Expirou) { $status = Get-StatusFalha $obrig 'ERRO'; $detalhe = "npm não respondeu em $TimeoutSegundos s" }
    elseif ($null -eq $v.Versao) { $status = Get-StatusFalha $obrig 'AUSENTE'; $detalhe = "$($p.pacote) não instalado globalmente" }
    elseif ($v.Versao -ne [version] $p.exata) { $status = Get-StatusFalha $obrig 'DIVERGENTE'; $detalhe = "esperada exatamente $($p.exata)" }
    else { $status = 'OK' }
    $resultados.Add((New-Resultado -Item $p.item -Encontrada $v.Versao -Esperada $p.exata -Status $status -Detalhe $detalhe -Ancora $p.guia -Obrigatorio $obrig))
}

$bloqueantes = @($resultados | Where-Object { $script:StatusBloqueantes -contains $_.Status })
$pronto = ($bloqueantes.Count -eq 0)

if ($Json) {
    [pscustomobject]@{ pronto = $pronto; spfx = $ref.spfx; itens = $resultados.ToArray() } | ConvertTo-Json -Depth 4
} else {
    Write-Host (Format-Tabela $resultados @('Item', 'Encontrada', 'Esperada', 'Status', 'Detalhe'))
    if ($pronto) {
        Write-Host "Ambiente pronto para SPFx $($ref.spfx)." -ForegroundColor Green
    } else {
        Write-Host 'Corrija os itens abaixo e rode a verificação de novo:' -ForegroundColor Yellow
        $bloqueantes | ForEach-Object { Write-Host " - $($_.Item): $($_.Guia)" }
    }
}

if ($pronto) { exit 0 } else { exit 1 }
