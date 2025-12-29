import React, { useState } from 'react';
import * as Ariakit from '@ariakit/react';
import { Download, FileText, FileSpreadsheet, File, Check } from 'lucide-react';
import { Button, Spinner } from '@librechat/client';
import type { Artifact } from '~/common';
import { useArtifactExport } from '~/hooks/Artifacts/useArtifactExport';
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

  const handleExport = (format: 'txt' | 'pdf' | 'docx' | 'xlsx' | 'csv') => {
    exportArtifact(content, title, format);
    setIsOpen(false);
  };

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  const menuItems = [
    {
      label: 'Text (.txt)',
      icon: <FileText className="h-4 w-4" />,
      format: 'txt' as const,
    },
    {
      label: 'PDF (.pdf)',
      icon: <File className="h-4 w-4" />,
      format: 'pdf' as const,
    },
    {
      label: 'Word (.docx)',
      icon: <FileText className="h-4 w-4" />,
      format: 'docx' as const,
    },
    {
      label: 'CSV (.csv)',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      format: 'csv' as const,
    },
    {
      label: 'Excel (.xlsx)',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      format: 'xlsx' as const,
    },
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
          <Check size={16} className="text-green-500" aria-hidden="true" />
        ) : (
          <Download size={16} aria-hidden="true" />
        )}
      </Ariakit.MenuButton>
      <Ariakit.Menu
        gutter={8}
        className="popover-ui z-50 min-w-[160px]"
        portal={true}
      >
        {menuItems.map((item) => (
          <Ariakit.MenuItem
            key={item.format}
            className={cn(
              'group flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors duration-200',
              'hover:bg-surface-hover focus:bg-surface-hover',
            )}
            onClick={() => handleExport(item.format)}
          >
            <span className="text-text-secondary" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </Ariakit.MenuItem>
        ))}
      </Ariakit.Menu>
    </Ariakit.MenuProvider>
  );
};

export default ExportDropdown;
