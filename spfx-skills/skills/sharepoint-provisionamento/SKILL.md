---
name: "sharepoint-provisionamento"
description: "Provisiona listas e bibliotecas SharePoint por script para o Console do navegador, a partir de definicao.json, com HML e PROD no mesmo site e prefixos perguntados na execução."
---

# Provisionamento SharePoint por Console

## Quando usar
Ao criar ou manter a estrutura de listas de um projeto (campos, índices e versionamento) em HML e PROD.

## Regras
1. **Script, não PowerShell.** O script roda no Console do navegador, com o site aberto e a sessão autenticada.
2. **Mesmo site para HML e PROD.** A URL é perguntada uma vez. O que muda entre os ambientes é só o prefixo do nome da lista.
3. **Prefixos perguntados na execução.** HML é obrigatório e precisa ser diferente de PROD. PROD pode ser vazio. Nenhum prefixo fica fixo no código.
4. **Uma definição para os dois ambientes.** O `definicao.json` do projeto é a fonte única. O script gerado é uma cópia dela.
5. **Nome interno antes do rótulo.** O campo nasce com o nome técnico (`InternalName`). O rótulo de exibição é aplicado depois, em um passo separado.
6. **Índice na criação.** Campos marcados com `indexado: true` recebem índice logo após a criação.
7. **Texto com formatação.** Campo `Note` com `formatacao: true` usa RichText no modo Compatible. Texto longo não é indexado.
8. **Permissões padrão.** O script não cria grupos nem níveis de permissão, e não concede acesso.
9. **Plano antes de aplicar.** `mode = "plan"` só mostra o que faria. `mode = "apply"` aplica.
10. **HML primeiro.** PROD só recebe criação se o HML não tiver erro nem divergência no mesmo relatório.
11. **Idempotente e sem exclusão.** Reexecutar não duplica nada. Nada existente é alterado ou excluído. Divergências são relatadas.
12. **Validação antes de executar.** O script rejeita nomes internos inválidos, campos repetidos, listas repetidas e tipos não suportados antes de qualquer chamada ao site.

## Tipos suportados
`Text`, `Note`, `Number`, `DateTime`, `Boolean`.

## Formato do definicao.json
Veja `templates/definicao.exemplo.json`. Cada lista tem `base`, `modelo` (100 lista, 101 biblioteca), `versionamento` e `campos`. Cada campo tem `nome` (nome interno), `rotulo`, `tipo`, e opcionalmente `nativo`, `indexado`, `linhas` e `formatacao`.

## Como gerar o script
1. Leia `definicao.json` do projeto.
2. Valide as regras acima.
3. Copie `templates/criar-estrutura.template.js` para `provisionamento/criar-estrutura.console.js` da pasta da web part.
4. Troque `@PROJETO@` pelo nome do projeto.
5. Troque `/*@CATALOGO@*/[]` pelo array `listas` do `definicao.json`, em JSON válido.
6. Rode `node --check` no arquivo gerado.

Não edite o script gerado à mão. Altere a definição e gere de novo.
