import { useCallback, useState } from 'react';
import { cleanArtifactContent } from '~/components/Artifacts/Code';
import { loadJsPDF, loadXLSX, loadDocx, loadPptxGenJS } from '~/utils/cdnLibraries';

export type ExportFormat = 'txt' | 'pdf' | 'xlsx' | 'csv' | 'docx' | 'pptx';
export type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

// Actionable+ brand colors
const BRAND = {
  primary: [59, 130, 246] as const, // Blue
  secondary: [99, 102, 241] as const, // Indigo
  text: [30, 41, 59] as const, // Slate-800
  lightBg: [248, 250, 252] as const, // Slate-50
  border: [226, 232, 240] as const, // Slate-200
};

function sanitizeForFilename(str: string): string {
  return (
    str
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .toLowerCase() || 'export'
  );
}

function generateFilename(title: string, ext: string): string {
  const sanitized = sanitizeForFilename(title);
  const timestamp = Math.floor(Date.now() / 1000);
  return `${sanitized}-actionable-${timestamp}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Parse content - detect if it's tabular data
function parseContent(content: string): { isTable: boolean; rows: string[][]; text: string } {
  const lines = content.trim().split('\n');
  const cleaned = cleanArtifactContent(content);

  // Check if content looks like CSV/table
  const hasCommas = lines.some((l) => l.includes(','));
  const hasTabs = lines.some((l) => l.includes('\t'));
  const hasPipes = lines.some((l) => l.includes('|'));

  if (hasCommas || hasTabs || hasPipes) {
    const delimiter = hasPipes ? '|' : hasTabs ? '\t' : ',';
    const rows = lines
      .filter((l) => l.trim())
      .map((l) =>
        l
          .split(delimiter)
          .map((cell) => cell.trim())
          .filter((cell) => cell !== '' && cell !== '-' && !cell.match(/^[-:]+$/)),
      )
      .filter((row) => row.length > 0);
    return { isTable: true, rows, text: cleaned };
  }

  return { isTable: false, rows: [], text: cleaned };
}

export function useArtifactExport() {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const exportToTxt = useCallback((content: string, title: string) => {
    const cleaned = cleanArtifactContent(content);
    const filename = generateFilename(title, 'txt');
    const blob = new Blob([cleaned], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, filename);
  }, []);

  const exportToCsv = useCallback((content: string, title: string) => {
    const cleaned = cleanArtifactContent(content);
    const filename = generateFilename(title, 'csv');
    // Add BOM for Excel compatibility
    const bom = '\uFEFF';
    const blob = new Blob([bom + cleaned], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, filename);
  }, []);

  const exportToPdf = useCallback(async (content: string, title: string) => {
    setStatus('loading');
    try {
      const jsPDF = await loadJsPDF();
      const doc = new jsPDF();
      const { isTable, rows, text } = parseContent(content);

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = margin;

      // === HEADER ===
      doc.setFillColor(...BRAND.primary);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('Actionable+', margin, 16);
      doc.setFontSize(10);
      doc.text('E-Commerce Consulting', pageWidth - margin - 45, 16);

      y = 35;

      // === TITLE ===
      doc.setTextColor(...BRAND.text);
      doc.setFontSize(18);
      doc.text(title || 'Export', margin, y);
      y += 10;

      // Date
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        new Date().toLocaleDateString('hu-HU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        margin,
        y,
      );
      y += 15;

      // === CONTENT ===
      doc.setTextColor(...BRAND.text);
      doc.setFontSize(10);

      if (isTable && rows.length > 0) {
        // Render as table
        const colWidth = (pageWidth - margin * 2) / Math.max(...rows.map((r) => r.length));

        rows.forEach((row, rowIdx) => {
          const isHeader = rowIdx === 0;

          if (isHeader) {
            doc.setFillColor(...BRAND.lightBg);
            doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
            doc.setFontSize(10);
          }

          row.forEach((cell, colIdx) => {
            const x = margin + colIdx * colWidth;
            doc.text(cell.substring(0, 30), x, y);
          });

          y += 8;

          if (y > 270) {
            doc.addPage();
            y = margin;
          }
        });
      } else {
        // Render as text
        const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
        lines.forEach((line: string) => {
          if (y > 270) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += 6;
        });
      }

      // === FOOTER ===
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Actionable+ Export • Page ${i} of ${pageCount}`, pageWidth / 2, 290, {
          align: 'center',
        });
      }

      doc.save(generateFilename(title, 'pdf'));
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF export failed');
      setStatus('error');
    }
  }, []);

  const exportToXlsx = useCallback(async (content: string, title: string) => {
    setStatus('loading');
    try {
      const XLSX = await loadXLSX();
      const { isTable, rows, text } = parseContent(content);

      let data: string[][];

      if (isTable && rows.length > 0) {
        data = rows;
      } else {
        // Convert text to rows
        data = text.split('\n').map((line) => [line]);
      }

      // Add header row with branding
      const headerRow = ['Actionable+ Export'];
      const dateRow = [`Generated: ${new Date().toLocaleDateString('hu-HU')}`];
      const titleRow = [title || 'Export'];
      const emptyRow = [''];

      const fullData = [headerRow, dateRow, titleRow, emptyRow, ...data];

      const worksheet = XLSX.utils.aoa_to_sheet(fullData);

      // Set column widths
      const maxWidth = Math.max(
        ...fullData.map((row) => Math.max(...row.map((cell) => (cell?.length || 0)))),
      );
      worksheet['!cols'] = Array(10).fill({ wch: Math.min(maxWidth + 2, 50) });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');

      XLSX.writeFile(workbook, generateFilename(title, 'xlsx'));
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Excel export failed');
      setStatus('error');
    }
  }, []);

  const exportToDocx = useCallback(async (content: string, title: string) => {
    setStatus('loading');
    try {
      const docx = await loadDocx();
      const { Document, Paragraph, TextRun, HeadingLevel, Header, Footer, AlignmentType, Packer } =
        docx;
      const { text } = parseContent(content);

      const doc = new Document({
        sections: [
          {
            headers: {
              default: new Header({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Actionable+ ',
                        bold: true,
                        color: '3B82F6',
                        size: 24,
                      }),
                      new TextRun({
                        text: '• E-Commerce Consulting',
                        color: '64748B',
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
            },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: 'Actionable+ Export',
                        color: '94A3B8',
                        size: 16,
                      }),
                    ],
                  }),
                ],
              }),
            },
            children: [
              new Paragraph({
                text: title || 'Export',
                heading: HeadingLevel.HEADING_1,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: new Date().toLocaleDateString('hu-HU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }),
                    color: '64748B',
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({ text: '' }), // Empty line
              ...text.split('\n').map((line) => new Paragraph({ text: line })),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, generateFilename(title, 'docx'));
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'DOCX export failed');
      setStatus('error');
    }
  }, []);

  const exportToPptx = useCallback(async (content: string, title: string) => {
    setStatus('loading');
    try {
      const PptxGenJS = await loadPptxGenJS();
      const pptx = new PptxGenJS();

      // Brand colors
      pptx.author = 'Actionable+';
      pptx.company = 'Actionable+ E-Commerce Consulting';
      pptx.title = title || 'Export';

      const { isTable, rows, text } = parseContent(content);

      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText('Actionable+', {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: 32,
        bold: true,
        color: '3B82F6',
      });
      titleSlide.addText(title || 'Export', {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 1,
        fontSize: 44,
        bold: true,
        color: '1E293B',
      });
      titleSlide.addText(new Date().toLocaleDateString('hu-HU'), {
        x: 0.5,
        y: 2.8,
        w: 9,
        h: 0.5,
        fontSize: 18,
        color: '64748B',
      });

      // Content slides
      if (isTable && rows.length > 0) {
        // Table slide
        const tableSlide = pptx.addSlide();
        tableSlide.addText('Adatok', {
          x: 0.5,
          y: 0.3,
          w: 9,
          h: 0.5,
          fontSize: 24,
          bold: true,
          color: '1E293B',
        });
        tableSlide.addTable(rows.slice(0, 15), {
          // Max 15 rows per slide
          x: 0.5,
          y: 1,
          w: 9,
          h: 4,
          fontSize: 12,
          border: { pt: 1, color: 'E2E8F0' },
          fill: { color: 'F8FAFC' },
        });
      } else {
        // Text content - split into multiple slides if needed
        const lines = text.split('\n');
        const linesPerSlide = 12;
        for (let i = 0; i < lines.length; i += linesPerSlide) {
          const slideLines = lines.slice(i, i + linesPerSlide);
          const contentSlide = pptx.addSlide();
          contentSlide.addText(slideLines.join('\n'), {
            x: 0.5,
            y: 0.5,
            w: 9,
            h: 5,
            fontSize: 14,
            color: '1E293B',
            valign: 'top',
          });
        }
      }

      // Footer on all slides
      pptx.slides.forEach((slide) => {
        slide.addText('Actionable+ Export', {
          x: 0.5,
          y: 5.2,
          w: 9,
          h: 0.3,
          fontSize: 10,
          color: '94A3B8',
          align: 'center',
        });
      });

      pptx.writeFile({ fileName: generateFilename(title, 'pptx') });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PPTX export failed');
      setStatus('error');
    }
  }, []);

  const exportArtifact = useCallback(
    async (content: string, title: string, format: ExportFormat) => {
      setError(null);
      switch (format) {
        case 'txt':
          return exportToTxt(content, title);
        case 'csv':
          return exportToCsv(content, title);
        case 'pdf':
          return exportToPdf(content, title);
        case 'xlsx':
          return exportToXlsx(content, title);
        case 'docx':
          return exportToDocx(content, title);
        case 'pptx':
          return exportToPptx(content, title);
      }
    },
    [exportToTxt, exportToCsv, exportToPdf, exportToXlsx, exportToDocx, exportToPptx],
  );

  return { exportArtifact, status, error };
}
