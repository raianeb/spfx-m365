/*
 * Equipe M365 — ativar a extensão padrão da skin (ex-layout-sharepoint) em um site
 * Cole este arquivo no Console do navegador com o site de destino aberto e logado (Proprietário do site).
 * Nenhuma URL fixa: o script pede o site (padrão: o site aberto) e usa o nome e o ComponentId abaixo.
 *
 * Fluxo: primeiro monta um plano e mostra o que faria (nada é alterado). Só aplica depois da sua confirmação.
 * Idempotente: reexecutar não instala de novo nem duplica o registro da extensão.
 *
 * Como o SharePoint ativa a extensão no site, conforme o pacote:
 *   - skipFeatureDeployment = true  → o aplicativo já fica disponível em todos os sites após a implantação no
 *     catálogo; a ativação é o registro de uma User Custom Action (ClientSideExtension.ApplicationCustomizer).
 *   - skipFeatureDeployment = false → o aplicativo é instalado no site e a feature registra a extensão. Se o
 *     pacote não trouxer o registro, o script cria a User Custom Action.
 *
 * Pré-requisitos:
 *   - pacote enviado ao catálogo do tenant e implantado SEM marcar "adicionar a todos os sites";
 *   - ComponentId do Application Customizer em COMPONENT_ID (se vazio, o script pede o GUID).
 * ACAO = 'desativar' remove o registro da extensão do site (não desinstala o aplicativo).
 */
