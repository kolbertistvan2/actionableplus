import React, { useState } from 'react';
import { Download, CircleCheckBig } from 'lucide-react';
import type { Artifact } from '~/common';
import { Button } from '@librechat/client';
import { cleanArtifactContent } from './Code';
import { useCodeState } from '~/Providers/EditorContext';
import { useLocalize } from '~/hooks';

/**
 * Sanitize a string for use as a filename
 */
function sanitizeForFilename(str: string): string {
  return str
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .toLowerCase();
}

/**
 * Generate export filename: {title}-actionableplus-export-{timestamp}
 */
function generateExportFilename(title: string, extension: string): string {
  const sanitizedTitle = sanitizeForFilename(title) || 'artifact';
  const timestamp = Math.floor(Date.now() / 1000);
  return `${sanitizedTitle}-actionableplus-export-${timestamp}.${extension}`;
}

const DownloadArtifact = ({ artifact }: { artifact: Artifact }) => {
  const localize = useLocalize();
  const { currentCode } = useCodeState();
  const [isDownloaded, setIsDownloaded] = useState(false);

  const handleDownload = () => {
    try {
      const rawContent = currentCode ?? artifact.content ?? '';
      if (!rawContent) {
        return;
      }
      // Clean content and generate proper filename
      const content = cleanArtifactContent(rawContent);
      const fileName = generateExportFilename(artifact.title ?? 'artifact', 'txt');

      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={handleDownload}
      aria-label={localize('com_ui_download_artifact')}
    >
      {isDownloaded ? (
        <CircleCheckBig size={16} aria-hidden="true" />
      ) : (
        <Download size={16} aria-hidden="true" />
      )}
    </Button>
  );
};

export default DownloadArtifact;
