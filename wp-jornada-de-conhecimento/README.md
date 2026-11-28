# wp-jornada-de-conhecimento

Web part **Jornada de Conhecimento** da Equipe M365: jornadas de treinamento por área (vídeos do YouTube, vídeos da biblioteca, documentos e links), com progresso individual, acompanhamento por gestor, estúdio com aprovação e administração das áreas.

- Escopo aprovado: `docs/escopo.md`
- Definição de dados: `provisionamento/definicao.json` (fonte única)
- Provisionamento: `provisionamento/INSTRUCOES.md`
- Roteiro de teste ponta a ponta: `docs/roteiro-teste.md`
- Protótipo aprovado da interface: `prototipo/index.html`
- Pacote pronto para o Catálogo de Aplicativos: `pacote/wp-jornada-de-conhecimento.sppkg` (versão 1.1.0.0)

## Interface (versão 1.1)

Padrão visual GTI (skill `spfx-padrao-visual-gti`), modo B: a web part fica numa página de site que já usa o `ex-layout-sharepoint`, então **não tem cabeçalho próprio**. As telas trocam dentro da web part por uma barra compacta: Início, Catálogo, Meu aprendizado, Estúdio, Gestão da área e Administração (cada uma conforme o perfil). A rota vai para o endereço (`#jc/catalogo`, `#jc/jornada/<área>/<jornada>`), o que permite link direto e o botão Voltar do navegador. `Ctrl+K` abre a busca rápida por telas, jornadas e etapas.

Se o cabeçalho fixo do site cobrir a barra da web part ao rolar, ajuste a variável CSS `--pi-sticky-top` (altura do cabeçalho) na página.

## Compilar

```bash
npm install
npm run build
```

O pacote é gerado em `sharepoint/solution/wp-jornada-de-conhecimento.sppkg` (não versionado). A cópia publicada para teste fica em `pacote/`.
