# Roteiro de brainstorming

Objetivo: definir o escopo do projeto com decisões objetivas, antes de qualquer código. Conduzir uma etapa por vez. Não avançar sem resposta essencial.

## Etapa 1 — Problema e resultado
1. Qual problema o projeto resolve? Quem sente esse problema hoje?
2. Como é resolvido hoje (processo manual, planilha, sistema legado, nada)?
3. Qual resultado concreto indica que o projeto deu certo? (métrica ou comportamento observável)

## Etapa 2 — Usuários e perfis
4. Quais perfis usam a solução? Quantas pessoas, aproximadamente?
5. Quais perfis administram ou aprovam? Quem decide mudanças?

## Etapa 3 — Escopo funcional
6. Liste as funcionalidades obrigatórias para a primeira entrega (máximo 5).
7. O que fica explicitamente fora desta entrega?
8. Há prazo ou data de corte? Qual?

## Etapa 4 — Dados e integrações
9. Onde os dados vivem hoje? (listas, bibliotecas, banco, sistema externo, planilha)
10. O dado é criado, editado ou só consultado pela solução?
11. Há integração com outro sistema, API ou serviço (Microsoft Graph, Power Automate, sistema corporativo)?
12. Há dados pessoais ou sensíveis? Há regra de retenção ou LGPD a considerar?

## Etapa 5 — Plataforma e tecnologia
13. Onde a solução será usada? (SharePoint Online, SharePoint 2013/2019 on-premises, Teams, outro)
14. Qual solução técnica se encaixa melhor? Apresente as opções relevantes com trade-offs, por exemplo:
    - Web part SPFx: experiência rica na página, exige build e deploy de pacote.
    - Power Automate: automação e integração sem build, menos controle de UI.
    - Solução mista: SPFx para interface e Power Automate para processo.
15. Há restrições de licenciamento ou de política de TI?

## Etapa 6 — Operação
16. Quem mantém a solução depois da entrega?
17. Há ambientes separados (homologação e produção)? Como serão feitos a criação de listas e o deploy?
18. Quais riscos você enxerga? Para cada um, como validar?

## Fechamento
Resuma as decisões e os pontos em aberto. Peça confirmação antes de gerar o escopo.
