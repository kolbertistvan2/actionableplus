import React, { useState } from 'react';
import * as Ariakit from '@ariakit/react';
import { Download, FileText, FileSpreadsheet, File, Check, Presentation } from 'lucide-react';
import { Button, Spinner } from '@librechat/client';
import type { Artifact } from '~/common';
import { useArtifactExport, type ExportFormat } from '~/hooks/Artifacts/useArtifactExport';
import { useCodeState } from '~/Providers/EditorContext';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const ExportDropdown = ({ artifact }: { artifact: Artifact }) => {
  const localize = useLocalize();
  const { currentCode } = useCodeState();
  const { exportArtifact, status } = useArtifactExport();
  const [isOpen, setIsOpen] = useState(false);

  const content = currentCode ?? artifact.content ?? '';
  const title = artifact.title ?? 'artifact';

  const handleExport = (format: ExportFormat) => {
    exportArtifact(content, title, format);
    setIsOpen(false);
  };

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  const menuItems = [
    { label: 'Text (.txt)', icon: FileText, format: 'txt' as const },
    { label: 'PDF (.pdf)', icon: File, format: 'pdf' as const },
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
      <Ariakit.Menu gutter={8} className="popover-ui z-50 min-w-[160px]" portal>
        {menuItems.map((item) => (
          <Ariakit.MenuItem
            key={item.format}
            className={cn(
              'group flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
              'text-text-primary outline-none transition-colors hover:bg-surface-hover focus:bg-surface-hover',
            )}
            onClick={() => handleExport(item.format)}
          >
            <item.icon className="h-4 w-4 text-text-secondary" />
            {item.label}
          </Ariakit.MenuItem>
        ))}
      </Ariakit.Menu>
    </Ariakit.MenuProvider>
  );
};

export default ExportDropdown;
