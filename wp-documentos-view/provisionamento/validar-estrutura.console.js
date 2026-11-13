/*
 * Equipe M365 — verificação somente leitura da biblioteca de Documentos (schema v1).
 * Cole no Console com o site alvo aberto. O script pede a URL do site e os prefixos das listas. Não cria, altera nem exclui nada.
 *
 * Confere, em PROD e em HML, se a biblioteca existe, se é uma biblioteca de documentos (modelo 101)
 * e se a sessão atual consegue ler a raiz e listar os itens.
 */
(async () => {
  // ---- Entradas pedidas ao executar: nenhuma URL ou prefixo fixo no script ----
  const pedirUrlSite = () => {
    const padrao = window.location.origin + (window.location.pathname.match(/^\/sites\/[^/]+/) || [''])[0];
    for (;;) {
      const digitado = window.prompt('URL do site de destino (ex.: https://tenant.sharepoint.com/sites/nome-do-site):', padrao);
      if (digitado === null) throw new Error('Execução cancelada pelo usuário.');
      try {
        const url = new URL(digitado.trim());
        if (url.protocol !== 'https:') throw new Error('A URL precisa começar com https://');
        return url.origin + url.pathname.replace(/\/+$/, '');
      } catch (erro) {
        window.alert(`URL inválida: ${erro.message}`);
      }
    }
  };
  const pedirTexto = (rotulo, padrao = '') => {
    for (;;) {
      const digitado = window.prompt(rotulo, padrao);
      if (digitado === null) throw new Error('Execução cancelada pelo usuário.');
      const valor = digitado.trim();
      if (valor) return valor;
      window.alert('Informe um valor.');
    }
  };
  const pedirPrefixos = () => {
    const pedir = (ambiente, padrao) => {
      for (;;) {
        const digitado = window.prompt(`Prefixo dos nomes das listas no ambiente ${ambiente} (deixe vazio para nenhum):`, padrao);
        if (digitado === null) throw new Error('Execução cancelada pelo usuário.');
        const valor = digitado.trim();
        if (/^[A-Za-z0-9_]*$/.test(valor)) return valor;
        window.alert('Use apenas letras sem acento, números e _.');
      }
    };
    const hml = pedir('HML', 'HML_');
    const prod = pedir('PROD', '');
    if (hml === prod) throw new Error('Os prefixos de HML e PROD precisam ser diferentes, senão as listas colidem.');
    return { HML: hml, PROD: prod };
  };
  const siteUrl = pedirUrlSite();
  const prefixos = pedirPrefixos();

  const libraryBase = 'Documentos'; // Nome base escolhido na web part.
  const web = siteUrl.replace(/\/+$/, '');
  const hdr = { Accept: 'application/json;odata=nometadata' };
  const ENVS = { PROD: prefixos.PROD, HML: prefixos.HML };

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
