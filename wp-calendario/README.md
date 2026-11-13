# wp-calendario

Web Part SPFx de calendário da Equipe M365, com visualização de dia, semana e mês, template de miniatura e template completo.

## Configurações
- Site de dados, título, grupos de Administradores e ambiente (HML/PROD), conforme o padrão das Web Parts do projeto.
- Lista de calendário: escolhida após o site de dados.
- Template: Miniatura de calendário (mês compacto; clique no dia abre os detalhes em modal) ou Calendário completo.
- Visualização inicial (calendário completo): Dia, Semana ou Mês.

## Provisionamento
Veja `provisionamento/INSTRUCOES.md`. A arquitetura está em `provisionamento/arquitetura-aprovada.md` e aguarda validação.

## Build
    npm install
    npm run build

O pacote gerado fica em `sharepoint/solution/wp-calendario.sppkg`.
