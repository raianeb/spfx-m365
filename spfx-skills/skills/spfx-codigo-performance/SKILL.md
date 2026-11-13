---
name: "spfx-codigo-performance"
description: "Código e desempenho em SPFx: classe de web part fina, acesso a dados por serviço, PnPjs, leituras em lote e cache, controle de bundle, carregamento preguiçoso e memoização."
---

# Código e performance

## Quando usar
Ao escrever lógica de dados, componentes React ou ao adicionar dependências.

## Regras-base
- A classe da web part só inicializa e repassa props; a lógica fica em componentes e serviços.
- Acesso a SharePoint sempre pelo serviço de dados da web part, com PnPjs. As regras de consulta (índices, filtros, paginação e limites) estão em `sharepoint-dados-listas`.
- Cache e leituras em lote de SharePoint seguem `sharepoint-dados-listas`.
- Carregue sob demanda e evite dependências pesadas sem necessidade.
- Use memoização ou virtualização em listas grandes.
- Não duplique React nem Fluent UI no bundle.

## Padrões internos da equipe
A definir.
