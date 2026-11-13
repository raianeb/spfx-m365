# Fontes e adaptação

## Base de referência (etapa 1)
Modelo de organização de skills para SPFx publicado em **SP Knowledge** (março de 2026):
https://spknowledge.com/2026/03/09/building-premium-spfx-web-parts-with-an-enterprise-skills-pack/

O que foi adotado da referência:
- pasta `skills/`, com um `SKILL.md` por skill (frontmatter com `name` e `description`);
- uma skill hub que roteia a tarefa e carrega só as skills necessárias;
- as 14 skills de SPFx (13 de conteúdo e 1 hub), com o mesmo recorte de responsabilidade;
- regras por área: arquitetura, performance, acessibilidade, tema, estilos, painel de propriedades, extensões e release;
- prática de citar as skills aplicadas em código, PR e plano.

O que foi adaptado:
- conteúdo e nomes traduzidos para português do Brasil;
- nomes de skill em kebab-case, sem acentos;
- as regras atuais são só a base do artigo: cada skill tem a seção "Padrões internos da equipe", ainda vazia.

Lacunas da referência, a tratar nas próximas etapas: testes e segurança não têm skill própria.

## Próxima etapa
Incluir os comportamentos e padrões internos da equipe em cada skill, na seção "Padrões internos da equipe".
