---
name: "sharepoint-dados-listas"
description: "Regras de dados SharePoint: modelagem de listas, índices, consultas com filtro, ordenação e paginação, e limites de 5.000 e 20.000 itens. Alimenta o provisionamento e o código de web parts e extensões."
---

# Dados de listas SharePoint

## Quando usar
Ao modelar uma lista ou biblioteca, escrever uma consulta SharePoint em código de web part ou extensão, ou gerar o `definicao.json` de um projeto.

## Papel desta skill
Esta é a fonte de verdade das regras de dados. A skill `sharepoint-provisionamento` usa estas regras para gerar os scripts de Console. A skill `spfx-codigo-performance` cuida da estrutura do código, mas as consultas que esse código faz seguem as regras daqui.

## 1. Modelagem
- Cada coluna tem nome interno técnico (sem acento, sem espaço, começando por letra) e rótulo de exibição. O nome interno é definido na criação e não muda depois. O rótulo pode mudar.
- Escolha o tipo da coluna pelo dado, não pelo que é mais fácil de preencher. Use `Number`, `DateTime` e `Boolean` quando o dado for esse tipo.
- Use pesquisa (lookup) para relacionar com outra lista, não texto repetido. Cada lookup adiciona uma junção à consulta. Nas versões on-premises há um limite de junções por consulta, em torno de 12. Confirme na versão de destino.
- Texto longo com formatação não é indexável. Não planeje filtro sobre ele.
- Versionamento ativo nas listas que precisam de histórico. Quando ativado, cada alteração gera uma versão.

## 2. Limites e índices
- O limite de exibição é de 5.000 itens por operação de consulta. O limite vale para cada consulta ou visualização, não para o tamanho total da lista. Listas com mais itens funcionam, desde que a consulta seja filtrada em colunas indexadas.
- Filtro, ordenação e agrupamento devem usar coluna indexada quando a lista puder passar de 5.000 itens.
- Adicionar ou remover índice tem limite próprio, de 20.000 itens por padrão.
- No SharePoint Online o limite não pode ser alterado pelo administrador. Nas versões on-premises, ele pode ser configurado. Sempre informe a versão de destino ao planejar.
- Uma consulta REST que filtra por coluna não indexada pode falhar mesmo quando o resultado tem poucos itens, porque o SharePoint percorre a lista antes de filtrar.

## 3. Consultas
- Sempre use `select` com os campos necessários. Nunca carregue todas as colunas.
- Sempre use `top` e siga a paginação quando o serviço devolver próxima página. Nunca tente buscar a lista inteira de uma vez.
- Filtre em colunas indexadas. Se o filtro depender de coluna não indexada, pare e proponha um índice no `definicao.json`.
- Ordene por coluna indexada ou pelo ID.
- Não concatene valores do usuário diretamente no filtro. Escape aspas simples.

## 4. Onde a consulta é escrita
- **Código de web part e extensão:** use o serviço de dados do projeto, com PnPjs. Não monte URLs REST inline.
- **Script de Console de provisionamento:** não tem PnPjs. Use REST, com `$select`, `$filter` e `$top`, e siga a paginação do próprio retorno.

## 5. Cache e leitura em lote
- Cache só para dado estável, com tempo de vida definido.
- Agrupe leituras que vão para a mesma lista na mesma renderização.
- Não repita a mesma consulta a cada tecla digitada. Use atraso ou aplicação explícita.

## 6. Ambientes
- Nenhum nome de lista é fixo. O prefixo de HML e o de PROD são configurações da web part e são perguntados pelo script.
- Uma mesma definição vale para os dois ambientes. Só o prefixo muda.

## 7. Permissões
Esta skill não define permissões. Ao modelar, avise quando uma coluna contiver dado pessoal ou sensível, para que a permissão seja tratada na etapa de provisionamento, com níveis padrão do SharePoint.

## 8. Checklist de revisão
Antes de gerar o `definicao.json`, use `templates/checklist-modelagem.md`.
