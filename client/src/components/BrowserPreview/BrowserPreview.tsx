import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BrowserPreviewProps, BrowserStatus } from './types';

const STATUS_CONFIG: Record<BrowserStatus, { label: string; color: string; icon: string }> = {
  idle: { label: 'Ready', color: 'text-gray-400', icon: '○' },
  connecting: { label: 'Connecting...', color: 'text-yellow-500', icon: '◐' },
  navigating: { label: 'Navigating', color: 'text-blue-500', icon: '→' },
  observing: { label: 'Observing', color: 'text-blue-400', icon: '◉' },
  clicking: { label: 'Clicking', color: 'text-green-500', icon: '◆' },
  typing: { label: 'Typing', color: 'text-violet-500', icon: '⌨' },
  extracting: { label: 'Extracting', color: 'text-orange-500', icon: '⇣' },
  screenshot: { label: 'Screenshot', color: 'text-pink-500', icon: '⎘' },
  completed: { label: 'Done', color: 'text-green-500', icon: '✓' },
  error: { label: 'Error', color: 'text-red-500', icon: '✕' },
};

/**
 * BrowserPreview - Compact thumbnail view for chat feed
 * Shows live browser session with status indicator
 */
export function BrowserPreview({
  session,
  isExpanded = false,
  onExpand,
  className = '',
}: BrowserPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const statusConfig = STATUS_CONFIG[session.status];
  const isLive = ['navigating', 'observing', 'clicking', 'typing', 'extracting'].includes(
    session.status,
  );

  const handleClick = useCallback(() => {
    if (onExpand) {
      onExpand();
    }
  }, [onExpand]);

  const truncateUrl = (url: string, maxLength: number = 35) => {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      const display = parsed.hostname + parsed.pathname;
      return display.length > maxLength ? display.substring(0, maxLength) + '...' : display;
    } catch {
      return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        group relative overflow-hidden rounded-lg border border-gray-700/50
        bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900
        shadow-lg shadow-black/20 transition-all duration-300
        hover:border-cyan-500/50 hover:shadow-cyan-500/10
        cursor-pointer select-none
        ${className}
      `}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Scan line effect overlay */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-gray-700/50 bg-gray-900/80 px-3 py-1.5">
        <div className="flex items-center gap-2">
          {/* Window controls */}
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500/80" />
            <span className="h-2 w-2 rounded-full bg-yellow-500/80" />
            <span className="h-2 w-2 rounded-full bg-green-500/80" />
          </div>

          {/* Live indicator */}
          {isLive && (
            <div className="flex items-center gap-1">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-green-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="font-mono text-[10px] uppercase tracking-wider text-green-500">
                live
              </span>
            </div>
          )}
        </div>

        {/* Expand icon */}
        <motion.div
          className="text-gray-500 transition-colors group-hover:text-cyan-400"
          whileHover={{ scale: 1.1 }}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </motion.div>
      </div>

      {/* Browser preview area */}
      <div className="relative aspect-video w-full min-w-[200px] overflow-hidden bg-gray-950">
        {session.debuggerUrl && !imageError ? (
          <iframe
            src={session.debuggerUrl}
            className="h-full w-full scale-[0.25] origin-top-left"
            style={{
              width: '400%',
              height: '400%',
              pointerEvents: 'none',
            }}
            title="Browser Preview"
            sandbox="allow-same-origin"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <div className="mb-2 font-mono text-2xl text-gray-600">⎔</div>
              <div className="font-mono text-xs text-gray-500">No preview</div>
            </div>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent" />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-gray-700/50 bg-gray-900/90 px-3 py-2">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Status icon with animation */}
          <motion.span
            className={`font-mono text-sm ${statusConfig.color}`}
            animate={isLive ? { opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            {statusConfig.icon}
          </motion.span>

          {/* Status text */}
          <div className="min-w-0 flex-1">
            <div className={`truncate font-mono text-xs ${statusConfig.color}`}>
              {session.statusMessage || statusConfig.label}
            </div>
            {session.currentUrl && (
              <div className="truncate font-mono text-[10px] text-gray-500">
                {truncateUrl(session.currentUrl)}
              </div>
            )}
          </div>
        </div>

        {/* Action hint */}
        <div className="ml-2 hidden font-mono text-[10px] text-gray-600 group-hover:block">
          Click to expand
        </div>
      </div>

      {/* Corner accent */}
      <div className="absolute -right-1 -top-1 h-4 w-4 border-r-2 border-t-2 border-cyan-500/30 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-cyan-500/30 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.div>
  );
}

export default BrowserPreview;
