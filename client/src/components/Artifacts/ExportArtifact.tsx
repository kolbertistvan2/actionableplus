import React, { useState, useCallback } from 'react';
import { Download, FileText, FileSpreadsheet, FileType, CircleCheckBig } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Button,
} from '@librechat/client';
import type { Artifact } from '~/common';
import useArtifactProps from '~/hooks/Artifacts/useArtifactProps';
import { useCodeState } from '~/Providers/EditorContext';
import { useLocalize } from '~/hooks';

type ExportFormat = 'txt' | 'docx' | 'pdf' | 'csv' | 'xlsx';

interface ExportOption {
  format: ExportFormat;
  label: string;
  icon: React.ReactNode;
  mimeType: string;
  extension: string;
  requiresTable?: boolean;
}

const exportOptions: ExportOption[] = [
  {
    format: 'txt',
    label: 'Plain Text (.txt)',
    icon: <FileText className="mr-2 h-4 w-4" />,
    mimeType: 'text/plain',
    extension: '.txt',
  },
  {
    format: 'docx',
    label: 'Word Document (.docx)',
    icon: <FileType className="mr-2 h-4 w-4" />,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: '.docx',
  },
  {
    format: 'pdf',
    label: 'PDF Document (.pdf)',
    icon: <FileText className="mr-2 h-4 w-4" />,
    mimeType: 'application/pdf',
    extension: '.pdf',
  },
  {
    format: 'csv',
    label: 'CSV Spreadsheet (.csv)',
    icon: <FileSpreadsheet className="mr-2 h-4 w-4" />,
    mimeType: 'text/csv',
    extension: '.csv',
    requiresTable: true,
  },
  {
    format: 'xlsx',
    label: 'Excel Spreadsheet (.xlsx)',
    icon: <FileSpreadsheet className="mr-2 h-4 w-4" />,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: '.xlsx',
    requiresTable: true,
  },
];

/**
 * Detect if content contains table data (markdown tables or HTML tables)
 */
function hasTableContent(content: string): boolean {
  // Markdown table pattern: | col1 | col2 |
  const markdownTablePattern = /\|[^|]+\|/;
  // HTML table pattern
  const htmlTablePattern = /<table[\s>]/i;
  // Tab-separated values (common in data)
  const tsvPattern = /^[^\t\n]+\t[^\t\n]+/m;

  return markdownTablePattern.test(content) || htmlTablePattern.test(content) || tsvPattern.test(content);
}

/**
 * Extract table data from content for CSV/XLSX export
 */
function extractTableData(content: string): string[][] {
  const rows: string[][] = [];

  // Try markdown table first
  const lines = content.split('\n');
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Skip separator rows (|---|---|)
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
        continue;
      }
      const cells = trimmed
        .slice(1, -1) // Remove leading/trailing |
        .split('|')
        .map(cell => cell.trim());
      rows.push(cells);
      inTable = true;
    } else if (inTable && trimmed === '') {
      // End of table
      break;
    }
  }

  // If no markdown table found, try tab-separated
  if (rows.length === 0) {
    for (const line of lines) {
      if (line.includes('\t')) {
        rows.push(line.split('\t').map(cell => cell.trim()));
      }
    }
  }

  return rows;
}

/**
 * Get base filename without extension
 */
