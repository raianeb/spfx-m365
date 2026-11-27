// Skills aplicadas: spfx-design-base (troca de contexto no topo), spfx-acessibilidade-conteudo (rótulo visível).
import * as React from 'react';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { IArea } from '../../../../jornada/modelo';

export interface ISeletorAreaProps {
  areas: IArea[];
  selecionada: number | undefined;
  aoSelecionar: (areaId: number) => void;
}

/** Quem atua em mais de uma área troca por aqui; com uma área só, o seletor não aparece. */
const SeletorArea: React.FC<ISeletorAreaProps> = ({ areas, selecionada, aoSelecionar }: ISeletorAreaProps) =>
  areas.length > 1 ? (
    <Dropdown
      label="Área"
      options={areas.map((area: IArea): IDropdownOption => ({ key: area.id, text: `${area.nome} (${area.sigla})` }))}
      selectedKey={selecionada}
      onChange={(_e, opcao?: IDropdownOption) => opcao && aoSelecionar(Number(opcao.key))}
      styles={{ root: { minWidth: 240, maxWidth: 360 } }}
    />
  ) : null;

export default SeletorArea;
