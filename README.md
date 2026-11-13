# spfx-m365

Web Parts SPFx do **Espaço PUC Carreiras** (SharePoint Online / Microsoft 365), organizadas em um monorepo: cada pasta de primeiro nível é um projeto SPFx independente, com seu próprio `package.json`, configuração e pacote de solução.

## Projetos

| Pasta | Web Part | Descrição |
|---|---|---|
| `wp-banner-principal/` | Banner principal | Carrossel de destaques da home, alimentado pela lista *Carreiras - Destaques*. |
| `wp-calendario/` | Calendário | Calendário do Espaço PUC Carreiras com visualização de dia, semana e mês, template de miniatura e template completo. Integra com Microsoft Graph. |
| `wp-comunicados/` | Comunicados | Lista de comunicados em ordem de data, com categorias, "Ver mais" e "Carregar mais". Administradores criam, editam e excluem comunicados e categorias. |
| `wp-documentos-view/` | Documentos | Navegação em pastas e abertura de documentos de uma biblioteca, com busca, grade ou lista e link direto por item. Segue a `REGRA_VOLUME.md`. |
| `wp-faq/` | Perguntas Frequentes | FAQ em acordeão, com ordenação configurável, busca, link direto por pergunta e sugestão de novas perguntas via Power Automate. |
| `wp-lista-filtro/` | Lista com filtros | Web Part genérica para filtrar e exibir qualquer lista do SharePoint, sem código. Filtro e paginação no servidor, preparada para listas com 100 mil itens ou mais. |

## Pré-requisitos

- Node.js **22.14+**, **24** ou **26** (conforme o `engines` de cada `package.json`).
- npm.
- Acesso ao tenant para implantar o pacote no App Catalog.

## Como compilar

Cada projeto é compilado separadamente. Dentro da pasta do projeto:

```bash
cd wp-faq
npm install
npm run build
```

Scripts disponíveis em todos os projetos: `build`, `start` (servidor de desenvolvimento), `clean` e `eject-webpack`.

O pacote de implantação `.sppkg` é gerado em `sharepoint/solution/` e **não é versionado** (ver `.gitignore`). Para publicar, envie o `.sppkg` gerado ao App Catalog.

## Provisionamento das listas

Cada projeto que depende de listas do SharePoint tem uma pasta `provisionamento/` com:

- `INSTRUCOES.md`: passo a passo de execução.
- `arquitetura*.md`: modelo de dados e decisões aprovadas.
- Scripts `*.console.js` para criar e validar listas, índices e estrutura, executados no Console do navegador.

Leia o `INSTRUCOES.md` do projeto antes de executar qualquer script, principalmente em produção.

## Convenções

- Stack: SPFx 1.24, React 18, TypeScript 5.8, Fluent UI.
- Cada Web Part traz `config/`, `src/core/` (base comum, configuração e diagnóstico), `src/crud/` (modais de administração) e `src/services/` (acesso às listas).
- Configurações de site de dados, ambiente (HML/PROD) e grupo de administradores seguem o mesmo padrão em todas as Web Parts.

## Dados sensíveis

Nenhum projeto deste repositório deve conter credenciais, tokens ou chaves. Configurações de ambiente são informadas pelo usuário na própria Web Part, não gravadas no código.
