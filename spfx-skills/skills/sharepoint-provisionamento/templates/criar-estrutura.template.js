/*
 * Equipe M365 — provisionamento de estrutura do projeto @PROJETO@ (schema v1)
 * GERADO a partir de definicao.json. Não edite à mão: altere a definição e gere novamente.
 *
 * Cole no Console do navegador com o site de destino aberto e a sessão logada.
 * O site é o mesmo para HML e PROD. Só muda o prefixo do nome das listas.
 *
 * mode = "plan" não altera nada e só mostra o que faria. Troque para "apply" para aplicar.
 * Em "apply", HML é processado primeiro. PROD só recebe criação se o HML não tiver erro
 * nem divergência neste relatório. Nada existente é alterado ou excluído.
 * Não cria grupos nem concede permissões. Idempotente: reexecutar não duplica nada.
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
  const pedirPrefixos = () => {
    const pedir = (ambiente) => {
      for (;;) {
        const digitado = window.prompt(`Prefixo dos nomes das listas no ambiente ${ambiente} ${ambiente === 'HML' ? '(obrigatório)' : '(deixe vazio para nenhum)'}:`, '');
        if (digitado === null) throw new Error('Execução cancelada pelo usuário.');
        const valor = digitado.trim();
        if (/^[A-Za-z0-9_]*$/.test(valor)) return valor;
        window.alert('Use apenas letras sem acento, números e _.');
      }
    };
    const hml = pedir('HML');
    if (hml === '') throw new Error('O prefixo de HML é obrigatório: as listas de HML precisam de prefixo próprio.');
    const prod = pedir('PROD');
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

  // Catálogo vindo do definicao.json. É a mesma definição para HML e PROD.
  const CATALOG = /*@CATALOGO@*/[];

  const TIPOS_PERMITIDOS = ['Text', 'Note', 'Number', 'DateTime', 'Boolean'];
  const NOME_INTERNO = /^[A-Za-z][A-Za-z0-9]*$/;

  // Valida a definição antes de qualquer chamada ao site.
  const validarCatalogo = () => {
    const bases = new Set();
    for (const lista of CATALOG) {
      if (!lista.base || bases.has(lista.base)) throw new Error(`Lista inválida ou repetida: "${lista.base}".`);
      bases.add(lista.base);
      const nomes = new Set();
      for (const campo of lista.campos) {
        if (!NOME_INTERNO.test(campo.nome)) throw new Error(`Nome interno inválido em ${lista.base}: "${campo.nome}" (use letras e números, começando por letra).`);
        if (nomes.has(campo.nome)) throw new Error(`Campo repetido em ${lista.base}: ${campo.nome}.`);
        nomes.add(campo.nome);
        if (!TIPOS_PERMITIDOS.includes(campo.tipo)) throw new Error(`Tipo não suportado em ${lista.base}.${campo.nome}: ${campo.tipo}.`);
      }
    }
  };
  validarCatalogo();

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

  // Nome interno definido na criação; o rótulo de exibição é aplicado depois.
  const fieldXml = (campo) => {
    const format = campo.tipo === 'DateTime' ? ' Format="DateTime"' : '';
    // Texto com formatação: RichText TRUE e modo Compatible (negrito, itálico, listas e links, sem imagens nem tabelas).
    const note = campo.tipo === 'Note'
      ? ` NumLines="${campo.linhas || 6}" RichText="${campo.formatacao ? 'TRUE' : 'FALSE'}"${campo.formatacao ? ' RichTextMode="Compatible"' : ''}`
      : '';
    const attrs = `Type="${campo.tipo}" DisplayName="${esc(campo.nome)}" Name="${campo.nome}" StaticName="${campo.nome}"${format}${note}`;
    return `<Field ${attrs}/>`;
  };

  const createContainer = async (title, modelo, versionamento) => {
    const r = await call(`${web}/_api/web/lists`, {
      method: 'POST', write: true, body: JSON.stringify({ Title: title, BaseTemplate: modelo, EnableVersioning: versionamento })
    });
    if (!r.ok) throw new Error(`Falha ao criar ${title} (HTTP ${r.status}).`);
  };

  const createField = async (title, campo) => {
    const r = await call(`${listUrl(title)}/fields/createfieldasxml`, {
      method: 'POST', write: true, verbose: true,
      body: JSON.stringify({ parameters: { __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' }, Options: 8, SchemaXml: fieldXml(campo) } })
    });
    if (!r.ok) throw new Error(`Falha ao criar o campo ${campo.nome} em ${title} (HTTP ${r.status}).`);
  };

  const confirmField = async (title, campo) => {
    const r = await call(`${listUrl(title)}/fields/getbyinternalnameortitle('${campo.nome}')?$select=InternalName,TypeAsString`);
    if (!r.ok) throw new Error(`Campo ${campo.nome} não confirmado em ${title} (HTTP ${r.status}).`);
    const created = await r.json();
    if (created.InternalName !== campo.nome) throw new Error(`Nome interno divergente em ${title}: ${created.InternalName}.`);
  };

  const renameField = async (title, campo) => {
    const r = await call(`${listUrl(title)}/fields/getbyinternalnameortitle('${campo.nome}')`, {
      method: 'POST', write: true, verbose: true, headers: { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' },
      body: JSON.stringify({ __metadata: { type: 'SP.Field' }, Title: campo.rotulo })
    });
    if (!r.ok) throw new Error(`Falha ao renomear o rótulo de ${campo.nome} em ${title} (HTTP ${r.status}).`);
  };

  const indexField = async (title, campo) => {
    const r = await call(`${listUrl(title)}/fields/getbyinternalnameortitle('${campo.nome}')`, {
      method: 'POST', write: true, verbose: true, headers: { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' },
      body: JSON.stringify({ __metadata: { type: 'SP.Field' }, Indexed: true })
    });
    if (!r.ok) throw new Error(`Falha ao indexar ${campo.nome} em ${title} (HTTP ${r.status}).`);
  };

  // Somente leitura: colunas existentes nunca são alteradas aqui.
  const isRichText = async (title, name) => {
    const r = await call(`${listUrl(title)}/fields/getbyinternalnameortitle('${name}')?$select=RichText`);
    if (!r.ok) throw new Error(`Falha ao ler o tipo de texto de ${name} em ${title} (HTTP ${r.status}).`);
    const body = await r.json();
    return body.RichText === true;
  };

  const processEnvironment = async (envName, prefix) => {
    for (const lista of CATALOG) {
      const title = `${prefix}${lista.base}`;
      const versionamento = lista.versionamento !== false;
      console.info(`[${envName}] processando lista ${title}...`);
      try {
        const existing = await getList(title);
        if (!existing) {
          if (applying && !canWrite(envName)) {
            log('pendente', envName, `Lista ${title} não existe e não foi criada: criação bloqueada neste ambiente (HML com erro/divergência ou createInProd = false).`);
            continue;
          }
          if (!applying) {
            log('plano', envName, `Criaria a lista ${title} (modelo ${lista.modelo})`);
            lista.campos.forEach((c) => {
              log('plano', envName, `Criaria o campo ${c.nome} (${c.tipo}) em ${title}`);
              if (c.indexado) log('plano', envName, `Indexaria ${c.nome} em ${title}`);
            });
            continue;
          }
          await createContainer(title, lista.modelo, versionamento);
          log('criado', envName, `Lista ${title} criada`);
        } else if (existing.BaseTemplate !== lista.modelo) {
          log('divergente', envName, `${title} existe com modelo ${existing.BaseTemplate} (esperado ${lista.modelo}). Não alterado.`);
          continue;
        }

        const byName = new Map((await getFields(title)).map((x) => [x.InternalName, x]));
        for (const campo of lista.campos) {
          try {
            const current = byName.get(campo.nome);
            if (!current) {
              if (applying && !canWrite(envName)) {
                log('pendente', envName, `Campo ${campo.nome} ausente em ${title} (criação bloqueada neste ambiente)`);
                continue;
              }
              if (!applying) {
                log('plano', envName, `Criaria o campo ${campo.nome} (${campo.tipo}) em ${title}`);
                if (campo.indexado) log('plano', envName, `Indexaria ${campo.nome} em ${title}`);
                continue;
              }
              await createField(title, campo);
              await confirmField(title, campo);
              await renameField(title, campo);
              if (campo.indexado) await indexField(title, campo);
              log('criado', envName, `Campo ${campo.nome} criado em ${title}`);
            } else if (current.TypeAsString !== campo.tipo) {
              log('divergente', envName, `Tipo de ${campo.nome} em ${title}: ${current.TypeAsString} (esperado ${campo.tipo}). Não alterado.`);
            } else if (campo.formatacao && !(await isRichText(title, campo.nome))) {
              log('divergente', envName, `${campo.nome} em ${title} é texto simples; esperado texto com formatação. Ajustar na configuração da coluna (não alterado pelo script).`);
            } else if (campo.nativo && current.Title !== campo.rotulo) {
              if (applying && canWrite(envName)) {
                await renameField(title, campo);
                log('criado', envName, `Rótulo de ${campo.nome} definido como "${campo.rotulo}" em ${title}`);
              } else if (applying) {
                log('pendente', envName, `Rótulo de ${campo.nome} em ${title} ainda não ajustado (bloqueado neste ambiente)`);
              } else {
                log('plano', envName, `Ajustaria o rótulo de ${campo.nome} para "${campo.rotulo}" em ${title}`);
              }
            } else if (campo.indexado && !current.Indexed) {
              if (applying && canWrite(envName)) {
                await indexField(title, campo);
                log('criado', envName, `Índice aplicado em ${campo.nome} de ${title}`);
              } else if (applying) {
                log('divergente', envName, `${campo.nome} em ${title} sem índice (indexação bloqueada neste ambiente)`);
              } else {
                log('plano', envName, `Indexaria ${campo.nome} em ${title}`);
              }
            } else {
              log('conforme', envName, `${campo.nome} em ${title}`);
            }
          } catch (error) {
            log('erro', envName, `${campo.nome} em ${title}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
          }
        }
      } catch (error) {
        // Interrompe apenas esta lista; as demais continuam para o relatório completo.
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
