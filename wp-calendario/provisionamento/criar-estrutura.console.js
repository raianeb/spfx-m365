/*
 * Equipe M365 — provisionamento do Calendário (schema v1, PROPOSTA PARA VALIDAÇÃO)
 * Cole este arquivo no Console do navegador com o site de destino aberto e logado. O script pede a URL do site e os prefixos das listas.
 * Não execute em apply antes da validação de arquitetura-aprovada.md.
 *
 * Padrão: mode = "plan" (não altera nada; só lista o que faria).
 * Para aplicar, troque mode para "apply" e execute novamente. O script é idempotente:
 * reexecutar não duplica listas nem campos.
 *
 * Ordem em "apply": HML primeiro. PROD só é criado se createInProd = true e o HML não tiver
 * nenhum erro nem divergência no mesmo relatório. Nada existente é alterado ou excluído.
 * Não cria grupos nem concede permissões (ver arquitetura-aprovada.md, seção Acesso).
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

  const CONFIG = {
    siteUrl,
    mode: 'plan', // 'plan' | 'apply'
    createInProd: true, // em 'apply', cria também em PROD, somente se o HML estiver sem erro ou divergência
    schemaVersion: 1
  };

  // Catálogo único. PROD usa o nome base; HML recebe o prefixo HML_.
  // template: 100 = Lista genérica. versioning: false (eventos não são versionados).
  // native: campo que já existe (Title, usado como Assunto) — apenas o rótulo é ajustado.
  // Índices: DataInicio e DataFim, que formam o filtro de período (DataInicio < fim e DataFim > início).
  // Tipo é escolha simples (sem Lookup); Local, Organizador e Descricao não são indexados (não são filtros).
  // Dia inteiro é booleano com padrão Não.
  const CATALOG = [
    {
      base: 'Calendario',
      kind: 'Lista',
      template: 100,
      versioning: false,
      fields: [
        { n: 'Title', t: 'Assunto', type: 'Text', native: true },
        { n: 'Local', t: 'Local', type: 'Text' },
        { n: 'DataInicio', t: 'Início', type: 'DateTime', idx: true },
        { n: 'DataFim', t: 'Término', type: 'DateTime', idx: true },
        { n: 'DiaInteiro', t: 'Dia inteiro', type: 'Boolean', def: 0 },
        { n: 'Descricao', t: 'Descrição', type: 'Note', numLines: 6 },
        { n: 'Organizador', t: 'Organizador', type: 'Text' },
        {
          n: 'Tipo', t: 'Tipo', type: 'Choice', format: 'Dropdown',
          choices: ['Reunião', 'Evento', 'Treinamento', 'Lembrete']
        },
        // ID do evento replicado no grupo/equipe Microsoft 365 (texto de até 255 caracteres). Sem índice.
        { n: 'IdEventoMicrosoft', t: 'ID evento Microsoft', type: 'Text' }
      ]
    }
  ];

  // HML vem primeiro: a validação de HML decide se PROD pode ser criado.
  const ENVIRONMENTS = { HML: prefixos.HML, PROD: prefixos.PROD };
  const NO_METADATA = { Accept: 'application/json;odata=nometadata', 'Content-Type': 'application/json;odata=nometadata' };
  const VERBOSE = { Accept: 'application/json;odata=verbose', 'Content-Type': 'application/json;odata=verbose' };
  const web = CONFIG.siteUrl.replace(/\/+$/, '');
  const report = [];
  const log = (level, env, message) => {
    report.push({ nivel: level, ambiente: env, mensagem: message });
    console[level === 'erro' ? 'error' : 'log'](`[${env}] ${message}`);
  };

  // Salvaguardas: mesma origem da página, HTTPS e modo válido.
  const target = new URL(CONFIG.siteUrl);
  if (target.protocol !== 'https:' || location.origin !== target.origin) {
    throw new Error('Execute este script com o site alvo aberto no navegador (mesma origem, HTTPS).');
  }
  if (CONFIG.mode !== 'plan' && CONFIG.mode !== 'apply') {
    throw new Error('CONFIG.mode deve ser "plan" ou "apply".');
  }
  const applying = CONFIG.mode === 'apply';

  // Gate: PROD só recebe criação se HML estiver limpo no relatório desta execução.
  const hmlIsClean = () => !report.some((item) => item.ambiente === 'HML' && (item.nivel === 'erro' || item.nivel === 'divergente'));
  const canWrite = (envName) => {
    if (!applying) return false;
    if (envName === 'HML') return true;
    return CONFIG.createInProd === true && hmlIsClean();
  };

  const digestResponse = await fetch(`${web}/_api/contextinfo`, { method: 'POST', credentials: 'include', headers: NO_METADATA });
  if (!digestResponse.ok) throw new Error(`Não foi possível obter o token (HTTP ${digestResponse.status}).`);
  const digestBody = await digestResponse.json();
  const digest = digestBody.FormDigestValue || (digestBody.d && digestBody.d.GetContextWebInformation.FormDigestValue);

  const call = async (url, options = {}) => {
    const headers = { ...(options.verbose ? VERBOSE : NO_METADATA), ...(options.headers || {}) };
    if (options.write) headers['X-RequestDigest'] = digest;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      return await fetch(url, { method: options.method || 'GET', credentials: 'include', headers, body: options.body, signal: controller.signal });
    } catch (error) {
      const reason = error instanceof Error && error.name === 'AbortError' ? 'tempo limite de 20s excedido' : (error instanceof Error ? error.message : 'falha de rede');
      throw new Error(`${options.method || 'GET'} ${url.split('?')[0]}: ${reason}`);
    } finally {
      clearTimeout(timer);
    }
  };

  const listUrl = (title) => `${web}/_api/web/lists/getbytitle('${encodeURIComponent(title)}')`;
  const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const getList = async (title) => {
    const r = await call(`${listUrl(title)}?$select=Id,Title,BaseTemplate`);
    if (r.status === 404) return undefined;
    if (!r.ok) throw new Error(`Falha ao ler ${title} (HTTP ${r.status}).`);
    return r.json();
  };

  const getFields = async (title) => {
    const r = await call(`${listUrl(title)}/fields?$top=500&$select=InternalName,Title,TypeAsString,Indexed,Required,Hidden,Choices`);
    if (!r.ok) throw new Error(`Falha ao ler os campos de ${title} (HTTP ${r.status}).`);
    const body = await r.json();
    return body.value || [];
  };

  const fieldXml = (f) => {
    const format = f.type === 'DateTime' ? ' Format="DateTime"' : (f.format ? ` Format="${f.format}"` : '');
    const note = f.type === 'Note' ? ` NumLines="${f.numLines || 6}" RichText="FALSE"` : '';
    const attrs = `Type="${f.type}" DisplayName="${esc(f.n)}" Name="${f.n}" StaticName="${f.n}"${format}${note}`;
    const choices = f.choices ? `<CHOICES>${f.choices.map((c) => `<CHOICE>${esc(c)}</CHOICE>`).join('')}</CHOICES>` : '';
    const defaultValue = f.def !== undefined ? `<Default>${esc(f.def)}</Default>` : '';
    const inner = `${choices}${defaultValue}`;
    return inner ? `<Field ${attrs}>${inner}</Field>` : `<Field ${attrs}/>`;
  };

  const createContainer = async (title, template, versioning) => {
    const r = await call(`${web}/_api/web/lists`, {
      method: 'POST', write: true, body: JSON.stringify({ Title: title, BaseTemplate: template, EnableVersioning: versioning === true })
    });
    if (!r.ok) throw new Error(`Falha ao criar ${title} (HTTP ${r.status}).`);
  };

  const createField = async (title, f) => {
    // 1º: nome interno correto, com o nome técnico como rótulo inicial.
    const r = await call(`${listUrl(title)}/fields/createfieldasxml`, {
      method: 'POST', write: true, verbose: true,
      body: JSON.stringify({ parameters: { __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' }, Options: 8, SchemaXml: fieldXml(f) } })
    });
    if (!r.ok) throw new Error(`Falha ao criar o campo ${f.n} em ${title} (HTTP ${r.status}).`);
  };

  const confirmField = async (title, f) => {
    const r = await call(`${listUrl(title)}/fields/getbyinternalnameortitle('${f.n}')?$select=InternalName,TypeAsString`);
    if (!r.ok) throw new Error(`Campo ${f.n} não confirmado em ${title} (HTTP ${r.status}).`);
    const created = await r.json();
    if (created.InternalName !== f.n) throw new Error(`Nome interno divergente em ${title}: ${created.InternalName}.`);
  };

  const renameField = async (title, f) => {
    // Somente após confirmar o nome interno, aplica o rótulo amigável.
    const r = await call(`${listUrl(title)}/fields/getbyinternalnameortitle('${f.n}')`, {
      method: 'POST', write: true, verbose: true, headers: { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' },
      body: JSON.stringify({ __metadata: { type: 'SP.Field' }, Title: f.t })
    });
    if (!r.ok) throw new Error(`Falha ao renomear o rótulo de ${f.n} em ${title} (HTTP ${r.status}).`);
  };

  const indexField = async (title, f) => {
    const r = await call(`${listUrl(title)}/fields/getbyinternalnameortitle('${f.n}')`, {
      method: 'POST', write: true, verbose: true, headers: { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' },
      body: JSON.stringify({ __metadata: { type: 'SP.Field' }, Indexed: true })
    });
    if (!r.ok) throw new Error(`Falha ao indexar ${f.n} em ${title} (HTTP ${r.status}).`);
  };

  const processEnvironment = async (envName, prefix) => {
    for (const entry of CATALOG) {
      const title = `${prefix}${entry.base}`;
      console.info(`[${envName}] processando ${entry.kind} ${title}...`);
      try {
        const existing = await getList(title);
        if (!existing) {
          if (applying && !canWrite(envName)) {
            log('pendente', envName, `${entry.kind} ${title} não existe e não foi criada: criação bloqueada neste ambiente (HML com erro/divergência ou createInProd = false).`);
            continue;
          }
          if (!applying) {
            log('plano', envName, `Criaria a ${entry.kind.toLowerCase()} ${title}`);
            entry.fields.forEach((f) => {
              log('plano', envName, `Criaria o campo ${f.n} (${f.type}) em ${title}`);
              if (f.idx) log('plano', envName, `Indexaria ${f.n} em ${title}`);
            });
            continue;
          }
          await createContainer(title, entry.template, entry.versioning);
          log('criado', envName, `${entry.kind} ${title} criada`);
        } else if (existing.BaseTemplate !== entry.template) {
          log('divergente', envName, `${title} existe com modelo ${existing.BaseTemplate} (esperado ${entry.template}). Não alterado.`);
          continue;
        }

        if (entry.fields.length === 0) {
          log('conforme', envName, `${entry.kind} ${title} existe com o modelo previsto`);
          continue;
        }

        const byName = new Map((await getFields(title)).map((x) => [x.InternalName, x]));
        for (const f of entry.fields) {
          try {
            const current = byName.get(f.n);
            if (!current) {
              if (applying && !canWrite(envName)) {
                log('pendente', envName, `Campo ${f.n} ausente em ${title} (criação bloqueada neste ambiente)`);
                continue;
              }
              if (!applying) {
                log('plano', envName, `Criaria o campo ${f.n} (${f.type}) em ${title}`);
                if (f.idx) log('plano', envName, `Indexaria ${f.n} em ${title}`);
                continue;
              }
              await createField(title, f);
              await confirmField(title, f);
              await renameField(title, f);
              if (f.idx) await indexField(title, f);
              log('criado', envName, `Campo ${f.n} criado em ${title}`);
            } else if (current.TypeAsString !== f.type) {
              log('divergente', envName, `Tipo de ${f.n} em ${title}: ${current.TypeAsString} (esperado ${f.type}). Não alterado.`);
            } else if (f.native && current.Title !== f.t) {
              if (applying && canWrite(envName)) {
                await renameField(title, f);
                log('criado', envName, `Rótulo de ${f.n} definido como "${f.t}" em ${title}`);
              } else if (applying) {
                log('pendente', envName, `Rótulo de ${f.n} em ${title} ainda não ajustado (bloqueado neste ambiente)`);
              } else {
                log('plano', envName, `Ajustaria o rótulo de ${f.n} para "${f.t}" em ${title}`);
              }
            } else if (f.idx && !current.Indexed) {
              if (applying && canWrite(envName)) {
                await indexField(title, f);
                log('criado', envName, `Índice aplicado em ${f.n} de ${title}`);
              } else if (applying) {
                log('divergente', envName, `${f.n} em ${title} sem índice (indexação bloqueada neste ambiente)`);
              } else {
                log('plano', envName, `Indexaria ${f.n} em ${title}`);
              }
            } else {
              log('conforme', envName, `${f.n} em ${title}`);
            }
          } catch (error) {
            log('erro', envName, `${f.n} em ${title}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
          }
        }
      } catch (error) {
        // Interrompe apenas este recurso; os demais continuam para o relatório completo.
        log('erro', envName, error instanceof Error ? error.message : 'erro desconhecido');
      }
    }
  };

  console.info(`Modo: ${CONFIG.mode.toUpperCase()} — ${applying ? 'alterações em HML e, se liberado pelo gate, em PROD' : 'nenhuma alteração será feita'}`);
  for (const [envName, prefix] of Object.entries(ENVIRONMENTS)) {
    await processEnvironment(envName, prefix);
  }

  const counts = report.reduce((acc, item) => { acc[item.nivel] = (acc[item.nivel] || 0) + 1; return acc; }, {});
  console.info('Resumo:', counts);
  console.table(report);
  return { modo: CONFIG.mode, resumo: counts, relatorio: report };
})();
