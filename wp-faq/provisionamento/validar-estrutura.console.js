/*
 * Equipe M365 — verificação somente leitura do FAQ (schema v1).
 * Cole no Console com o site alvo aberto. Não cria, altera nem exclui nada.
 *
 * Compara cada lista PROD e HML com o catálogo aprovado e com o outro ambiente.
 */
(async () => {
  const siteUrl = window.location.origin + (window.location.pathname.match(/^\/sites\/[^/]+/) || [''])[0];
  const web = siteUrl.replace(/\/+$/, '');
  const hdr = { Accept: 'application/json;odata=nometadata' };
  const ENVS = { PROD: '', HML: 'HML_' };

  const CATALOG = [
    {
      base: 'FAQ',
      template: 100,
      fields: [
        { n: 'Title', type: 'Text' },
        { n: 'Resposta', type: 'Note' },
        { n: 'Ordem', type: 'Number', idx: true }
      ]
    }
  ];

  const getJson = async (url) => {
    const r = await fetch(url, { credentials: 'include', headers: hdr });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`HTTP ${r.status} em ${url.split('?')[0]}`);
    return r.json();
  };

  /** Somente leitura: confirma se a coluna é texto com formatação. */
  const isRichText = async (title, name) => {
    const body = await getJson(`${web}/_api/web/lists/getbytitle('${encodeURIComponent(title)}')/fields/getbyinternalnameortitle('${name}')?$select=RichText`);
    return Boolean(body && body.RichText === true);
  };

  const info = (title) => getJson(`${web}/_api/web/lists/getbytitle('${encodeURIComponent(title)}')?$select=Id,BaseTemplate`);

  const fieldsOf = async (title) => {
    const body = await getJson(`${web}/_api/web/lists/getbytitle('${encodeURIComponent(title)}')/fields?$top=500&$select=InternalName,TypeAsString,Indexed,Hidden`);
    return (body.value || []).filter((x) => !x.Hidden && x.InternalName !== 'Title' && x.InternalName !== 'Attachments' && x.InternalName !== 'ContentType');
  };

  const rows = [];
  for (const entry of CATALOG) {
    const expected = entry.fields
      .flatMap((f) => [`${f.n}:${f.type}${f.idx ? ':idx' : ''}`, ...(f.richText ? [`${f.n}:RichText`] : [])])
      .sort();
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
        .map((x) => `${x.InternalName}:${x.TypeAsString}${x.Indexed ? ':idx' : ''}`);
      for (const f of entry.fields.filter((x) => x.richText)) {
        if (await isRichText(title, f.n)) sig.push(`${f.n}:RichText`);
      }
      sig.sort();
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
