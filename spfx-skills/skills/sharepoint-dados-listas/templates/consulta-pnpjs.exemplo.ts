// Exemplo ilustrativo para código de web part ou extensão (PnPjs). Não compilado neste repositório.
// Regras: select explícito, filtro em coluna indexada, top, paginação e escape de valores.
import { SPFI } from '@pnp/sp';
import '@pnp/sp/items';
import '@pnp/sp/lists';

export const escaparTexto = (valor: string): string => valor.replace(/'/g, "''");

export const listarAtivos = async (sp: SPFI, listaFisica: string, pagina: number = 500): Promise<unknown[]> => {
  const itens: unknown[] = [];
  // getPaged devolve uma página por vez; hasNext indica se há mais.
  let resultado = await sp.web.lists
    .getByTitle(listaFisica)
    .items.select('Id', 'Title', 'Ordem')
    .filter("Status eq 'Ativo'")   // Status deve ser coluna indexada se o volume puder passar de 5.000
    .orderBy('Ordem', true)        // Ordem deve ser coluna indexada
    .top(pagina)
    .getPaged();
  itens.push(...resultado.results);
  while (resultado.hasNext) {
    resultado = await resultado.getNext();
    itens.push(...resultado.results);
  }
  return itens;
};
