import React, { memo } from 'react';
import { Globe } from 'lucide-react';
import { TooltipAnchor } from '@librechat/client';
import { useRecoilValue } from 'recoil';
import { activeUIResourceFamily } from '~/store';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface BrowserToggleButtonProps {
  conversationId: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * BrowserToggleButton - Globe icon in chat input area
 * Shows when there's an active browser session, with pulsing indicator when active
 */
const BrowserToggleButton = memo(function BrowserToggleButton({
  conversationId,
  isActive,
  onClick,
  disabled = false,
}: BrowserToggleButtonProps) {
  const localize = useLocalize();
  const activeUIResource = useRecoilValue(activeUIResourceFamily(conversationId));

  // Only show when there's an active browser session
  if (!activeUIResource) return null;

  return (
    <TooltipAnchor
      description={localize('com_ui_browser_preview') ?? 'Browser preview'}
      id="browser-toggle"
      disabled={disabled}
      render={
        <button
          type="button"
          aria-label="Browser preview"
          disabled={disabled}
          onClick={onClick}
          className={cn(
            'relative flex size-9 items-center justify-center rounded-full p-1',
            'transition-colors hover:bg-surface-hover',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50',
          )}
        >
          <div className="flex w-full items-center justify-center gap-2">
            <Globe className="h-5 w-5 text-text-secondary" />
          </div>
          {/* Pulsing green indicator when active */}
          {isActive && (
            <span
              className={cn(
                'absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full',
                'bg-green-500 animate-pulse',
                'ring-2 ring-surface-primary',
              )}
            />
          )}
        </button>
      }
    />
  );
});

export default BrowserToggleButton;
