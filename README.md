# spfx-m365

Web Parts SPFx da **Equipe M365**, organizadas em um monorepo. Cada pasta de primeiro nível é um projeto SPFx independente, com seu próprio `package.json`, configuração e pacote de solução.

As Web Parts são genéricas: não estão vinculadas a um site específico. O site de dados, as listas e o ambiente (HML/PROD) são escolhidos na configuração de cada Web Part, então elas podem ser usadas em outros sites e espaços.

## Projetos

| Pasta | Web Part | Descrição |
|---|---|---|
| `wp-banner-principal/` | Banner principal | Carrossel de banners, alimentado pela lista `Banner`. |
| `wp-calendario/` | Calendário | Visualização de dia, semana e mês, com template de miniatura e template completo. Integra com Microsoft Graph. *Veja a seção "Status".* |
| `wp-comunicados/` | Comunicados | Lista de comunicados em ordem de data, com categorias, "Ver mais" e "Carregar mais". Administradores criam, editam e excluem comunicados e categorias. |
| `wp-documentos-view/` | Documentos | Navegação em pastas e abertura de documentos de uma biblioteca, com busca, grade ou lista e link direto por item. Segue a `REGRA_VOLUME.md`. |
| `wp-faq/` | Perguntas Frequentes | FAQ em acordeão, com ordenação configurável, busca, link direto por pergunta e sugestão de novas perguntas via Power Automate. |
| `wp-lista-filtro/` | Lista com filtros | Web Part genérica para filtrar e exibir qualquer lista do SharePoint, sem código. Filtro e paginação no servidor, preparada para listas com 100 mil itens ou mais. |

## Status

- Os cinco projetos com código compilam e geram o pacote (`npm run build`), verificados com Node 22.
- `wp-calendario`: a agenda do Microsoft 365 (`AgendaMicrosoft.tsx`) compila, mas ainda não é renderizada pela Web Part. A Web Part usa `Calendario.tsx`. Falta decidir se a agenda entra na Web Part ou se é removida.

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

O pacote de implantação `.sppkg` é gerado em `sharepoint/solution/` e **não é versionado**. Para publicar, envie o `.sppkg` gerado ao App Catalog.

## Provisionamento das listas

Projetos que dependem de listas do SharePoint têm uma pasta `provisionamento/` com:

- `INSTRUCOES.md`: passo a passo de execução.
- `arquitetura*.md`: modelo de dados e decisões.
- Scripts `*.console.js` para criar e validar listas, índices e estrutura. Eles são executados no Console do navegador, com o site de destino aberto e logado, e usam o site aberto como alvo.

Leia o `INSTRUCOES.md` do projeto antes de executar qualquer script, principalmente em produção.

## Convenções

- Stack: SPFx 1.24, React 18, TypeScript 5.8, Fluent UI.
- Estrutura típica de cada Web Part: `config/` (configuração SPFx), `src/core/` (base comum, configuração e diagnóstico), `src/services/` (acesso às listas) e `src/webparts/` (componentes). Os projetos que administram itens também trazem `src/crud/` (modais de administração).
- Site de dados, ambiente (HML/PROD) e grupos de Administradores seguem o mesmo padrão em todas as Web Parts.
