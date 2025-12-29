// CDN-based library loaders - no npm dependencies needed
// These load at runtime, avoiding Vite/React conflicts

// ============ jsPDF Types ============
interface JsPDFConstructor {
  new (): JsPDFInstance;
}

interface JsPDFInstance {
  setFontSize(size: number): void;
  setTextColor(r: number, g: number, b: number): void;
  setFillColor(r: number, g: number, b: number): void;
  rect(x: number, y: number, w: number, h: number, style: string): void;
  text(text: string | string[], x: number, y: number, options?: object): void;
  splitTextToSize(text: string, maxWidth: number): string[];
  addPage(): void;
  setPage(pageNumber: number): void;
  save(filename: string): void;
  internal: {
    pageSize: { getWidth(): number; getHeight(): number };
    pages: unknown[];
  };
}

// ============ XLSX Types ============
interface XLSXModule {
  utils: {
    aoa_to_sheet(data: unknown[][]): XLSXWorksheet;
    book_new(): XLSXWorkbook;
    book_append_sheet(workbook: XLSXWorkbook, worksheet: XLSXWorksheet, name: string): void;
  };
  writeFile(workbook: XLSXWorkbook, filename: string): void;
}

interface XLSXWorksheet {
  '!cols'?: { wch: number }[];
}

interface XLSXWorkbook {
  SheetNames: string[];
  Sheets: Record<string, XLSXWorksheet>;
}

// ============ DOCX Types ============
interface DocxModule {
  Document: new (options: unknown) => unknown;
  Paragraph: new (options: unknown) => unknown;
  TextRun: new (options: unknown) => unknown;
  HeadingLevel: { HEADING_1: unknown };
  Header: new (options: unknown) => unknown;
  Footer: new (options: unknown) => unknown;
  AlignmentType: { CENTER: unknown };
  Packer: { toBlob: (doc: unknown) => Promise<Blob> };
}

// ============ PptxGenJS Types ============
interface PptxGenJSConstructor {
  new (): PptxGenJSInstance;
}

interface PptxGenJSInstance {
  author: string;
  company: string;
  title: string;
  slides: PptxSlide[];
  addSlide(): PptxSlide;
  writeFile(options: { fileName: string }): void;
}

interface PptxSlide {
  addText(text: string, options: Record<string, unknown>): void;
  addTable(rows: string[][], options: Record<string, unknown>): void;
}

// ============ Window Extensions ============
declare global {
  interface Window {
    jspdf?: { jsPDF: JsPDFConstructor };
    XLSX?: XLSXModule;
    docx?: DocxModule;
    PptxGenJS?: PptxGenJSConstructor;
  }
}

// ============ Loader Functions ============

export async function loadJsPDF(): Promise<JsPDFConstructor> {
  if (window.jspdf?.jsPDF) {
    return window.jspdf.jsPDF;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    script.onload = () => {
      if (window.jspdf?.jsPDF) {
        resolve(window.jspdf.jsPDF);
      } else {
        reject(new Error('jsPDF failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load jsPDF from CDN'));
    document.head.appendChild(script);
  });
}

export async function loadXLSX(): Promise<XLSXModule> {
  if (window.XLSX) {
    return window.XLSX;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = () => {
      if (window.XLSX) {
        resolve(window.XLSX);
      } else {
        reject(new Error('XLSX failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load XLSX from CDN'));
    document.head.appendChild(script);
  });
}

export async function loadDocx(): Promise<DocxModule> {
  if (window.docx) {
    return window.docx;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.min.js';
    script.onload = () => {
      if (window.docx) {
        resolve(window.docx);
      } else {
        reject(new Error('docx failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load docx from CDN'));
    document.head.appendChild(script);
  });
}

export async function loadPptxGenJS(): Promise<PptxGenJSConstructor> {
  if (window.PptxGenJS) {
    return window.PptxGenJS;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
    script.onload = () => {
      if (window.PptxGenJS) {
        resolve(window.PptxGenJS);
      } else {
        reject(new Error('PptxGenJS failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PptxGenJS from CDN'));
    document.head.appendChild(script);
  });
}

// Re-export types for use in other files
export type { JsPDFConstructor, JsPDFInstance, XLSXModule, DocxModule, PptxGenJSConstructor };
