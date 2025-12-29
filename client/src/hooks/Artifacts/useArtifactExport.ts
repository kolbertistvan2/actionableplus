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

// Content type detection
type ContentType = 'table' | 'code' | 'markdown' | 'text';

interface ParsedContent {
  type: ContentType;
  rows: string[][];
  text: string;
  headings: { level: number; text: string; lineIndex: number }[];
  listItems: { text: string; lineIndex: number }[];
}

// Detect if content is code
function isCodeContent(content: string): boolean {
  const codeIndicators = [
    /^import\s+/m, // import statements
    /^export\s+/m, // export statements
    /^const\s+\w+\s*=/m, // const declarations
    /^let\s+\w+\s*=/m, // let declarations
    /^function\s+\w+/m, // function declarations
    /^class\s+\w+/m, // class declarations
    /<\w+[^>]*>/m, // HTML/JSX tags
    /^\s*\{[\s\S]*\}\s*$/m, // JSON-like objects
    /^<!DOCTYPE/i, // HTML doctype
    /^<html/i, // HTML tag
    /@import\s+/m, // CSS imports
    /\.\w+\s*\{/m, // CSS selectors
  ];

  return codeIndicators.some((pattern) => pattern.test(content));
}

// Detect if content is markdown
function isMarkdownContent(content: string): boolean {
  const lines = content.trim().split('\n');
  let markdownFeatures = 0;

  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) markdownFeatures++; // Headings
    if (/^\s*[-*+]\s+/.test(line)) markdownFeatures++; // Lists
    if (/^\s*\d+\.\s+/.test(line)) markdownFeatures++; // Numbered lists
    if (/\*\*[^*]+\*\*/.test(line)) markdownFeatures++; // Bold
    if (/\*[^*]+\*/.test(line)) markdownFeatures++; // Italic
    if (/\[.+\]\(.+\)/.test(line)) markdownFeatures++; // Links
  }

  return markdownFeatures >= 3;
}

// Detect if content is a table (markdown or CSV)
function isTableContent(content: string): { isTable: boolean; delimiter: string } {
  const lines = content.trim().split('\n').filter((l) => l.trim());

  // Check for markdown table (pipes with separator line)
  const hasPipes = lines.filter((l) => l.includes('|')).length > 2;
  const hasSeparatorLine = lines.some((l) => /^\|?[-:\s|]+\|?$/.test(l));

  if (hasPipes && hasSeparatorLine) {
    return { isTable: true, delimiter: '|' };
  }

  // Check for CSV (consistent comma count across lines)
  const commaCountsPerLine = lines.map((l) => (l.match(/,/g) || []).length);
  const avgCommas = commaCountsPerLine.reduce((a, b) => a + b, 0) / lines.length;
  const consistentCommas =
    avgCommas >= 1 && commaCountsPerLine.every((c) => Math.abs(c - avgCommas) <= 1);

  if (consistentCommas && lines.length >= 2) {
    return { isTable: true, delimiter: ',' };
  }

  // Check for tab-separated
  const hasTabsConsistently = lines.every((l) => l.includes('\t'));
  if (hasTabsConsistently && lines.length >= 2) {
    return { isTable: true, delimiter: '\t' };
  }

  return { isTable: false, delimiter: '' };
}

// Parse markdown content for structure
function parseMarkdownStructure(
  content: string,
): Pick<ParsedContent, 'headings' | 'listItems'> {
  const lines = content.split('\n');
  const headings: ParsedContent['headings'] = [];
  const listItems: ParsedContent['listItems'] = [];

  lines.forEach((line, index) => {
    // Detect headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      headings.push({
        level: headingMatch[1].length,
        text: headingMatch[2],
        lineIndex: index,
      });
    }

    // Detect list items
    const listMatch = line.match(/^\s*[-*+]\s+(.+)$/) || line.match(/^\s*\d+\.\s+(.+)$/);
    if (listMatch) {
      listItems.push({
        text: listMatch[1],
        lineIndex: index,
      });
    }
  });

  return { headings, listItems };
}

