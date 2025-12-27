import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Monitor, ExternalLink } from 'lucide-react';
import { UIResourceRenderer } from '@mcp-ui/client';
import type { UIResource } from 'librechat-data-provider';

interface BrowserSidePanelProps {
  resource: UIResource | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * BrowserSidePanel - Manus-style side panel for browser view
 * Displays UIResource iframe as a flex item (not fixed/overlay)
 */
export function BrowserSidePanel({ resource, isOpen, onClose }: BrowserSidePanelProps) {
  // Extract URL from resource for display
  const currentUrl = React.useMemo(() => {
    if (!resource) return '';
    // Try to extract URL from resource uri or text content
    if (resource.uri?.startsWith('http')) {
      return resource.uri;
    }
    // Check if text contains a URL hint
    if (resource.text) {
      const urlMatch = resource.text.match(/https?:\/\/[^\s<>"]+/);
      if (urlMatch) return urlMatch[0];
    }
    return '';
  }, [resource]);

  return (
    <AnimatePresence>
      {isOpen && resource && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 480, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="flex h-full flex-col border-l border-border-light bg-surface-primary"
          style={{ minWidth: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-light bg-surface-secondary px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-tertiary">
                <Monitor className="h-4 w-4 text-text-secondary" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-text-primary">
                  Kolbert AI Browser
                </h2>
                <div className="flex items-center gap-1.5">
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-green-500"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Live
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Open in new tab */}
              {currentUrl && (
                <button
                  onClick={() => window.open(currentUrl, '_blank', 'noopener,noreferrer')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Browser iframe content */}
          <div className="relative flex-1 overflow-hidden bg-surface-tertiary">
            <UIResourceRenderer
              resource={resource}
              onUIAction={async (result) => {
                console.log('Browser action:', result);
              }}
              htmlProps={{
                autoResizeIframe: { width: false, height: false },
                style: {
                  width: '100%',
                  height: '100%',
                  border: 'none',
                },
              }}
            />
          </div>

          {/* Footer status bar */}
          <div className="border-t border-border-light bg-surface-secondary px-4 py-2">
            <div className="flex items-center gap-2">
              <motion.span
                className="h-2 w-2 rounded-full bg-green-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-xs text-text-tertiary">
                Agent is browsing
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BrowserSidePanel;
