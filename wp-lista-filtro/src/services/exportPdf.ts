/** Imagem do gráfico, já convertida em PNG. */
export interface IChartImage {
  dataUrl: string;
  /** Largura e altura do gráfico no viewBox original (proporção). */
  width: number;
  height: number;
}

export interface IPdfKpi {
  label: string;
  value: string;
}

/** Conteúdo de uma exportação de gráfico: cabeçalho, indicadores, imagem e tabela de valores. */
export interface IChartPdfPayload {
  fileName: string;
  title: string;
  subtitle: string;
  kpis: IPdfKpi[];
  chart?: IChartImage;
  headers: string[];
  rows: string[][];
}

/** Escala da imagem: 2x do viewBox, para o PDF ficar nítido na impressão. */
const IMAGE_SCALE: number = 2;

/**
 * Converte o SVG do gráfico em PNG. O SVG é clonado com largura e altura explícitas,
 * porque o estilo CSS da tela (tamanho responsivo) não vale para a imagem isolada.
 */
export const svgToPng = async (svg: SVGSVGElement): Promise<IChartImage> => {
  const viewBox: DOMRect | SVGRect = svg.viewBox.baseVal;
  const width: number = viewBox.width;
  const height: number = viewBox.height;
  const clone: SVGSVGElement = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  const markup: string = new XMLSerializer().serializeToString(clone);
  const url: string = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image: HTMLImageElement = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element: HTMLImageElement = new Image();
      element.onload = (): void => resolve(element);
      element.onerror = (): void => reject(new Error('Não foi possível converter o gráfico.'));
      element.src = url;
    });
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = Math.round(width * IMAGE_SCALE);
    canvas.height = Math.round(height * IMAGE_SCALE);
    const context: CanvasRenderingContext2D | null = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas indisponível neste navegador.');
    }
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL('image/png'), width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
};

const MARGIN: number = 12;
const FOOTER_SPACE: number = 12;
const ROW_HEIGHT: number = 6.5;
const INK: [number, number, number] = [31, 31, 31];
const MUTED: [number, number, number] = [95, 95, 95];
const RULE: [number, number, number] = [225, 223, 221];

/**
 * Gera o PDF do gráfico em formato paisagem A4: título, indicadores, gráfico e tabela de valores.
 * A biblioteca é carregada só no clique, como a exportação para Excel.
 */
export const exportChartPdf = async (payload: IChartPdfPayload): Promise<void> => {
  const { jsPDF } = await import(/* webpackChunkName: "pdf" */ 'jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const pageWidth: number = doc.internal.pageSize.getWidth();
  const pageHeight: number = doc.internal.pageSize.getHeight();
  const contentWidth: number = pageWidth - MARGIN * 2;

  let y: number = MARGIN + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(payload.title, MARGIN, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(payload.subtitle, MARGIN, y, { maxWidth: contentWidth });
  y += 7;

  if (payload.kpis.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const line: string = payload.kpis.map((kpi: IPdfKpi) => `${kpi.label}: ${kpi.value}`).join('   |   ');
    doc.text(line, MARGIN, y, { maxWidth: contentWidth });
    y += 8;
  }

  if (payload.chart) {
    const availableHeight: number = pageHeight - y - FOOTER_SPACE;
    let imageWidth: number = contentWidth;
    let imageHeight: number = (imageWidth * payload.chart.height) / payload.chart.width;
    if (imageHeight > availableHeight) {
      imageHeight = availableHeight;
      imageWidth = (imageHeight * payload.chart.width) / payload.chart.height;
    }
    const x: number = MARGIN + (contentWidth - imageWidth) / 2;
    doc.addImage(payload.chart.dataUrl, 'PNG', x, y, imageWidth, imageHeight);
  }

  // Tabela em nova página: legível mesmo quando há muitos grupos (datas, por exemplo).
  const columnCount: number = payload.headers.length;
  const columnWidth: number = contentWidth / Math.max(1, columnCount);
  const drawHeader = (top: number): number => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    payload.headers.forEach((header: string, index: number) => {
      doc.text(header, MARGIN + columnWidth * index + 2, top + 4.5);
    });
    doc.setDrawColor(...RULE);
    doc.line(MARGIN, top + ROW_HEIGHT, MARGIN + contentWidth, top + ROW_HEIGHT);
    doc.setFont('helvetica', 'normal');
    return top + ROW_HEIGHT + 1;
  };

  doc.addPage();
  let top: number = drawHeader(MARGIN);
  payload.rows.forEach((row: string[]) => {
    if (top + ROW_HEIGHT > pageHeight - FOOTER_SPACE) {
      doc.addPage();
      top = drawHeader(MARGIN);
    }
    row.forEach((cell: string, index: number) => {
      const text: string = doc.splitTextToSize(cell, columnWidth - 4)[0] ?? '';
      doc.text(text, MARGIN + columnWidth * index + 2, top + 4.5);
    });
    top += ROW_HEIGHT;
  });

  // Rodapé com numeração em todas as páginas.
  const pages: number = doc.getNumberOfPages();
  for (let page: number = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Página ${page} de ${pages}`, pageWidth - MARGIN, pageHeight - 6, { align: 'right' });
  }

  doc.save(payload.fileName);
};
