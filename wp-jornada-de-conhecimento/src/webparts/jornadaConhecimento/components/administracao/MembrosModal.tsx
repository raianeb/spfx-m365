// Skills aplicadas: spfx-padrao-visual-gti (painel lateral), spfx-acessibilidade-conteudo.
import * as React from 'react';
import { AreaService } from '../../../../services/AreaService';
import { GtiDialog } from '../gti';
import MembrosGrupo from './MembrosGrupo';

export interface IMembrosModalProps {
  id: string;
  servico: AreaService;
  grupoId: number;
  sobretitulo: string;
  titulo: string;
  descricao: string;
  incluirGrupos?: boolean;
  aoAvisar: (mensagem: string) => void;
  aoFechar: () => void;
}

const MembrosModal: React.FC<IMembrosModalProps> = (props: IMembrosModalProps) => (
  <GtiDialog
    id={props.id}
    sobretitulo={props.sobretitulo}
    titulo={props.titulo}
    aoFechar={props.aoFechar}
    textoRodape="As alterações valem na hora, direto no grupo do SharePoint."
    rodape={
      <button type="button" className="pi-btn" onClick={props.aoFechar}>
        Fechar
      </button>
    }
  >
    <p style={{ fontSize: 13, marginBottom: 16 }}>{props.descricao}</p>
    <MembrosGrupo id={props.id} servico={props.servico} grupoId={props.grupoId} incluirGrupos={props.incluirGrupos} aoAvisar={props.aoAvisar} />
  </GtiDialog>
);

export default MembrosModal;
