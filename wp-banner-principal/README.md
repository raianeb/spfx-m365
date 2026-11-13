# wp-banner-principal

Carrossel de destaques da home, alimentado pela lista **Banner**.

## Lista de origem

- **Banner** no site `https://<tenant>.sharepoint.com/sites/<nome-do-site>`.
- Criada pelo script de provisionamento das listas da Equipe M365. As colunas e índices estão descritos abaixo.

## Stack

- SPFx 1.24.1 (toolchain Heft), React 18.3.1, TypeScript 5.8.
- Consulta via `SPHttpClient` com `$select`, `$top`, filtro e `$orderby` em colunas indexadas.
- Cache em memória de 5 minutos, deduplicação de requisições em voo e retry com `Retry-After` para 429/503.
- Sem conteúdo estático: a página mostra apenas o que estiver cadastrado e ativo na lista.

## Build

```bash
npm install
npm run build
```

O pacote fica em `sharepoint/solution/wp-banner-principal.sppkg`, pronto para o App Catalog.

## Publicação

1. Enviar o `.sppkg` ao App Catalog do tenant e confirmar a implantação.
2. Editar a página `Home.aspx`, adicionar o web part "Banner principal" e ajustar as propriedades.

## Decisões e trade-offs

- Cada web part é um projeto independente, conforme o padrão do monorepo. O serviço `SpListService.ts` é duplicado em cada projeto para não criar acoplamento de deploy entre eles. Trade-off: uma alteração no serviço precisa ser replicada nos cinco projetos.
- Campos de escolha (Choice) não são usados em filtros indexados de forma exclusiva; os índices estão em colunas de data, booleanas e de ordenação.
- O cache é de memória da página. Não há `localStorage`, porque os dados não são pessoais nem variam por usuário.

## Limitações conhecidas

- Os textos da interface estão em português diretamente no código. Não há arquivos de localização.
- O build e a publicação precisam ser validados no ambiente de origem (Node 22.x, App Catalog do tenant).
