import { useCallback, useState } from 'react';
import { cleanArtifactContent } from '~/components/Artifacts/Code';

type ExportFormat = 'txt' | 'pdf' | 'docx' | 'xlsx' | 'csv';
type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

function sanitizeForFilename(str: string): string {
  return str
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .toLowerCase();
}

function generateExportFilename(title: string, extension: string): string {
  const sanitizedTitle = sanitizeForFilename(title) || 'artifact';
  const timestamp = Math.floor(Date.now() / 1000);
  return `${sanitizedTitle}-actionableplus-export-${timestamp}.${extension}`;
}

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

export function useArtifactExport() {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const exportToTxt = useCallback(async (content: string, title: string) => {
    const cleaned = cleanArtifactContent(content);
    const filename = generateExportFilename(title, 'txt');
    const blob = new Blob([cleaned], { type: 'text/plain' });
    downloadBlob(blob, filename);
  }, []);

  const exportToPdf = useCallback(async (content: string, title: string) => {
    setStatus('loading');
    try {
      // Dynamic import - only loads when needed
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const cleaned = cleanArtifactContent(content);

      // Word wrap for PDF
      const lines = doc.splitTextToSize(cleaned, 180);
      doc.text(lines, 15, 15);

      const filename = generateExportFilename(title, 'pdf');
      doc.save(filename);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF export failed');
      setStatus('error');
    }
  }, []);

  const exportToDocx = useCallback(async (content: string, title: string) => {
    setStatus('loading');
    try {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const cleaned = cleanArtifactContent(content);

      const doc = new Document({
        sections: [
          {
            children: cleaned.split('\n').map(
              (line) =>
                new Paragraph({
                  children: [new TextRun(line)],
                }),
            ),
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const filename = generateExportFilename(title, 'docx');
      downloadBlob(
        blob,
        filename,
      );
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'DOCX export failed');
      setStatus('error');
    }
  }, []);

  const exportToXlsx = useCallback(async (content: string, title: string) => {
    setStatus('loading');
    try {
      const XLSX = await import('xlsx');
      const cleaned = cleanArtifactContent(content);

      // Parse content as CSV-like data or simple text rows
      const rows = cleaned.split('\n').map((line) => [line]);
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');

      const filename = generateExportFilename(title, 'xlsx');
      XLSX.writeFile(workbook, filename);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'XLSX export failed');
      setStatus('error');
    }
  }, []);

  const exportToCsv = useCallback(async (content: string, title: string) => {
    const cleaned = cleanArtifactContent(content);
    const filename = generateExportFilename(title, 'csv');
    const blob = new Blob([cleaned], { type: 'text/csv' });
    downloadBlob(blob, filename);
  }, []);

  const exportArtifact = useCallback(
    async (content: string, title: string, format: ExportFormat) => {
      setError(null);
      switch (format) {
        case 'txt':
          return exportToTxt(content, title);
        case 'pdf':
          return exportToPdf(content, title);
        case 'docx':
          return exportToDocx(content, title);
        case 'xlsx':
          return exportToXlsx(content, title);
        case 'csv':
          return exportToCsv(content, title);
      }
    },
    [exportToTxt, exportToPdf, exportToDocx, exportToXlsx, exportToCsv],
  );

  return { exportArtifact, status, error };
}
