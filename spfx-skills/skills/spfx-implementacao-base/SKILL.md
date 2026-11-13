---
name: "spfx-implementacao-base"
description: "Arquitetura de implementação em SPFx: limites entre serviços e componentes, contratos tipados para dados e props, e comportamento previsível de carregamento e erro."
---

# Implementação base

## Quando usar
Ao definir a estrutura de serviços, modelos de dados e propriedades.

## Regras-base
- Separe serviços (dados), modelos (tipos) e componentes (apresentação).
- Tipe dados e props com interfaces explícitas.
- Estados de carregamento e erro são tratados de forma uniforme.

## Padrões internos da equipe
- Diagnóstico com um componente compartilhado (`DiagnosticsPanel`), recolhido por padrão e visível somente com "Exibir log" ligado.
- O painel mostra instância, tela, ambiente, operação, recurso lógico, resultado, duração e erros. Não mostra registros completos nem respostas HTTP brutas.
- Logger por instância, com buffer de 200 eventos mais recentes em memória.
- Erros da aplicação passam pelo logger, que encaminha a mensagem tratada também para o console.
- Não sobrescreva globalmente `console` nem `fetch`. Instrumente a camada de dados e os pontos de erro da solução.
- Redija tokens, cookies, request digest, cabeçalhos de autenticação, URLs com segredos e dados pessoais antes de armazenar ou exibir.
- Não persista o diagnóstico em lista, biblioteca ou armazenamento do navegador sem necessidade definida no projeto.
- Desligar o log não refaz consultas nem oculta erros normais.
- Na troca de site ou ambiente, comece um novo contexto e limpe o buffer anterior.
- Origem: skill pessoal de configuração de Web Parts (seção de diagnóstico).
