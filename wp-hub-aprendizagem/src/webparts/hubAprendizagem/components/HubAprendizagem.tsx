// Skills aplicadas: spfx-implementacao-base. Componente inicial do scaffold; as abas entram nas próximas etapas.
import * as React from 'react';
import { IWebPartCommonProps } from '../../../core/config';

const HubAprendizagem: React.FC<IWebPartCommonProps> = (props: IWebPartCommonProps) => (
  <section style={props.themeStyle} aria-label={props.title || 'Hub de Aprendizagem'}>
    {props.title && <h2>{props.title}</h2>}
  </section>
);

export default HubAprendizagem;