// Parse content - detect type and extract structured data
function parseContent(content: string): ParsedContent {
  const cleaned = cleanArtifactContent(content);
  const lines = cleaned.trim().split('\n');

  // Check for code first (highest priority to avoid wrong detection)
  if (isCodeContent(cleaned)) {
    return {
      type: 'code',
      rows: [],
      text: cleaned,
      headings: [],
      listItems: [],
    };
  }

  // Check for table
  const tableCheck = isTableContent(cleaned);
  if (tableCheck.isTable) {
    const rows = lines
      .filter((l) => l.trim())
      .filter((l) => !/^[-:\s|]+$/.test(l)) // Filter out separator lines
      .map((l) =>
        l
          .split(tableCheck.delimiter)
          .map((cell) => cell.trim())
          .filter((cell) => cell !== ''),
      )
      .filter((row) => row.length > 0);

    return {
      type: 'table',
      rows,
      text: cleaned,
      headings: [],
      listItems: [],
    };
  }

  // Check for markdown
  if (isMarkdownContent(cleaned)) {
    const { headings, listItems } = parseMarkdownStructure(cleaned);
    return {
      type: 'markdown',
      rows: [],
      text: cleaned,
      headings,
      listItems,
    };
  }

  // Default to plain text
  return {
    type: 'text',
    rows: [],
    text: cleaned,
    headings: [],
    listItems: [],
  };
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
      const parsed = parseContent(content);

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let y = margin;

      // Helper to check page break
      const checkPageBreak = (requiredSpace: number = 20) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = margin;
        }
      };

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
      doc.setFontSize(20);
      const titleLines = doc.splitTextToSize(title || 'Export', pageWidth - margin * 2);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 8 + 5;

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
      y += 12;

      // Separator line
      doc.setDrawColor(...BRAND.border);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // === CONTENT based on type ===
      doc.setTextColor(...BRAND.text);

      switch (parsed.type) {
        case 'table': {
          // Professional table rendering
          const { rows } = parsed;
          if (rows.length === 0) break;

          const numCols = Math.max(...rows.map((r) => r.length));
          const tableWidth = pageWidth - margin * 2;
          const colWidth = tableWidth / numCols;
          const rowHeight = 8;

          rows.forEach((row, rowIdx) => {
            checkPageBreak(rowHeight + 5);

            const isHeader = rowIdx === 0;

            // Background for header row
            if (isHeader) {
              doc.setFillColor(...BRAND.primary);
              doc.rect(margin, y - 5, tableWidth, rowHeight + 2, 'F');
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(10);
            } else {
              // Alternating row colors
              if (rowIdx % 2 === 0) {
                doc.setFillColor(...BRAND.lightBg);
                doc.rect(margin, y - 5, tableWidth, rowHeight + 2, 'F');
              }
              doc.setTextColor(...BRAND.text);
              doc.setFontSize(9);
            }

            // Cell borders
            doc.setDrawColor(...BRAND.border);
            doc.setLineWidth(0.2);
            doc.rect(margin, y - 5, tableWidth, rowHeight + 2);

            // Cell content
            row.forEach((cell, colIdx) => {
              const x = margin + colIdx * colWidth + 2;
              const cellText = cell.length > 25 ? cell.substring(0, 22) + '...' : cell;
              doc.text(cellText, x, y);
            });

            y += rowHeight + 2;
          });
          break;
        }

        case 'code': {
          // Code block with monospace styling
          doc.setFillColor(245, 245, 245);
          const codeLines = parsed.text.split('\n');
          const codeBlockHeight = Math.min(codeLines.length * 5 + 10, pageHeight - y - 40);

          doc.rect(margin, y - 3, pageWidth - margin * 2, codeBlockHeight, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(margin, y - 3, pageWidth - margin * 2, codeBlockHeight);

          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);

          let codeY = y + 5;
          codeLines.forEach((line, idx) => {
            if (codeY > pageHeight - 40) {
              doc.addPage();
              codeY = margin + 5;
              // Redraw code background on new page
              doc.setFillColor(245, 245, 245);
              doc.rect(margin, margin - 3, pageWidth - margin * 2, pageHeight - margin * 2 - 20, 'F');
            }

            // Line number
            doc.setTextColor(150, 150, 150);
            doc.text(String(idx + 1).padStart(3, ' '), margin + 3, codeY);

            // Code content
            doc.setTextColor(60, 60, 60);
            const codeLine = line.substring(0, 80); // Truncate long lines
            doc.text(codeLine, margin + 18, codeY);

            codeY += 5;
          });

          y = codeY + 5;
          break;
        }

        case 'markdown': {
          // Rich markdown rendering
          const lines = parsed.text.split('\n');

          lines.forEach((line) => {
            checkPageBreak(12);

            // Heading detection
            const h1Match = line.match(/^#\s+(.+)$/);
            const h2Match = line.match(/^##\s+(.+)$/);
            const h3Match = line.match(/^###\s+(.+)$/);
            const listMatch = line.match(/^\s*[-*+]\s+(.+)$/);
            const numberedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);

            if (h1Match) {
              doc.setFontSize(16);
              doc.setTextColor(...BRAND.primary);
              y += 5;
              doc.text(h1Match[1], margin, y);
              y += 10;
            } else if (h2Match) {
              doc.setFontSize(14);
              doc.setTextColor(...BRAND.secondary);
              y += 4;
              doc.text(h2Match[1], margin, y);
              y += 8;
            } else if (h3Match) {
              doc.setFontSize(12);
              doc.setTextColor(...BRAND.text);
              y += 3;
              doc.text(h3Match[1], margin, y);
              y += 7;
            } else if (listMatch) {
              doc.setFontSize(10);
              doc.setTextColor(...BRAND.text);
              doc.text('•', margin + 5, y);
              const listText = doc.splitTextToSize(listMatch[1], pageWidth - margin * 2 - 15);
              doc.text(listText, margin + 12, y);
              y += listText.length * 5 + 2;
            } else if (numberedMatch) {
              doc.setFontSize(10);
              doc.setTextColor(...BRAND.text);
              doc.text(`${numberedMatch[1]}.`, margin + 3, y);
              const listText = doc.splitTextToSize(numberedMatch[2], pageWidth - margin * 2 - 15);
              doc.text(listText, margin + 12, y);
              y += listText.length * 5 + 2;
            } else if (line.trim() === '') {
              y += 4;
            } else {
              // Regular paragraph - handle bold and italic
              doc.setFontSize(10);
              doc.setTextColor(...BRAND.text);
              let processedLine = line.replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove bold markers
              processedLine = processedLine.replace(/\*([^*]+)\*/g, '$1'); // Remove italic markers
              const wrappedLines = doc.splitTextToSize(processedLine, pageWidth - margin * 2);
              doc.text(wrappedLines, margin, y);
              y += wrappedLines.length * 5 + 2;
            }
          });
          break;
        }

        default: {
          // Plain text - simple paragraph rendering
          doc.setFontSize(11);
          doc.setTextColor(...BRAND.text);

          const paragraphs = parsed.text.split('\n\n');
          paragraphs.forEach((paragraph) => {
            checkPageBreak(15);

            const lines = doc.splitTextToSize(paragraph.replace(/\n/g, ' '), pageWidth - margin * 2);
            doc.text(lines, margin, y);
            y += lines.length * 6 + 8;
          });
        }
      }

      // === FOOTER on all pages ===
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Actionable+ Export • ${i} / ${pageCount}`, pageWidth / 2, pageHeight - 10, {
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
      const parsed = parseContent(content);

      let data: string[][];

      if (parsed.type === 'table' && parsed.rows.length > 0) {
        data = parsed.rows;
      } else {
        // Convert text to rows
        data = parsed.text.split('\n').map((line) => [line]);
      }

      // Add header rows with branding
      const headerRow = ['Actionable+ Export'];
      const dateRow = [`Generated: ${new Date().toLocaleDateString('hu-HU')}`];
      const titleRow = [title || 'Export'];
      const emptyRow = [''];

      const fullData = [headerRow, dateRow, titleRow, emptyRow, ...data];

      const worksheet = XLSX.utils.aoa_to_sheet(fullData);

      // Calculate column widths based on content
      const numCols = Math.max(...fullData.map((row) => row.length));
      const colWidths: number[] = [];

      for (let col = 0; col < numCols; col++) {
        const maxLen = Math.max(
          ...fullData.map((row) => (row[col]?.toString().length || 0)),
        );
        colWidths.push(Math.min(Math.max(maxLen + 2, 10), 50));
      }
      worksheet['!cols'] = colWidths.map((wch) => ({ wch }));

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
      const parsed = parseContent(content);

      // Build content paragraphs based on type
      const buildContentParagraphs = (): unknown[] => {
        const paragraphs: unknown[] = [];

        switch (parsed.type) {
          case 'table': {
            // Render table as formatted text (docx tables require more complex setup)
            parsed.rows.forEach((row, rowIdx) => {
              const isHeader = rowIdx === 0;
              paragraphs.push(
                new Paragraph({
                  children: row.map((cell, cellIdx) =>
                    new TextRun({
                      text: cell + (cellIdx < row.length - 1 ? '  |  ' : ''),
                      bold: isHeader,
                      color: isHeader ? '3B82F6' : '1E293B',
                      size: isHeader ? 24 : 22,
                    }),
                  ),
                  spacing: { after: 120 },
                }),
              );

              // Add separator after header
              if (isHeader) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: '─'.repeat(50),
                        color: 'E2E8F0',
                        size: 20,
                      }),
                    ],
                    spacing: { after: 120 },
                  }),
                );
              }
            });
            break;
          }

          case 'markdown': {
            parsed.text.split('\n').forEach((line) => {
              const h1Match = line.match(/^#\s+(.+)$/);
              const h2Match = line.match(/^##\s+(.+)$/);
              const h3Match = line.match(/^###\s+(.+)$/);
              const listMatch = line.match(/^\s*[-*+]\s+(.+)$/);
              const numberedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);

              if (h1Match) {
                paragraphs.push(
                  new Paragraph({
                    text: h1Match[1],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 240, after: 120 },
                  }),
                );
              } else if (h2Match) {
                paragraphs.push(
                  new Paragraph({
                    text: h2Match[1],
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 },
                  }),
                );
              } else if (h3Match) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: h3Match[1],
                        bold: true,
                        size: 26,
                        color: '374151',
                      }),
                    ],
                    spacing: { before: 160, after: 80 },
                  }),
                );
              } else if (listMatch) {
                // Clean markdown formatting from list item
                let itemText = listMatch[1];
                itemText = itemText.replace(/\*\*([^*]+)\*\*/g, '$1');
                itemText = itemText.replace(/\*([^*]+)\*/g, '$1');

                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({ text: '•  ', color: '3B82F6' }),
                      new TextRun({ text: itemText, size: 22 }),
                    ],
                    indent: { left: 360 },
                    spacing: { after: 60 },
                  }),
                );
              } else if (numberedMatch) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({ text: `${numberedMatch[1]}.  `, bold: true, color: '3B82F6' }),
                      new TextRun({ text: numberedMatch[2], size: 22 }),
                    ],
                    indent: { left: 360 },
                    spacing: { after: 60 },
                  }),
                );
              } else if (line.trim()) {
                // Regular paragraph - handle bold and italic
                let processedText = line.replace(/\*\*([^*]+)\*\*/g, '$1');
                processedText = processedText.replace(/\*([^*]+)\*/g, '$1');

                paragraphs.push(
                  new Paragraph({
                    children: [new TextRun({ text: processedText, size: 22 })],
                    spacing: { after: 80 },
                  }),
                );
              } else {
                // Empty line
                paragraphs.push(new Paragraph({ text: '' }));
              }
            });
            break;
          }

          case 'code': {
            // Code block with monospace styling
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Kód:',
                    bold: true,
                    size: 24,
                    color: '374151',
                  }),
                ],
                spacing: { after: 120 },
              }),
            );

            parsed.text.split('\n').forEach((line, idx) => {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${String(idx + 1).padStart(3, ' ')}  `,
                      color: '9CA3AF',
                      size: 18,
                      font: 'Courier New',
                    }),
                    new TextRun({
                      text: line,
                      size: 18,
                      font: 'Courier New',
                      color: '1F2937',
                    }),
                  ],
                  shading: { fill: 'F3F4F6' },
                  spacing: { after: 20 },
                }),
              );
            });
            break;
          }

          default: {
            // Plain text
            parsed.text.split('\n').forEach((line) => {
              if (line.trim()) {
                paragraphs.push(
                  new Paragraph({
                    children: [new TextRun({ text: line, size: 22 })],
                    spacing: { after: 120 },
                  }),
                );
              } else {
                paragraphs.push(new Paragraph({ text: '' }));
              }
            });
          }
        }

        return paragraphs;
      };

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
              ...buildContentParagraphs(),
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

      const parsed = parseContent(content);

      // Title slide with gradient background
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

      // Content slides based on type
      switch (parsed.type) {
        case 'table': {
          // Table slides - split into multiple if needed
          const rowsPerSlide = 12;
          for (let i = 0; i < parsed.rows.length; i += rowsPerSlide) {
            const slideRows = parsed.rows.slice(i, i + rowsPerSlide);
            const tableSlide = pptx.addSlide();

            tableSlide.addText(i === 0 ? 'Adatok' : `Adatok (folytatás ${Math.floor(i / rowsPerSlide) + 1})`, {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.5,
              fontSize: 24,
              bold: true,
              color: '1E293B',
            });

            // Format table with header styling
            const tableRows = slideRows.map((row, rowIdx) => {
              return row.map((cell) => ({
                text: cell,
                options: {
                  fill: rowIdx === 0 && i === 0 ? '3B82F6' : rowIdx % 2 === 0 ? 'F8FAFC' : 'FFFFFF',
                  color: rowIdx === 0 && i === 0 ? 'FFFFFF' : '1E293B',
                  bold: rowIdx === 0 && i === 0,
                },
              }));
            });

            tableSlide.addTable(tableRows, {
              x: 0.5,
              y: 1,
              w: 9,
              colW: Array(Math.max(...slideRows.map((r) => r.length))).fill(9 / Math.max(...slideRows.map((r) => r.length))),
              fontSize: 11,
              border: { pt: 0.5, color: 'E2E8F0' },
            });
          }
          break;
        }

        case 'markdown': {
          // Markdown slides - extract headings as slide titles
          const sections: { title: string; content: string[] }[] = [];
          let currentSection = { title: title || 'Tartalom', content: [] as string[] };

          parsed.text.split('\n').forEach((line) => {
            const h1Match = line.match(/^#\s+(.+)$/);
            const h2Match = line.match(/^##\s+(.+)$/);

            if (h1Match || h2Match) {
              if (currentSection.content.length > 0) {
                sections.push(currentSection);
              }
              currentSection = { title: h1Match?.[1] || h2Match?.[1] || '', content: [] };
            } else if (line.trim()) {
              // Clean markdown formatting
              let cleanLine = line.replace(/^###?\s+/, ''); // Remove heading markers
              cleanLine = cleanLine.replace(/\*\*([^*]+)\*\*/g, '$1'); // Bold
              cleanLine = cleanLine.replace(/\*([^*]+)\*/g, '$1'); // Italic
              cleanLine = cleanLine.replace(/^\s*[-*+]\s+/, '• '); // Bullet points
              currentSection.content.push(cleanLine);
            }
          });

          if (currentSection.content.length > 0) {
            sections.push(currentSection);
          }

          // Create slides from sections
          sections.forEach((section) => {
            const contentSlide = pptx.addSlide();
            contentSlide.addText(section.title, {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.6,
              fontSize: 28,
              bold: true,
              color: '1E293B',
            });

            // Split content into chunks for readability
            const linesPerSlide = 10;
            const displayContent = section.content.slice(0, linesPerSlide).join('\n');
            contentSlide.addText(displayContent, {
              x: 0.5,
              y: 1.2,
              w: 9,
              h: 4,
              fontSize: 16,
              color: '374151',
              valign: 'top',
              lineSpacingMultiple: 1.3,
            });
          });
          break;
        }

        case 'code': {
          // Code slide with monospace styling
          const codeSlide = pptx.addSlide();
          codeSlide.addText('Kód', {
            x: 0.5,
            y: 0.3,
            w: 9,
            h: 0.5,
            fontSize: 24,
            bold: true,
            color: '1E293B',
          });

          // Code block background
          codeSlide.addShape('rect', {
            x: 0.3,
            y: 0.9,
            w: 9.4,
            h: 4.2,
            fill: 'F3F4F6',
            line: { color: 'E5E7EB', pt: 1 },
          });

          // Code content (first 25 lines)
          const codeLines = parsed.text.split('\n').slice(0, 25);
          codeSlide.addText(codeLines.join('\n'), {
            x: 0.5,
            y: 1.0,
            w: 9,
            h: 4,
            fontSize: 10,
            fontFace: 'Courier New',
            color: '1F2937',
            valign: 'top',
          });
          break;
        }

        default: {
          // Plain text - split into slides
          const lines = parsed.text.split('\n').filter((l) => l.trim());
          const linesPerSlide = 10;

          for (let i = 0; i < lines.length; i += linesPerSlide) {
            const slideLines = lines.slice(i, i + linesPerSlide);
            const contentSlide = pptx.addSlide();

            contentSlide.addText(slideLines.join('\n\n'), {
              x: 0.5,
              y: 0.5,
              w: 9,
              h: 4.5,
              fontSize: 16,
              color: '1E293B',
              valign: 'top',
              lineSpacingMultiple: 1.4,
            });
          }
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
