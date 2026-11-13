/*
 * wp-lista-filtro — criação de índices nos campos de filtro de uma lista.
 * Cole este arquivo no Console do navegador, com o site da lista aberto e logado. O script pede a URL do site, o nome da lista e os prefixos.
 *
 * Padrão: mode = "plan" (não altera nada; só lista o que faria).
 * Para aplicar, troque mode para "apply" e execute novamente. O script é idempotente:
 * campo já indexado fica como está. Nada é excluído e nenhum dado é alterado.
 *
 * As listas são processadas na ordem informada. Coloque a de homologação primeiro: em "apply",
 * as listas seguintes só recebem índices se as anteriores não tiverem erro nem divergência.
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
        const digitado = window.prompt(`Prefixo dos nomes das listas no ambiente ${ambiente} ${ambiente === 'HML' ? '(obrigatório)' : '(deixe vazio para nenhum)'}:`, padrao);
        if (digitado === null) throw new Error('Execução cancelada pelo usuário.');
        const valor = digitado.trim();
        if (/^[A-Za-z0-9_]*$/.test(valor)) return valor;
        window.alert('Use apenas letras sem acento, números e _.');
      }
    };
    const hml = pedir('HML', '');
    if (hml === '') throw new Error('O prefixo de HML é obrigatório: as listas de HML precisam de prefixo próprio.');
    const prod = pedir('PROD', '');
    if (hml === prod) throw new Error('Os prefixos de HML e PROD precisam ser diferentes, senão as listas colidem.');
    return { HML: hml, PROD: prod };
  };
  const siteUrl = pedirUrlSite();
  const prefixos = pedirPrefixos();

  const listaBase = pedirTexto('Nome da lista (sem prefixo):');
  const CONFIG = {
    siteUrl, // site informado ao executar
    lists: [`${prefixos.HML}${listaBase}`, `${prefixos.PROD}${listaBase}`], // HML primeiro
    fields: ['Status', 'DataEvento'], // nomes internos dos campos usados como filtro na Web Part
    mode: 'plan' // 'plan' | 'apply'
  };

  const MAX_INDEXES = 20; // limite de índices por lista no SharePoint
  const INDEXABLE = ['Text', 'Choice', 'Number', 'Currency', 'DateTime', 'Boolean', 'Integer', 'User', 'Lookup'];
  const NO_METADATA = { Accept: 'application/json;odata=nometadata', 'Content-Type': 'application/json;odata=nometadata' };
  const VERBOSE = { Accept: 'application/json;odata=verbose', 'Content-Type': 'application/json;odata=verbose' };

  const pageWeb = (window._spPageContextInfo && window._spPageContextInfo.webAbsoluteUrl) || '';
  const web = (CONFIG.siteUrl || pageWeb).replace(/\/+$/, '');
  if (!web) throw new Error('Informe CONFIG.siteUrl ou execute em uma página do site da lista.');
  const target = new URL(web);
  if (target.protocol !== 'https:' || location.origin !== target.origin) {
    throw new Error('Execute este script com o site alvo aberto no navegador (mesma origem, HTTPS).');
  }
  if (CONFIG.mode !== 'plan' && CONFIG.mode !== 'apply') throw new Error('CONFIG.mode deve ser "plan" ou "apply".');
  if (!Array.isArray(CONFIG.lists) || CONFIG.lists.length === 0) throw new Error('Informe ao menos uma lista em CONFIG.lists.');
  if (!Array.isArray(CONFIG.fields) || CONFIG.fields.length === 0) throw new Error('Informe ao menos um campo em CONFIG.fields.');
  const applying = CONFIG.mode === 'apply';

  const report = [];
  const log = (level, list, message) => {
    report.push({ nivel: level, lista: list, mensagem: message });
    console[level === 'erro' ? 'error' : 'log'](`[${list}] ${message}`);
  };
  const hasProblem = () => report.some((item) => item.nivel === 'erro' || item.nivel === 'divergente');

  const digestResponse = await fetch(`${web}/_api/contextinfo`, { method: 'POST', credentials: 'include', headers: NO_METADATA });
  if (!digestResponse.ok) throw new Error(`Não foi possível obter o token (HTTP ${digestResponse.status}).`);
  const digest = (await digestResponse.json()).FormDigestValue;

  const listUrl = (title) => `${web}/_api/web/lists/getbytitle('${encodeURIComponent(title.replace(/'/g, "''"))}')`;

  const getJson = async (url) => {
    const r = await fetch(url, { credentials: 'include', headers: NO_METADATA });
    if (r.status === 404) return undefined;
    if (!r.ok) throw new Error(`HTTP ${r.status} em ${url.split('?')[0]}`);
    return r.json();
  };

  const indexField = async (title, name) => {
    const r = await fetch(`${listUrl(title)}/fields/getbyinternalnameortitle('${encodeURIComponent(name)}')`, {
      method: 'POST',
      credentials: 'include',
      headers: { ...VERBOSE, 'X-RequestDigest': digest, 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' },
      body: JSON.stringify({ __metadata: { type: 'SP.Field' }, Indexed: true })
    });
    if (!r.ok) throw new Error(`Falha ao indexar ${name} (HTTP ${r.status}).`);
  };

  console.info(`Modo: ${CONFIG.mode.toUpperCase()} — ${applying ? 'índices serão criados' : 'nenhuma alteração será feita'} em ${web}`);

  for (const title of CONFIG.lists) {
    try {
      // Gate: uma lista só é alterada se as anteriores passaram sem erro nem divergência.
      const blocked = applying && hasProblem();
      const info = await getJson(`${listUrl(title)}?$select=ItemCount`);
      if (!info) {
        log('erro', title, 'Lista não encontrada.');
        continue;
      }
      const body = await getJson(`${listUrl(title)}/fields?$top=500&$select=InternalName,TypeAsString,Indexed,Hidden`);
      const all = body.value || [];
      const byName = new Map(all.map((f) => [f.InternalName, f]));
      let indexCount = all.filter((f) => f.Indexed).length;
      log('info', title, `${info.ItemCount} item(ns), ${indexCount} de ${MAX_INDEXES} índices em uso`);

      for (const name of CONFIG.fields) {
        try {
          const field = byName.get(name);
          if (!field) {
            log('erro', title, `Campo ${name} não existe (confira o nome interno).`);
          } else if (field.Indexed) {
            log('conforme', title, `${name} já tem índice`);
          } else if (INDEXABLE.indexOf(field.TypeAsString) === -1) {
            log('divergente', title, `${name} é do tipo ${field.TypeAsString}, que não aceita índice. Não use este campo como filtro.`);
          } else if (indexCount >= MAX_INDEXES) {
            log('divergente', title, `${name} sem índice e a lista já tem ${MAX_INDEXES} índices. Remova um índice sem uso antes.`);
          } else if (!applying) {
            log('plano', title, `Criaria o índice em ${name} (${field.TypeAsString})`);
            indexCount += 1;
          } else if (blocked) {
            log('pendente', title, `${name} sem índice: criação bloqueada porque uma lista anterior teve erro ou divergência`);
          } else {
            await indexField(title, name);
            const check = await getJson(`${listUrl(title)}/fields/getbyinternalnameortitle('${encodeURIComponent(name)}')?$select=Indexed`);
            if (!check || check.Indexed !== true) throw new Error(`Índice de ${name} não confirmado após a gravação.`);
            indexCount += 1;
            log('criado', title, `Índice criado em ${name}`);
          }
        } catch (error) {
          log('erro', title, `${name}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
        }
      }
    } catch (error) {
      log('erro', title, error instanceof Error ? error.message : 'erro desconhecido');
    }
  }

  const counts = report.reduce((acc, item) => { acc[item.nivel] = (acc[item.nivel] || 0) + 1; return acc; }, {});
  console.info('Resumo:', counts);
  console.table(report);
  return { modo: CONFIG.mode, resumo: counts, relatorio: report };
})();
