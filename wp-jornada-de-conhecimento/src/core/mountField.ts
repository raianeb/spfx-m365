import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';

const roots: WeakMap<HTMLElement, Root> = new WeakMap<HTMLElement, Root>();

/** Renderiza um controle React dentro do elemento fornecido pelo painel de propriedades. */
export const mountField = (element: HTMLElement, node: React.ReactElement): void => {
  let root: Root | undefined = roots.get(element);
  if (!root) {
    root = createRoot(element);
    roots.set(element, root);
  }
  root.render(node);
};

export const unmountField = (element: HTMLElement | undefined): void => {
  if (!element) {
    return;
  }
  roots.get(element)?.unmount();
  roots.delete(element);
};
