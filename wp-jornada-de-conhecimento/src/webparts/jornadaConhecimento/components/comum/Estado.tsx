// Skills aplicadas: spfx-design-base (estados vazio, erro e primeiro uso com próximo passo), spfx-acessibilidade-conteudo.
import * as React from 'react';
import styles from '../JornadaConhecimento.module.scss';

export interface IEstadoProps {
  titulo: string;
  texto: string;
  /** "alert" para erros, anunciados pelo leitor de tela. */
  papel?: 'alert' | 'status';
  children?: React.ReactNode;
}

const Estado: React.FC<IEstadoProps> = ({ titulo, texto, papel = 'status', children }: IEstadoProps) => (
  <div className={styles.estado} role={papel}>
    <h3 className={styles.estadoTitulo}>{titulo}</h3>
    <p className={styles.estadoTexto}>{texto}</p>
    {children}
  </div>
);

export default Estado;
