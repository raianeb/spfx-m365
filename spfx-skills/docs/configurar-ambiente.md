# Configurar o ambiente de desenvolvimento

Guia para deixar a máquina nas versões de `docs/versoes-referencia.md`. O `/iniciar-projeto` aponta para a seção certa quando a verificação encontra algo ausente ou fora da versão.

Regras gerais:
- Use um terminal **normal** (sem "Executar como administrador"), exceto onde este guia disser o contrário. Pastas criadas como administrador causam o erro *dubious ownership* do Git.
- Depois de instalar qualquer item, **feche e reabra o terminal** (e o VS Code, se o terminal for o integrado) para o PATH ser atualizado.
- O Claude não instala nada sozinho: você executa os comandos e pede para verificar de novo.

## Verificar o ambiente

Na raiz do repositório:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File spfx-skills\scripts\verificar-ambiente.ps1
```

| Status | Significado | Bloqueia? |
|---|---|---|
| `OK` | Versão esperada | Não |
| `ACEITA` | Funciona, mas não é a recomendada (ex.: Node 22) | Não |
| `AVISO` | Item recomendado ausente (ex.: Heft global) | Não |
| `AUSENTE` | Item obrigatório não encontrado | Sim |
| `DIVERGENTE` | Item obrigatório fora da versão aceita | Sim |
| `ERRO` | Item obrigatório não respondeu ou não informou a versão | Sim |

`-ExecutionPolicy Bypass` vale só para essa execução e não muda a política da máquina.

Ordem de correção: Node.js → Git → Yeoman e gerador → Heft. Os itens npm (Yeoman, gerador, Heft) dependem do Node.

<a id="node"></a>
## Node.js e npm

O npm vem junto com o Node. Versão recomendada: **Node 26 LTS**. Aceitas: 22.14.0 ou superior na linha 22, 24.x e 26.x.

Escolha uma forma de instalar:

| Forma | Quando usar | Atenção |
|---|---|---|
| **nvm-windows** (recomendada) | Você mantém projetos em versões diferentes do SPFx | Cada versão do Node tem seu próprio npm e suas ferramentas globais: ao trocar de versão, reinstale Yeoman, gerador e Heft |
| Instalador oficial | Você só trabalha com projetos deste repositório | Só uma versão do Node na máquina |

### Opção A — nvm-windows

1. Se houver um Node instalado pelo instalador oficial, desinstale-o em **Configurações → Aplicativos** (o nvm não convive bem com ele).
2. Instale o nvm-windows:
   ```powershell
   winget install CoreyButler.NVMforWindows
   ```
3. Feche e reabra o terminal.
4. Instale e ative o Node 26:
   ```powershell
   nvm install 26
   nvm use 26
   ```
   O `nvm use` pode exigir um terminal **como administrador** para criar o atalho do Node. Se aparecer erro de permissão, rode **só** esse comando num terminal elevado e volte ao terminal normal.
5. Confira:
   ```powershell
   node -v
   npm -v
   ```
6. Reinstale as ferramentas globais desta versão: seção [Yeoman, gerador SPFx e Heft](#yo).

### Opção B — instalador oficial

1. Instale o Node 26 LTS:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
   Confira se o LTS instalado é da linha 26 com `node -v`. Se não for, baixe o instalador da linha 26 em <https://nodejs.org>.
2. Feche e reabra o terminal e confira com `node -v`.

<a id="git"></a>
## Git

Versão mínima: 2.35.2.

```powershell
winget install Git.Git
```

Feche e reabra o terminal e confira com `git --version`.

Se aparecer `fatal: detected dubious ownership`, a pasta do repositório foi criada como administrador. Libere só essa pasta:

```powershell
git config --global --add safe.directory C:/Projetos/git/spfx-m365
```

Não use `safe.directory '*'`: ele desliga a proteção para qualquer pasta.

<a id="yo"></a>
<a id="gerador"></a>
<a id="heft"></a>
## Yeoman, gerador SPFx e Heft

Os três são pacotes npm globais. Instale a versão fixa do gerador, nunca `@latest`:

```powershell
npm install @rushstack/heft yo @microsoft/generator-sharepoint@1.24.1 --global
```

Gerador em outra versão (status `DIVERGENTE`):

```powershell
npm uninstall @microsoft/generator-sharepoint --global
npm install @microsoft/generator-sharepoint@1.24.1 --global
```

Confira:

```powershell
yo --version
heft --version
npm ls -g @microsoft/generator-sharepoint --depth=0
```

Na primeira execução, o Yeoman pode perguntar se pode coletar estatísticas de uso. Responda e siga; a verificação automática não é afetada.

O Heft global é recomendado, não obrigatório: os projetos usam o Heft instalado em cada projeto pelo `npm install`.

<a id="registro-npm"></a>
## Erro E404 ou de registro ao instalar pacotes npm

Sintoma: `npm error 404 Not Found` com uma URL que não é `registry.npmjs.org` (por exemplo, um feed do Azure Artifacts).

Causa provável: o `.npmrc` aponta para um registro privado ou está mal formatado.

1. Veja qual registro está em uso:
   ```powershell
   npm config get registry
   ```
2. Se não for `https://registry.npmjs.org/` e você **não** usa um feed privado de propósito:
   ```powershell
   npm config set registry https://registry.npmjs.org/
   npm cache clean --force
   ```
3. Se a equipe usa um feed privado de propósito, não altere o registro: peça a configuração do `.npmrc` à liderança técnica.

## Testes do script de verificação

Quem alterar `scripts/verificar-ambiente.ps1` ou o bloco de dados de `docs/versoes-referencia.md` roda os testes antes do PR:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File spfx-skills\scripts\testes\verificar-ambiente.testes.ps1
```

Os testes usam comandos simulados e não dependem do que está instalado na máquina.

## Fontes
- [Configurar o ambiente de desenvolvimento do SPFx](https://learn.microsoft.com/sharepoint/dev/spfx/set-up-your-development-environment)
- [Desenvolvimento em equipe no SPFx (Node, npm e gerenciadores de versão)](https://learn.microsoft.com/sharepoint/dev/spfx/team-based-development-on-sharepoint-framework)
- [Erro E404 ao instalar o gerador SPFx (Microsoft Q&A)](https://learn.microsoft.com/answers/a/12580597)
