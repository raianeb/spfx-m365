// Skills aplicadas: spfx-padrao-visual-gti (pessoas por consulta, lista com ação por item), spfx-acessibilidade-conteudo.
// Inclui e remove membros de um grupo com a sessão do usuário logado: o SharePoint só permite ao proprietário do grupo.
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { AreaService, IPessoa } from '../../../../services/AreaService';
import { mensagemDeErro } from '../../../../services/sp';
import { ErrorBox, Icon, Loading } from '../gti';
import { iniciais } from '../comum/ui';
import PessoasPicker from '../comum/PessoasPicker';

export interface IMembrosGrupoProps {
  id: string;
  servico: AreaService;
  grupoId: number;
  /** Permite incluir grupos do Entra ID (ex.: área Geral). */
  incluirGrupos?: boolean;
  aoAvisar: (mensagem: string) => void;
  aoAlterar?: () => void;
}

const MembrosGrupo: React.FC<IMembrosGrupoProps> = (props: IMembrosGrupoProps) => {
  const { servico, grupoId } = props;
  const [membros, setMembros] = useState<IPessoa[] | undefined>(undefined);
  const [novos, setNovos] = useState<IPessoa[]>([]);
  const [ocupado, setOcupado] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');
  const [filtro, setFiltro] = useState<string>('');

  const carregar = useCallback(async (): Promise<void> => {
    try {
      setMembros(await servico.listarMembros(grupoId));
    } catch (falha: unknown) {
      setMembros([]);
      setErro(mensagemDeErro(falha, 'Carregar os membros'));
    }
  }, [servico, grupoId]);

  useEffect(() => {
    carregar().catch(() => undefined);
  }, [carregar]);

  const executar = async (acao: () => Promise<void>, rotulo: string, sucesso: string): Promise<void> => {
    setOcupado(true);
    setErro('');
    try {
      await acao();
      await carregar();
      props.aoAvisar(sucesso);
      props.aoAlterar?.();
    } catch (falha: unknown) {
      setErro(mensagemDeErro(falha, rotulo));
    } finally {
      setOcupado(false);
    }
  };

  const termo: string = filtro.trim().toLowerCase();
  const exibidos: IPessoa[] = (membros ?? []).filter((m: IPessoa) => !termo || `${m.nome} ${m.email}`.toLowerCase().indexOf(termo) !== -1);

  return (
    <>
      <PessoasPicker
        id={`${props.id}-novos`}
        rotulo="Incluir no grupo"
        servico={servico}
        selecionadas={novos}
        aoAlterar={setNovos}
        incluirGrupos={props.incluirGrupos}
        desabilitado={ocupado}
      />
      {novos.length > 0 && (
        <div className="pi-actions" style={{ marginTop: 10 }}>
          <button
            type="button"
            className="pi-btn primary"
            disabled={ocupado}
            onClick={() =>
              executar(
                async () => {
                  await servico.incluirMembros(grupoId, novos);
                  setNovos([]);
                },
                'Incluir membros',
                `${novos.length} incluído(s) no grupo. O acesso vale na hora.`
              )
            }
          >
            {ocupado ? 'Salvando…' : `Incluir ${novos.length} no grupo`}
          </button>
        </div>
      )}
      {erro && <ErrorBox mensagem={erro} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, margin: '18px 0 4px' }}>
        <span className="pi-eyebrow" style={{ margin: 0 }}>
          Membros {membros ? `(${membros.length})` : ''}
        </span>
        {membros && membros.length > 8 && (
          <input className="pi-select" style={{ minHeight: 32 }} aria-label="Filtrar membros" placeholder="Filtrar" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        )}
      </div>
      {membros === undefined ? (
        <Loading texto="Carregando membros…" />
      ) : membros.length === 0 ? (
        <p className="pi-hint">Nenhum membro no grupo.</p>
      ) : (
        <div className="pi-rows" style={{ maxHeight: 360, overflow: 'auto' }}>
          {exibidos.map((m: IPessoa) => (
            <div className="pi-row" key={m.id ?? m.loginName}>
              <span className="pi-avatar" aria-hidden="true">
                {m.email ? iniciais(m.nome) : <Icon nome="pessoas" tamanho={16} />}
              </span>
              <span className="pi-row-text">
                <b>{m.nome}</b>
                <span>{m.email || 'Grupo do Entra ID'}</span>
              </span>
              <button
                type="button"
                className="pi-btn ghost danger"
                aria-label={`Remover ${m.nome} do grupo`}
                disabled={ocupado}
                onClick={() => executar(() => servico.removerMembro(grupoId, m.id ?? 0), 'Remover membro', `${m.nome} removido(a) do grupo.`)}
              >
                <Icon nome="lixeira" tamanho={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default MembrosGrupo;
