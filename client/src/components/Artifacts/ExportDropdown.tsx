import React, { useState, useMemo, useCallback } from 'react';
import * as Ariakit from '@ariakit/react';
import { Download, FileText, FileSpreadsheet, File, Check, Presentation, CheckCircle2 } from 'lucide-react';
import { Button, Spinner } from '@librechat/client';
import type { SandpackPreviewRef } from '@codesandbox/sandpack-react';
import type { Artifact } from '~/common';
import { useArtifactExport, type ExportFormat } from '~/hooks/Artifacts/useArtifactExport';
import { useCodeState } from '~/Providers/EditorContext';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

// Patterns to detect built-in export functions in artifact code
const BUILT_IN_EXPORT_PATTERNS = [
  /function\s+(downloadPDF|exportToPDF|exportPresentation|downloadPresentation)\s*\(/,
  /const\s+(downloadPDF|exportToPDF|exportPresentation|downloadPresentation)\s*=/,
  /(?:window\.)?(downloadPDF|exportToPDF|exportPresentation|downloadPresentation)\s*=\s*(?:function|\()/,
];

/**
 * Check if the content has a built-in export function
 * Returns the function name if found, null otherwise
 */
function getBuiltInExportFunction(content: string): string | null {
  for (const pattern of BUILT_IN_EXPORT_PATTERNS) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

interface ExportDropdownProps {
  artifact: Artifact;
  previewRef?: React.MutableRefObject<SandpackPreviewRef | undefined>;
}

const ExportDropdown = ({ artifact, previewRef }: ExportDropdownProps) => {
  const localize = useLocalize();
  const { currentCode } = useCodeState();
  const { exportArtifact, getRecommendedFormatsForContent, status, setStatus } = useArtifactExport();
  const [isOpen, setIsOpen] = useState(false);

  const content = currentCode ?? artifact.content ?? '';
  const title = artifact.title ?? 'artifact';
  const artifactType = artifact.type;

  // Check if artifact has built-in export function
  const builtInExportFn = useMemo(() => getBuiltInExportFunction(content), [content]);

  // Calculate recommended formats based on content type
  const recommendedFormats = useMemo(() => {
    return getRecommendedFormatsForContent(content, artifactType);
  }, [content, artifactType, getRecommendedFormatsForContent]);

  /**
   * Try to call the built-in export function in the Sandpack iframe
   */
  const callBuiltInExport = useCallback(async (): Promise<boolean> => {
    if (!builtInExportFn || !previewRef?.current) {
      return false;
    }

    try {
      const client = previewRef.current.getClient();
      if (!client) {
        console.warn('Sandpack client not available');
        return false;
      }

      // Access the iframe's contentWindow
      const iframe = client.iframe;
      if (!iframe?.contentWindow) {
        console.warn('Sandpack iframe not available');
        return false;
      }

      // Try to call the function
      const win = iframe.contentWindow as Window & { [key: string]: unknown };
      const exportFn = win[builtInExportFn];

      if (typeof exportFn === 'function') {
        setStatus('loading');
        await exportFn();
        setStatus('success');
        setTimeout(() => setStatus('idle'), 2000);
        return true;
      } else {
        console.warn(`Built-in export function "${builtInExportFn}" not found in iframe`);
        return false;
      }
    } catch (error) {
      console.error('Error calling built-in export:', error);
      return false;
    }
  }, [builtInExportFn, previewRef, setStatus]);

  const handleExport = async (format: ExportFormat) => {
    setIsOpen(false);

    // For PDF format, try to use built-in export if available
    if (format === 'pdf' && builtInExportFn) {
      const success = await callBuiltInExport();
      if (success) {
        return;
      }
      // Fall through to default export if built-in fails
      console.log('Built-in export failed, falling back to default export');
    }

    // Default export logic
    exportArtifact(content, title, format, artifactType);
  };

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  const menuItems = [
    { label: 'Text (.txt)', icon: FileText, format: 'txt' as const },
    { label: 'PDF (.pdf)', icon: File, format: 'pdf' as const, hasBuiltIn: !!builtInExportFn },
    { label: 'Word (.docx)', icon: FileText, format: 'docx' as const },
    { label: 'PowerPoint (.pptx)', icon: Presentation, format: 'pptx' as const },
    { label: 'CSV (.csv)', icon: FileSpreadsheet, format: 'csv' as const },
    { label: 'Excel (.xlsx)', icon: FileSpreadsheet, format: 'xlsx' as const },
  ];

  const menu = Ariakit.useMenuStore({ open: isOpen, setOpen: setIsOpen });

  return (
    <Ariakit.MenuProvider store={menu}>
      <Ariakit.MenuButton
        render={
          <Button
            size="icon"
            variant="ghost"
            disabled={isLoading}
            aria-label={localize('com_ui_download_artifact')}
          />
        }
      >
        {isLoading ? (
          <Spinner size={16} />
        ) : isSuccess ? (
          <Check size={16} className="text-green-500" />
        ) : (
          <Download size={16} />
        )}
      </Ariakit.MenuButton>
      <Ariakit.Menu gutter={8} className="popover-ui z-50 min-w-[180px]" portal>
        {menuItems.map((item) => {
          const isRecommended = recommendedFormats.includes(item.format);
          const showBuiltInIndicator = 'hasBuiltIn' in item && item.hasBuiltIn;
          return (
            <Ariakit.MenuItem
              key={item.format}
              className={cn(
                'group flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
                'text-text-primary outline-none transition-colors hover:bg-surface-hover focus:bg-surface-hover',
              )}
              onClick={() => handleExport(item.format)}
            >
              <item.icon className="h-4 w-4 flex-shrink-0 text-text-secondary" />
              <span className="flex-1">
                {item.label}
                {showBuiltInIndicator && (
                  <span className="ml-1 text-xs text-green-500">★</span>
                )}
              </span>
              {isRecommended && (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
              )}
            </Ariakit.MenuItem>
          );
        })}
      </Ariakit.Menu>
    </Ariakit.MenuProvider>
  );
};

export default ExportDropdown;
