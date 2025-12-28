import React from 'react';
import { useRecoilValue } from 'recoil';
import { Globe, Maximize2, X } from 'lucide-react';
import type { UIResource } from 'librechat-data-provider';
import { currentBrowsedUrlFamily } from '~/store';

interface BrowserThumbnailProps {
  resource: UIResource | null;
  isActive: boolean;
  onClick: () => void;
  conversationId: string;
  onDismiss?: () => void;
}

/**
 * BrowserThumbnail - Manus-style thumbnail card above chat input
 * Compact horizontal layout: preview image | task info | expand icon
 */
export function BrowserThumbnail({ resource, isActive, onClick, conversationId, onDismiss }: BrowserThumbnailProps) {
  // Get the actual browsed URL from navigate tool (stored in Recoil)
  const browsedUrl = useRecoilValue(currentBrowsedUrlFamily(conversationId));

  if (!resource) return null;

  // Extract URL from resource for iframe src (browserbase debug URL)
  const iframeUrl = React.useMemo(() => {
    if (!resource) return '';
    // Try direct http URI first
    if (resource.uri?.startsWith('http')) {
      return resource.uri;
    }
    // Extract URL from text content (fallback for non-http URIs like "analytics-dashboard")
    if (resource.text) {
      const urlMatch = resource.text.match(/https?:\/\/[^\s<>"]+/);
      if (urlMatch) return urlMatch[0];
    }
    return '';
  }, [resource]);

  // Extract domain for display - prefer browsedUrl (actual website) over iframeUrl (browserbase)
  const domain = React.useMemo(() => {
    const displayUrl = browsedUrl || iframeUrl;
    if (!displayUrl) return 'Loading...';
    try {
      return new URL(displayUrl).hostname;
    } catch {
      return displayUrl;
    }
  }, [browsedUrl, iframeUrl]);

  return (
    <div
      className="group flex w-full cursor-pointer items-stretch overflow-hidden rounded-2xl border border-border-light bg-surface-primary shadow-sm transition-all hover:shadow-md hover:border-border-medium sm:inline-flex sm:w-auto"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      {/* Preview thumbnail - left side */}
      <div className="relative h-[72px] w-[80px] flex-shrink-0 overflow-hidden bg-surface-tertiary sm:w-[100px]">
        {iframeUrl ? (
          <div
            className="pointer-events-none absolute inset-0 origin-top-left"
            style={{ transform: 'scale(0.125)', width: '800%', height: '800%' }}
          >
            <iframe
              src={iframeUrl}
              className="h-full w-full border-none"
              title="Browser Preview"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Globe className="h-6 w-6 text-text-tertiary animate-pulse" />
          </div>
        )}
        {/* Gradient overlay for polish */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface-primary/20" />
      </div>

      {/* Content - right side */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2">
        {/* Status text */}
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          )}
          <span className="text-sm font-medium text-text-primary">
            {isActive ? 'Browsing...' : 'Browser session'}
          </span>
        </div>

        {/* URL/domain with globe icon */}
        <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <Globe className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{domain}</span>
        </div>
      </div>

      {/* Action buttons on hover */}
      <div className="flex flex-shrink-0 items-center gap-1 px-2 opacity-0 transition-opacity group-hover:opacity-100">
        {/* Expand button */}
        <button
          type="button"
          className="rounded p-1.5 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onClick();
          }}
          aria-label="Expand browser preview"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        {/* Dismiss button */}
        {onDismiss && (
          <button
            type="button"
            className="rounded p-1.5 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onDismiss();
            }}
            aria-label="Dismiss browser preview"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default BrowserThumbnail;
