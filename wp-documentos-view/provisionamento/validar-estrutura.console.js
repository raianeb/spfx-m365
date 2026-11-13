/*
 * Equipe M365 — verificação somente leitura da biblioteca de Documentos (schema v1).
 * Cole no Console com o site alvo aberto. Não cria, altera nem exclui nada.
 *
 * Confere, em PROD e em HML, se a biblioteca existe, se é uma biblioteca de documentos (modelo 101)
 * e se a sessão atual consegue ler a raiz e listar os itens.
 */
(async () => {
  const siteUrl = window.location.origin + (window.location.pathname.match(/^\/sites\/[^/]+/) || [''])[0];
  const libraryBase = 'Documentos'; // Nome base escolhido na web part.
  const web = siteUrl.replace(/\/+$/, '');
  const hdr = { Accept: 'application/json;odata=nometadata' };
  const ENVS = { PROD: '', HML: 'HML_' };

  const getJson = async (url) => {
    const r = await fetch(url, { credentials: 'include', headers: hdr });
    if (r.status === 404) return { status: 404 };
    if (!r.ok) return { status: r.status };
    return { status: 200, body: await r.json() };
  };

  const rows = [];
  for (const [env, prefix] of Object.entries(ENVS)) {
    const title = `${prefix}${libraryBase}`;
    const meta = await getJson(`${web}/_api/web/lists/getbytitle('${encodeURIComponent(title)}')?$select=Id,BaseTemplate,ItemCount`);
    if (meta.status === 404) {
      rows.push({ ambiente: env, biblioteca: title, situacao: 'ausente' });
      continue;
    }
    if (meta.status !== 200) {
      rows.push({ ambiente: env, biblioteca: title, situacao: `erro HTTP ${meta.status} ao ler a biblioteca` });
      continue;
    }
    const template = meta.body.BaseTemplate === 101 ? 'biblioteca de documentos' : `modelo ${meta.body.BaseTemplate} (esperado 101)`;
    const root = await getJson(`${web}/_api/web/lists/getbytitle('${encodeURIComponent(title)}')/rootfolder?$select=ServerRelativeUrl`);
    const folders = root.status === 200
      ? await getJson(`${web}/_api/web/GetFolderByServerRelativePath(DecodedUrl='${encodeURIComponent(root.body.ServerRelativeUrl)}')/folders?$select=Name&$top=1000`)
      : { status: root.status };
    rows.push({
      ambiente: env,
      biblioteca: title,
      modelo: template,
      itens: meta.body.ItemCount,
      leituraDaRaiz: root.status === 200 ? 'ok' : `HTTP ${root.status}`,
      pastasNaRaiz: folders.status === 200 ? folders.body.value.length : `HTTP ${folders.status}`
    });
  }
  console.table(rows);
  return rows;
})();
