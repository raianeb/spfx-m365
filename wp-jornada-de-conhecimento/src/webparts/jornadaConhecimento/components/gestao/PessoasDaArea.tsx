// Skills aplicadas: spfx-padrao-visual-gti (dois painéis lado a lado, um por grupo), spfx-acessibilidade-conteudo.
// O gestor inclui membros nos grupos existentes da área (Usuários e Equipe de apoio), com a própria sessão.
import * as React from 'react';
import { IArea } from '../../../../jornada/modelo';
import { Empty, Icon, Panel } from '../gti';
import { IContextoTela } from '../tipos';
import MembrosGrupo from '../administracao/MembrosGrupo';

export interface IPessoasDaAreaProps {
  ctx: IContextoTela;
  area: IArea;
  aoAlterar: () => void;
}

const PessoasDaArea: React.FC<IPessoasDaAreaProps> = ({ ctx, area, aoAlterar }: IPessoasDaAreaProps) => {
  const grupos: { id?: number; titulo: string; texto: string; entra: boolean }[] = [
    { id: area.grupoUsuariosId, titulo: 'Usuários', texto: 'Fazem as jornadas publicadas, curtem, avaliam e comentam. Aceita grupos do Entra ID.', entra: true },
    { id: area.grupoApoioId, titulo: 'Equipe de apoio', texto: 'Cria e edita jornadas, etapas e conteúdos; vê só indicadores agregados.', entra: false }
  ];
  return (
    <>
      <div className="pi-grid2" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
        {grupos.map((g) => (
          <Panel key={g.titulo} titulo={g.titulo} descricao={g.texto}>
            {g.id ? (
              <MembrosGrupo id={`${ctx.idTitulo}-${g.titulo}`} servico={ctx.servicos.areas} grupoId={g.id} incluirGrupos={g.entra} aoAvisar={ctx.avisar} aoAlterar={aoAlterar} />
            ) : (
              <Empty icone="alerta" titulo="Grupo não configurado" descricao="Peça ao administrador para reprocessar a área." />
            )}
          </Panel>
        ))}
      </div>
      <p className="pi-hint" style={{ marginTop: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Icon nome="escudo" tamanho={14} />
        As alterações entram direto nos grupos do SharePoint da área {area.sigla}. Na área Geral, inclua um grupo do Entra ID em vez de pessoas uma a uma.
      </p>
    </>
  );
};

export default PessoasDaArea;
