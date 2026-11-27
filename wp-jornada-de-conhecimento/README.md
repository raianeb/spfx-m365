# wp-jornada-de-conhecimento

Web part **Jornada de Conhecimento** da Equipe M365: jornadas de treinamento por área (vídeos do YouTube, vídeos da biblioteca, documentos e links), com progresso individual, acompanhamento por gestor, estúdio com aprovação e administração das áreas.

- Escopo aprovado: `docs/escopo.md`
- Definição de dados: `provisionamento/definicao.json` (fonte única)
- Provisionamento: `provisionamento/INSTRUCOES.md`

## Compilar

```bash
npm install
npm run build
```

O pacote é gerado em `sharepoint/solution/wp-jornada-de-conhecimento.sppkg` (não versionado).
