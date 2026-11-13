# wp-comunicados

Web part de comunicados do Espaço PUC Carreiras (SharePoint Online, SPFx 1.24.1).

- Lista de comunicados em ordem de data, com cartões, "Ver mais" e "Carregar mais".
- Administradores criam, editam e excluem comunicados e categorias.
- Categorias ficam em lista auxiliar; o comunicado guarda o Id da categoria (sem Lookup).
- Exclusão de categoria em uso é bloqueada pela própria WP.

Provisionamento das listas: pasta `provisionamento/` (ver `INSTRUCOES.md`).

Build: `npm install` e `npm run build`. O pacote fica em `sharepoint/solution/wp-comunicados.sppkg`, pronto para o App Catalog.
