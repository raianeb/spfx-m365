# Jornada de Conhecimento — roteiro de teste ponta a ponta (HML)

Use quatro contas: **Admin** (Controle Total no site), **Gestor**, **Apoio** e **Usuário**. Teste sempre em HML (prefixo `HML_`).
Cada passo indica o item "Em aberto" do escopo (`docs/escopo.md`, seção 7) que ele valida.

## 1. Preparação (Admin)
1. Rodar `provisionamento/criar-estrutura.console.js` (prefixo HML `HML_`, PROD vazio) e conferir `HML_JornadaAreas`.
2. Implantar o `.sppkg`, adicionar a web part numa página e escolher **Ambiente = HML**.
3. Aba **Administração** > **Preparar o site**: conferir o grupo `HML_Jornadas – Administradores` com Controle Total.
4. Propriedades da web part > Acesso > Administradores — HML: selecionar o grupo. Recarregar.

## 2. Área (Admin)
1. **Nova área**: nome "Teste", sigla `TST`, Gestor = conta Gestor. Acompanhar os passos até **Ativa**.
2. Conferir no SharePoint:
   - grupos `HML_Jornadas – TST – Gestores | Apoio | Usuários` e seus proprietários;
   - listas `HML_TST_*` e biblioteca `HML_TST_Conteudos`, com permissões próprias (Gestores: Design em Jornadas, Editar em Matrículas e Avaliações);
   - Jornadas com aprovação de conteúdo; Matrículas "ler e editar só os próprios"; Curtidas e Avaliações "editar só os próprios" — **item 11**;
   - item da área em `HML_JornadaAreas` visível só aos grupos da área.
3. **Reprocessar** uma área já ativa (forçar Status Erro na lista) e conferir que nada duplica.

## 3. Pessoas (Gestor)
1. **Gestão da Área > Pessoas**: incluir a conta Apoio em Equipe de apoio e a conta Usuário em Usuários.
2. Incluir um grupo do Entra ID pequeno em Usuários e conferir no Painel que as pessoas dele aparecem.

## 4. Criação e aprovação (Apoio → Gestor)
1. Apoio > **Estúdio** > **Nova jornada** com 4 etapas: YouTube (percentual 80%), vídeo MP4 da biblioteca, PDF ou DOCX da biblioteca, link. Prazo 1 dia.
2. **Pré-visualizar**; **Enviar para publicação**.
3. Usuário: a jornada **não** aparece em Minhas Jornadas.
4. Gestor > **Aprovações**: **Devolver** com comentário; Apoio vê "Devolvida" e o comentário. Reenviar.
5. Gestor > **Publicar** — **itens 2 e 12**. Usuário passa a ver a jornada.

## 5. Consumo (Usuário)
1. Card com etapas, duração e prazo; **Começar**.
2. YouTube: assistir parte, sair da página, voltar: retoma do ponto — **item 5**. Concluir só com 80% assistido.
3. Vídeo da biblioteca (MP4 grande) e documento embutido — **item 5**. Link: abrir libera Concluir.
4. Ordem: etapa seguinte bloqueada até concluir a anterior.
5. Curtir e descurtir; contador atualiza na hora.
6. Com metade concluída, **Avaliações** libera; ao concluir tudo, a tela de conclusão abre a avaliação.
7. Voltar: card com 100% em **Concluídas**; números do topo e Continuar de onde parei corretos.

## 6. Gestão (Gestor)
1. Painel: adesão, conclusão média, atrasados (após o prazo de 1 dia), horas e nota.
2. Mapa de calor: clicar numa célula e conferir o detalhe etapa a etapa. Gestor lê matrículas de outras pessoas — **item 1**.
3. **Exportar (CSV)** e abrir no Excel — **item 7**.
4. **Lembrar atrasados** — **item 13**.
5. **Comentários**: ocultar um; o Usuário autor vê o aviso, os demais não veem o comentário.
6. Estúdio: conclusão por jornada e curtidas por etapa no editor.

## 7. Segurança (qualquer conta)
1. Usuário de outra área não vê a área TST nem lê `HML_TST_*` pela API (`/_api/web/lists/getByTitle('HML_TST_Matriculas')/items`).
2. Usuário lê só a própria matrícula pela API.
3. Apoio não vê o rascunho de outra pessoa do Apoio.

## 8. Volume — itens 4 e 5
Simular a área Geral com um grupo grande do Entra ID e conferir o tempo do Painel e das notas nos cards (diagnóstico da web part mostra os tempos).
