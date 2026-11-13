/*
 * Equipe M365 — verificação somente leitura do Banner principal (schema v1).
 * Cole no Console com o site alvo aberto. O script pede a URL do site e os prefixos das listas. Não cria, altera nem exclui nada.
 *
 * Compara cada recurso PROD e HML com o catálogo aprovado e com o outro ambiente.
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

  const web = siteUrl.replace(/\/+$/, '');
  const hdr = { Accept: 'application/json;odata=nometadata' };
  const ENVS = { PROD: prefixos.PROD, HML: prefixos.HML };

  // Deve refletir o catálogo de criar-estrutura.console.js.
  const CATALOG = [
    {
      base: 'Banner',
      template: 100,
      fields: [
        { n: 'DataPublicacao', type: 'DateTime', idx: true },
        { n: 'DataExpiracao', type: 'DateTime', idx: true },
        { n: 'Link', type: 'URL' },
        { n: 'ImagemCaminho', type: 'Text' },
        { n: 'Ordem', type: 'Number', idx: true }
      ]
    },
    { base: 'Banner', template: 101, fields: [] }
  ];

  const getJson = async (url) => {
    const r = await fetch(url, { credentials: 'include', headers: hdr });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`HTTP ${r.status} em ${url.split('?')[0]}`);
    return r.json();
  };

  const info = (title) => getJson(`${web}/_api/web/lists/getbytitle('${encodeURIComponent(title)}')?$select=Id,BaseTemplate`);

  const fieldsOf = async (title) => {
    const body = await getJson(`${web}/_api/web/lists/getbytitle('${encodeURIComponent(title)}')/fields?$top=500&$select=InternalName,TypeAsString,Indexed,Hidden`);
    return (body.value || []).filter((x) => !x.Hidden && x.InternalName !== 'Title' && x.InternalName !== 'Attachments' && x.InternalName !== 'ContentType');
  };

  const rows = [];
  for (const entry of CATALOG) {
    const expected = entry.fields.map((f) => `${f.n}:${f.type}${f.idx ? ':idx' : ''}`).sort();
    const signatures = {};
    const status = {};
    for (const [env, prefix] of Object.entries(ENVS)) {
      const title = `${prefix}${entry.base}`;
      const meta = await info(title);
      if (!meta) {
        status[env] = 'ausente';
        continue;
      }
      if (meta.BaseTemplate !== entry.template) {
        status[env] = `modelo ${meta.BaseTemplate} (esperado ${entry.template})`;
        continue;
      }
      const sig = (await fieldsOf(title))
        .map((x) => `${x.InternalName}:${x.TypeAsString}${x.Indexed ? ':idx' : ''}`)
        .sort();
      signatures[env] = sig;
      const missing = expected.filter((x) => !sig.includes(x));
      const extra = sig.filter((x) => !expected.includes(x));
      status[env] = missing.length || extra.length
        ? `diferente | faltando: ${missing.join(' ') || '-'} | extras: ${extra.join(' ') || '-'}`
        : 'conforme ao catálogo';
    }

    let parity = 'não comparável';
    if (signatures.PROD && signatures.HML) {
      const onlyProd = signatures.PROD.filter((x) => !signatures.HML.includes(x));
      const onlyHml = signatures.HML.filter((x) => !signatures.PROD.includes(x));
      parity = onlyProd.length || onlyHml.length ? `divergente (somente PROD: ${onlyProd.join(' ') || '-'} | somente HML: ${onlyHml.join(' ') || '-'})` : 'paridade estrutural';
    }

    rows.push({ recurso: entry.base, PROD: status.PROD, HML: status.HML, paridade: parity });
  }

  console.table(rows);
  return rows;
})();
