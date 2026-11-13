---
name: "spfx-configuracao-webpart"
description: "Configurações obrigatórias de Web Parts SPFx: título, site de dados, grupos por perfil, ambiente PROD ou HML, herdar tema e exibir log. Cada uma com efeito real, persistida por instância."
---

# Configuração de Web Parts

## Quando usar
Ao criar ou revisar o painel de propriedades de uma Web Part, ou ao migrar instâncias já publicadas.

## 1. Configurações obrigatórias

| Configuração | Controle | Efeito obrigatório |
|---|---|---|
| Título | Campo de texto | Atualiza o cabeçalho sem recarregar dados. |
| Site de dados | Pesquisa com seleção única | Consultas e grupos usam o site escolhido. |
| Grupos por perfil | Pesquisa com múltipla seleção, um controle por perfil do escopo | Associa grupos SharePoint aos perfis da aplicação. |
| Ambiente | PROD ou HML | Resolve listas, bibliotecas e grupos do ambiente escolhido. |
| Herdar tema | Sim ou Não | Usa o tema do site ou os tokens próprios da solução. |
| Exibir log | Sim ou Não | Mostra o diagnóstico expansível nas telas e modais. |

Cada configuração precisa ter efeito na execução. Um campo sem efeito não atende a esta skill.

## 2. Organização do painel
- Grupo "Geral": título.
- Grupo "Dados e ambiente": site de dados e ambiente.
- Grupo "Acesso": um seletor de grupos por perfil do escopo.
- Grupo "Aparência": herdar tema.
- Grupo "Diagnóstico": exibir log.
- Use controles nativos para texto e booleanos. Para pesquisa com múltipla seleção, reutilize um controle já instalado ou um controle pequeno e específico.

## 3. Site de dados
- A pesquisa mostra nome e URL do site, para distinguir sites com nomes iguais.
- Use debounce, paginação e limite de resultados. Não liste todos os sites ao abrir a Web Part.
- Normalize URLs e remova duplicatas.
- Valide o acesso ao site escolhido antes de usá-lo como fonte de dados.
- Persista a URL normalizada e os identificadores do site e do web, com o título apenas como rótulo.
- Aceite apenas HTTPS e destinos permitidos pela arquitetura.
- Se o destino ficar indisponível, mostre o problema. Nunca troque o site em silêncio pelo site atual.

## 4. Grupos por perfil
- Os perfis vêm do escopo aprovado do projeto. Não reutilize perfis de outro projeto.
- Consulte os grupos do site de dados selecionado e persista IDs, com o título como rótulo auxiliar.
- Diferencie grupo disponível para seleção de permissão efetivamente concedida ao recurso.
- Em um perfil, pertencer a qualquer grupo selecionado satisfaz o vínculo.
- Selecionar grupos não concede permissões, não altera ACLs e não inclui usuários.
- Perfil obrigatório sem grupo válido mostra configuração pendente e não vira acesso geral.
- Ao trocar de site, invalide os vínculos anteriores. IDs podem coincidir entre conjuntos de sites e representar grupos diferentes.

## 5. Ambiente
- Persista o valor técnico `PROD` ou `HML`. Os rótulos são "PROD — Produção" e "HML — Homologação".
- O prefixo de HML e o de PROD são propriedades da instância, configuradas no painel. Nenhum prefixo fica fixo no código.
- Use uma função central para resolver nomes físicos a partir do nome base do catálogo.
- O prefixo de HML é obrigatório e precisa ser diferente do de PROD. Sem isso, a Web Part mostra configuração pendente.
- Falha em HML nunca cai em PROD.
- A troca de ambiente invalida consultas e cache, recria a sessão de acesso e recarrega os dados.
- Exiba o ambiente ativo na Web Part e no diagnóstico.

## 6. Herdar tema
- "Sim": usa o tema do site que hospeda a Web Part. Atualiza quando o tema mudar. Ver `spfx-tema-marca`.
- "Não": usa os tokens próprios da solução. Nenhum estilo herdado permanece ativo.
- Trocar esta opção atualiza só a apresentação.

## 7. Exibir log
- Ver `spfx-implementacao-base`, seção de diagnóstico, para o componente, os eventos e a redação.
- Desligar o log não refaz consultas e não oculta erros normais.

## 8. Ciclo de vida
- Trocar site ou ambiente inicia um novo contexto de dados. Consultas em andamento são descartadas quando respondem fora de ordem.
- Mudar o título, o tema ou o log não recria a sessão nem repete consultas de negócio.
- Não mantenha uma mistura de site novo com grupos antigos. Enquanto a configuração obrigatória estiver incompleta, impeça as operações dependentes.
- Não sobrescreva seleções salvas a cada renderização.
- Ao descartar a Web Part, libere controles, assinaturas, listeners e requisições pendentes.

## 9. Instâncias publicadas
- Preserve as escolhas salvas das instâncias existentes.
- Trate propriedades ausentes com migração explícita.
- Nunca troque silenciosamente o ambiente ou o site de uma Web Part publicada.

## 10. Validação
- Todas as seis configurações persistem por instância.
- Respostas fora de ordem não repõem dados de outro site ou ambiente.
- Falta de acesso e site indisponível têm comportamento definido.
- Duas instâncias na mesma página não compartilham configuração.
- Diferencie o que foi validado no código do que depende de teste no SharePoint.

## Padrões internos da equipe
Consolidados desta skill. Versão de referência do React: a do `package.json` do projeto (o repositório atual usa React 18.3).