function getBaseFilename(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Export as plain text
 */
function exportAsTxt(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
}

/**
 * Export as CSV
 */
function exportAsCsv(content: string, filename: string): void {
  const tableData = extractTableData(content);
  if (tableData.length === 0) {
    // Fallback: export as plain text if no table found
    exportAsTxt(content, filename.replace('.csv', '.txt'));
    return;
  }

  const csvContent = tableData
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
}

/**
 * Export as DOCX (requires docx library)
 */
async function exportAsDocx(content: string, filename: string): Promise<void> {
  try {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

    const lines = content.split('\n');
    const children: typeof Paragraph[] = [];

    for (const line of lines) {
      let paragraph;

      // Handle markdown headers
      if (line.startsWith('# ')) {
        paragraph = new Paragraph({
          text: line.slice(2),
          heading: HeadingLevel.HEADING_1,
        });
      } else if (line.startsWith('## ')) {
        paragraph = new Paragraph({
          text: line.slice(3),
          heading: HeadingLevel.HEADING_2,
        });
      } else if (line.startsWith('### ')) {
        paragraph = new Paragraph({
          text: line.slice(4),
          heading: HeadingLevel.HEADING_3,
        });
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        paragraph = new Paragraph({
          children: [new TextRun({ text: '• ' + line.slice(2) })],
        });
      } else if (/^\d+\.\s/.test(line)) {
        paragraph = new Paragraph({
          children: [new TextRun({ text: line })],
        });
      } else if (line.startsWith('**') && line.endsWith('**')) {
        paragraph = new Paragraph({
          children: [new TextRun({ text: line.slice(2, -2), bold: true })],
        });
      } else {
        // Handle inline bold/italic
        const runs: InstanceType<typeof TextRun>[] = [];
        let remaining = line;
        const boldItalicPattern = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*/g;
        let lastIndex = 0;
        let match;

        while ((match = boldItalicPattern.exec(line)) !== null) {
          if (match.index > lastIndex) {
            runs.push(new TextRun({ text: line.slice(lastIndex, match.index) }));
          }
          if (match[1]) {
            runs.push(new TextRun({ text: match[1], bold: true, italics: true }));
          } else if (match[2]) {
            runs.push(new TextRun({ text: match[2], bold: true }));
          } else if (match[3]) {
            runs.push(new TextRun({ text: match[3], italics: true }));
          }
          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < line.length) {
          runs.push(new TextRun({ text: line.slice(lastIndex) }));
        }

        paragraph = new Paragraph({
          children: runs.length > 0 ? runs : [new TextRun({ text: line })],
        });
      }

      children.push(paragraph);
    }

    const doc = new Document({
      sections: [{ children }],
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('DOCX export failed:', error);
    // Fallback to TXT
    exportAsTxt(content, filename.replace('.docx', '.txt'));
  }
}

/**
 * Export as PDF (requires jspdf library)
 */
async function exportAsPdf(content: string, filename: string): Promise<void> {
  try {
    const { default: jsPDF } = await import('jspdf');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let y = margin;

    const lines = content.split('\n');

    for (const line of lines) {
      // Handle headers
      if (line.startsWith('# ')) {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        const text = line.slice(2);
        const splitText = doc.splitTextToSize(text, maxWidth);
        doc.text(splitText, margin, y);
        y += splitText.length * 8 + 4;
      } else if (line.startsWith('## ')) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const text = line.slice(3);
        const splitText = doc.splitTextToSize(text, maxWidth);
        doc.text(splitText, margin, y);
        y += splitText.length * 6 + 3;
      } else if (line.startsWith('### ')) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const text = line.slice(4);
        const splitText = doc.splitTextToSize(text, maxWidth);
        doc.text(splitText, margin, y);
        y += splitText.length * 5 + 2;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        // Remove markdown formatting for PDF
        const cleanText = line
          .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1');
        const splitText = doc.splitTextToSize(cleanText, maxWidth);
        doc.text(splitText, margin, y);
        y += splitText.length * 5;
      }

      // Add new page if needed
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
    }

    doc.save(filename);
  } catch (error) {
    console.error('PDF export failed:', error);
    // Fallback to TXT
    exportAsTxt(content, filename.replace('.pdf', '.txt'));
  }
}

/**
 * Export as XLSX (requires xlsx library)
 */
async function exportAsXlsx(content: string, filename: string): Promise<void> {
  try {
    const XLSX = await import('xlsx');

    const tableData = extractTableData(content);
    if (tableData.length === 0) {
      // Fallback: create single column with content lines
      const lines = content.split('\n').map(line => [line]);
      const ws = XLSX.utils.aoa_to_sheet(lines);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, filename);
      return;
    }

    const ws = XLSX.utils.aoa_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('XLSX export failed:', error);
    // Fallback to CSV
    exportAsCsv(content, filename.replace('.xlsx', '.csv'));
  }
}

const ExportArtifact = ({ artifact }: { artifact: Artifact }) => {
  const localize = useLocalize();
  const { currentCode } = useCodeState();
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<ExportFormat | null>(null);
  const { fileKey: fileName } = useArtifactProps({ artifact });

  const content = currentCode ?? artifact.content ?? '';
  const hasTable = hasTableContent(content);
  const baseFilename = getBaseFilename(artifact.title || fileName || 'artifact');

  const handleExport = useCallback(
    async (option: ExportOption) => {
      if (!content || isExporting) {
        return;
      }

      setIsExporting(true);
      const filename = baseFilename + option.extension;

      try {
        switch (option.format) {
          case 'txt':
            exportAsTxt(content, filename);
            break;
          case 'csv':
            exportAsCsv(content, filename);
            break;
          case 'docx':
            await exportAsDocx(content, filename);
            break;
          case 'pdf':
            await exportAsPdf(content, filename);
            break;
          case 'xlsx':
            await exportAsXlsx(content, filename);
            break;
        }

        setExportedFormat(option.format);
        setTimeout(() => setExportedFormat(null), 2000);
      } catch (error) {
        console.error('Export failed:', error);
      } finally {
        setIsExporting(false);
      }
    },
    [content, isExporting, baseFilename],
  );

  const availableOptions = exportOptions.filter(
    option => !option.requiresTable || hasTable,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          disabled={isExporting}
          aria-label={localize('com_ui_download_artifact') ?? 'Download'}
        >
          {exportedFormat ? (
            <CircleCheckBig size={16} aria-hidden="true" className="text-green-500" />
          ) : (
            <Download size={16} aria-hidden="true" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        {availableOptions.map((option, index) => (
          <React.Fragment key={option.format}>
            {option.requiresTable && index > 0 && !exportOptions[index - 1]?.requiresTable && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem
              onClick={() => handleExport(option)}
              disabled={isExporting}
              className="cursor-pointer"
            >
              {option.icon}
              <span>{option.label}</span>
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportArtifact;