(async () => {
  // ---- Dados do aplicativo (atualize quando o pacote do ex-layout-sharepoint mudar) ----
  const APP_TITULO = 'ex-layout-sharepoint';
  const COMPONENT_ID = ''; // id do manifesto do Application Customizer (GUID)
  const TITULO_REGISTRO = 'ex-layout-sharepoint'; // título da User Custom Action criada pelo script
  const PROPRIEDADES = {}; // ClientSideComponentProperties (skill, seção 12). Vazio = padrões da extensão
  const ESCOPO = 'web'; // 'web' (só este site) | 'site' (conjunto de sites, exige Administrador do conjunto)
  const ACAO = 'ativar'; // 'ativar' | 'desativar'

  const LOCAL = 'ClientSideExtension.ApplicationCustomizer';
  const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // ---- Entradas ----
  const pedirUrlSite = () => {
    const contexto = window._spPageContextInfo && window._spPageContextInfo.webAbsoluteUrl;
    const padrao = contexto || window.location.origin + (window.location.pathname.match(/^\/(sites|teams)\/[^/]+/) || [''])[0];
    for (;;) {
      const digitado = window.prompt('URL do site onde a extensão será ativada:', padrao);
      if (digitado === null) throw new Error('Execução cancelada pelo usuário.');
      try {
        const url = new URL(digitado.trim());
        if (url.protocol !== 'https:') throw new Error('A URL precisa começar com https://');
        if (url.origin !== window.location.origin) throw new Error(`Abra o Console em uma página de ${url.origin}: a chamada usa a sessão do navegador.`);
        return url.origin + url.pathname.replace(/\/+$/, '');
      } catch (erro) {
        window.alert(`URL inválida: ${erro.message}`);
      }
    }
  };
  const pedirComponentId = () => {
    if (GUID.test(COMPONENT_ID)) return COMPONENT_ID.toLowerCase();
    for (;;) {
      const digitado = window.prompt('ComponentId do Application Customizer (GUID do manifesto da extensão):', '');
      if (digitado === null) throw new Error('Execução cancelada pelo usuário.');
      const valor = digitado.trim().replace(/[{}]/g, '');
      if (GUID.test(valor)) return valor.toLowerCase();
      window.alert('Informe um GUID no formato 00000000-0000-0000-0000-000000000000.');
    }
  };

  // ---- REST ----
  const requisitar = async (url, opcoes = {}) => {
    const resposta = await fetch(url, {
      credentials: 'same-origin',
      ...opcoes,
      headers: { Accept: 'application/json;odata=nometadata', ...(opcoes.headers || {}) },
    });
    const texto = await resposta.text();
    if (!resposta.ok) {
      const erro = new Error(`HTTP ${resposta.status} em ${url}: ${texto.slice(0, 400)}`);
      erro.status = resposta.status;
      throw erro;
    }
    return texto ? JSON.parse(texto) : null;
  };
  const obterDigest = async (url) => (await requisitar(`${url}/_api/contextinfo`, { method: 'POST' })).FormDigestValue;
  const postar = (url, digest, corpo) => requisitar(url, {
    method: 'POST',
    headers: { 'X-RequestDigest': digest, 'Content-Type': 'application/json;odata=nometadata' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const aguardar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
  const mesmoId = (a, b) => String(a || '').replace(/[{}]/g, '').toLowerCase() === String(b || '').replace(/[{}]/g, '').toLowerCase();

  // ---- Consultas ----
  const localizarApp = async (siteUrl) => {
    const apps = (await requisitar(`${siteUrl}/_api/web/tenantappcatalog/AvailableApps`)).value;
    const encontrados = apps.filter((app) => (app.Title || '').trim().toLowerCase() === APP_TITULO.toLowerCase());
    if (encontrados.length === 0) {
      console.table(apps.map(({ Title, ID, AppCatalogVersion, Deployed }) => ({ Title, ID, AppCatalogVersion, Deployed })));
      throw new Error(`Aplicativo "${APP_TITULO}" não encontrado no catálogo do tenant. Confira o nome na tabela acima.`);
    }
    if (encontrados.length > 1) throw new Error(`Há ${encontrados.length} aplicativos chamados "${APP_TITULO}" no catálogo. Remova o duplicado antes de continuar.`);
    return encontrados[0];
  };
  const instalado = (app) => Boolean(app.InstalledVersion) && app.InstalledVersion !== '0.0.0.0';

  const registrosNoSite = async (siteUrl, componentId) => {
    const filtro = `$filter=Location eq '${LOCAL}'&$select=Id,Title,ClientSideComponentId`;
    const lerEscopo = async (escopo) => {
      try {
        const itens = (await requisitar(`${siteUrl}/_api/${escopo}/UserCustomActions?${filtro}`)).value;
        return itens.filter((item) => mesmoId(item.ClientSideComponentId, componentId)).map((item) => ({ ...item, escopo }));
      } catch (erro) {
        if (erro.status === 403) return [{ escopo, semAcesso: true }];
        throw erro;
      }
    };
    return [...(await lerEscopo('web')), ...(await lerEscopo('site'))];
  };

  // Melhor esforço: quem não tem acesso ao catálogo recebe só um aviso.
  const ativaEmTodosOsSites = async (componentId) => {
    try {
      const { CorporateCatalogUrl: catalogo } = await requisitar(`${window.location.origin}/_api/SP_TenantSettings_Current`);
      if (!catalogo) return { conferido: false, motivo: 'catálogo do tenant não informado' };
      const caminho = `${new URL(catalogo).pathname}/Lists/TenantWideExtensions`;
      const itens = (await requisitar(`${catalogo}/_api/web/GetList('${caminho}')/items?$select=Title,TenantWideExtensionComponentId,TenantWideExtensionDisabled&$top=500`)).value;
      const ativos = itens.filter((item) => mesmoId(item.TenantWideExtensionComponentId, componentId) && !item.TenantWideExtensionDisabled);
      return { conferido: true, ativos };
    } catch (erro) {
      return { conferido: false, motivo: erro.status === 403 || erro.status === 404 ? 'sem acesso ao catálogo do tenant' : erro.message };
    }
  };

  // ---- Execução ----
  try {
    if (!['ativar', 'desativar'].includes(ACAO)) throw new Error("ACAO deve ser 'ativar' ou 'desativar'.");
    if (!['web', 'site'].includes(ESCOPO)) throw new Error("ESCOPO deve ser 'web' ou 'site'.");
    const siteUrl = pedirUrlSite();
    const componentId = pedirComponentId();

    console.log('🔍 Conferindo o site e o catálogo...');
    const app = await localizarApp(siteUrl);
    const registros = await registrosNoSite(siteUrl, componentId);
    const semAcesso = registros.filter((r) => r.semAcesso).map((r) => r.escopo);
    const existentes = registros.filter((r) => !r.semAcesso);
    const tenant = ACAO === 'ativar' ? await ativaEmTodosOsSites(componentId) : { conferido: false, motivo: 'não se aplica' };

    console.table({
      Site: siteUrl,
      Aplicativo: app.Title,
      'Versão no catálogo': app.AppCatalogVersion,
      'Implantado no catálogo': app.Deployed,
      'skipFeatureDeployment': app.SkipDeploymentFeature,
      'Versão instalada no site': app.InstalledVersion || '—',
      'Registros da extensão no site': existentes.map((r) => `${r.escopo}: ${r.Title}`).join('; ') || 'nenhum',
      'Ativa em todos os sites (tenant)': tenant.conferido ? (tenant.ativos.length ? 'SIM' : 'não') : `não conferido (${tenant.motivo})`,
    });
    if (semAcesso.length) console.warn(`⚠️ Sem acesso para ler os registros do escopo "${semAcesso.join('", "')}". O plano pode estar incompleto.`);

    // ---- Plano ----
    const plano = [];
    if (ACAO === 'desativar') {
      existentes.forEach((r) => plano.push({ passo: `Remover o registro "${r.Title}" (${r.escopo})`, executar: async (digest) => postar(`${siteUrl}/_api/${r.escopo}/UserCustomActions('${r.Id}')/deleteObject`, digest) }));
    } else {
      if (!app.Deployed) throw new Error('O aplicativo está no catálogo, mas não foi implantado. Implante-o (sem "adicionar a todos os sites") e execute de novo.');
      if (tenant.conferido && tenant.ativos.length) throw new Error('A extensão já está ativa em todos os sites (lista Tenant Wide Extensions). Ativar também no site duplicaria a skin. Nada a fazer.');
      if (!tenant.conferido) console.warn('⚠️ Não foi possível conferir a lista Tenant Wide Extensions. Confirme no catálogo que a extensão não está ativa em todos os sites.');
      if (existentes.length > 1) console.warn('⚠️ Há mais de um registro da extensão neste site. Mantenha um só (ACAO = "desativar" remove todos).');

      const precisaInstalar = !app.SkipDeploymentFeature && !instalado(app);
      if (precisaInstalar) {
        plano.push({
          passo: `Instalar o aplicativo no site (versão ${app.AppCatalogVersion})`,
          executar: async (digest) => {
            await postar(`${siteUrl}/_api/web/tenantappcatalog/AvailableApps/GetById('${app.ID}')/Install`, digest);
            for (let tentativa = 0; tentativa < 18; tentativa += 1) { // até ~90 s
              await aguardar(5000);
              const atual = await localizarApp(siteUrl);
              if (instalado(atual)) return;
              console.log('⏳ Instalação em andamento...');
            }
            throw new Error('A instalação não terminou em 90 s. Confira em Conteúdo do site e execute de novo.');
          },
        });
      } else if (!app.SkipDeploymentFeature && app.InstalledVersion && app.InstalledVersion !== app.AppCatalogVersion) {
        console.warn(`⚠️ Versão instalada (${app.InstalledVersion}) diferente da do catálogo (${app.AppCatalogVersion}). Atualize em Conteúdo do site.`);
      }
      if (existentes.length === 0) {
        plano.push({
          passo: `Registrar a extensão no escopo "${ESCOPO}"${precisaInstalar ? ' (só se a instalação não registrar)' : ''}`,
          executar: async (digest) => {
            if ((await registrosNoSite(siteUrl, componentId)).some((r) => !r.semAcesso)) return 'registrada pela instalação';
            await postar(`${siteUrl}/_api/${ESCOPO}/UserCustomActions`, digest, {
              Title: TITULO_REGISTRO,
              Location: LOCAL,
              ClientSideComponentId: componentId,
              ClientSideComponentProperties: JSON.stringify(PROPRIEDADES),
            });
            return 'registrada';
          },
        });
      }
    }

    if (plano.length === 0) {
      console.log(ACAO === 'ativar' ? '✅ A extensão já está ativa neste site. Nada a fazer.' : '✅ Não há registro da extensão neste site. Nada a fazer.');
      return;
    }
    console.log('📋 Plano:');
    plano.forEach((item, indice) => console.log(`  ${indice + 1}. ${item.passo}`));
    if (!window.confirm(`Aplicar ${plano.length} passo(s) em ${siteUrl}?\n\n${plano.map((p, i) => `${i + 1}. ${p.passo}`).join('\n')}`)) {
      console.log('Nada foi alterado.');
      return;
    }

    // ---- Aplicação ----
    for (const item of plano) {
      console.log(`⏳ ${item.passo}...`);
      const resultado = await item.executar(await obterDigest(siteUrl));
      console.log(`✅ ${item.passo}${typeof resultado === 'string' ? `: ${resultado}` : ''}`);
    }
    console.table(await registrosNoSite(siteUrl, componentId));
    console.log(ACAO === 'ativar'
      ? '✅ Concluído. Abra uma página do site com ?env=webview (Ctrl+F5 ou aba anônima) para conferir a skin.'
      : '✅ Concluído. A skin deixa de ser carregada neste site.');
  } catch (erro) {
    console.error('❌', erro.message || erro);
  }
})();
