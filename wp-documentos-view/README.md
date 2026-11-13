# wp-documentos-view

Web Part SPFx para navegar em pastas e abrir documentos de uma biblioteca do Espaço PUC Carreiras.

## Uso
- Pastas abrem na própria WP, com o caminho clicável no topo.
- Arquivos abrem em nova aba (Office no visualizador do SharePoint).
- O ícone de compartilhamento copia o link direto do item.
- A busca filtra a pasta aberta. Grade de ícones ou lista.

## Configurações
- Site de dados, título, grupos de Administradores e ambiente (HML/PROD), como nas demais WPs.
- Biblioteca de documentos (escolhida após o site de dados).
- Visualização inicial: Grade de ícones ou Lista.

## Provisionamento
Esta WP não cria estruturas. Veja `provisionamento/INSTRUCOES.md` e `provisionamento/arquitetura-aprovada.md`.

## Build
    npm install
    npm run build

O pacote gerado fica em `sharepoint/solution/wp-documentos-view.sppkg`.
