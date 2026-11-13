/*
 * Exemplo ilustrativo para script de Console (sem PnPjs). Use dentro do mesmo padrão de
 * provisionamento: sessão logada, mesma origem, sem URL fixa. Não executado neste repositório.
 */
const listarAtivosRest = async (webUrl, listaFisica, pagina = 500) => {
  const campos = 'Id,Title,Ordem';
  let url = `${webUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listaFisica)}')/items` +
    `?$select=${campos}&$filter=${encodeURIComponent("Status eq 'Ativo'")}&$orderby=Ordem&$top=${pagina}`;
  const itens = [];
  while (url) {
    const r = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json;odata=nometadata' } });
    if (!r.ok) throw new Error(`Falha na consulta (HTTP ${r.status}).`);
    const corpo = await r.json();
    itens.push(...(corpo.value || []));
    url = corpo['odata.nextLink'] || null; // segue a próxima página devolvida pelo serviço
  }
  return itens;
};
