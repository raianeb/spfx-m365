---
name: "spfx-extensoes-padroes"
description: "Padrões para extensões SPFx (Application Customizer, Field Customizer e Command Set): diálogos seguros, descoberta de comandos e respeito ao contexto da página host."
---

# Extensões

## Quando usar
Ao criar Application Customizers, Field Customizers ou Command Sets.

## Regras-base
- Não sequestre a experiência da página host.
- Diálogos devem ser usados com moderação e com saída clara.
- Comandos devem ser descobertos pelo usuário e respeitar o contexto da página.
- Se a extensão ler ou gravar em lista ou biblioteca, aplique também `sharepoint-dados-listas` para consultas, índices e paginação.

## Padrões internos da equipe
A definir.
