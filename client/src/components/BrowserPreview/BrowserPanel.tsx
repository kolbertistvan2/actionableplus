import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BrowserPanelProps, BrowserStatus } from './types';

const STATUS_CONFIG: Record<BrowserStatus, { label: string; color: string }> = {
  idle: { label: 'Ready', color: 'text-gray-400' },
  connecting: { label: 'Connecting...', color: 'text-yellow-500' },
  navigating: { label: 'Browsing', color: 'text-blue-500' },
  observing: { label: 'Observing page', color: 'text-blue-400' },
  clicking: { label: 'Clicking element', color: 'text-green-500' },
  typing: { label: 'Typing', color: 'text-violet-500' },
  extracting: { label: 'Extracting data', color: 'text-orange-500' },
  screenshot: { label: 'Taking screenshot', color: 'text-pink-500' },
  completed: { label: 'Completed', color: 'text-green-500' },
  error: { label: 'Error', color: 'text-red-500' },
};

/**
 * BrowserPanel - Full-size side panel for expanded browser view
 * Similar to Manus.im's "Manus's Computer" panel
 */
export function BrowserPanel({ session, isOpen, onClose }: BrowserPanelProps) {
  const [isLiveMode, setIsLiveMode] = useState(true);
  const statusConfig = STATUS_CONFIG[session.status];
  const isActive = ['navigating', 'observing', 'clicking', 'typing', 'extracting'].includes(
    session.status,
  );

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (!url) return '';
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
                <svg
                  className="h-4 w-4 text-gray-600 dark:text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <div>
                <h2 className="font-sans text-sm font-semibold text-gray-900 dark:text-white">
                  Agent's Browser
                </h2>
                <div className="flex items-center gap-2">
                  {isActive && (
                    <motion.span
                      className="h-1.5 w-1.5 rounded-full bg-green-500"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                  <span className={`font-mono text-xs ${statusConfig.color}`}>
                    {session.statusMessage || statusConfig.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Live/Replay toggle */}
              <div className="flex items-center rounded-lg bg-gray-200 p-0.5 dark:bg-gray-700">
                <button
                  onClick={() => setIsLiveMode(true)}
                  className={`rounded-md px-3 py-1 font-sans text-xs font-medium transition-colors ${
                    isLiveMode
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Live
                </button>
                <button
                  onClick={() => setIsLiveMode(false)}
                  className={`rounded-md px-3 py-1 font-sans text-xs font-medium transition-colors ${
                    !isLiveMode
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Replay
                </button>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* URL Bar */}
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 dark:bg-gray-700">
              <svg
                className="h-3.5 w-3.5 flex-shrink-0 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              <span className="truncate font-mono text-xs text-gray-600 dark:text-gray-300">
                {session.currentUrl || 'about:blank'}
              </span>
            </div>
          </div>

          {/* Browser iframe */}
          <div className="relative flex-1 bg-gray-100 dark:bg-gray-950">
            {session.debuggerUrl ? (
              <iframe
                src={session.debuggerUrl}
                className="h-full w-full"
                title="Browser Session"
                sandbox="allow-same-origin allow-scripts"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center">
                <div className="mb-4 text-4xl text-gray-300 dark:text-gray-600">⎔</div>
                <div className="font-sans text-sm text-gray-400 dark:text-gray-500">
                  No browser session active
                </div>
              </div>
            )}

            {/* Loading overlay */}
            {session.status === 'connecting' && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                <div className="flex items-center gap-3 rounded-lg bg-gray-800 px-4 py-3 shadow-lg">
                  <motion.div
                    className="h-4 w-4 rounded-full border-2 border-gray-400 border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="font-sans text-sm text-white">Starting browser...</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Timeline */}
          {!isLiveMode && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-3">
                {/* Play controls */}
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19l7-7-7-7"
                    />
                  </svg>
                </button>

                {/* Timeline scrubber */}
                <div className="flex flex-1 items-center gap-2">
                  <span className="font-mono text-xs text-gray-400">0:00</span>
                  <div className="relative h-1.5 flex-1 rounded-full bg-gray-300 dark:bg-gray-600">
                    <div className="absolute left-0 top-0 h-full w-1/3 rounded-full bg-blue-500" />
                    <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 cursor-pointer rounded-full bg-blue-500 shadow-md" style={{ left: '33%' }} />
                  </div>
                  <span className="font-mono text-xs text-gray-400">1:23</span>
                </div>
              </div>

              {/* Action markers */}
              <div className="mt-2 flex items-center gap-1">
                <span className="font-sans text-[10px] text-gray-400">Actions:</span>
                {['navigate', 'click', 'type', 'extract'].map((action, i) => (
                  <span
                    key={i}
                    className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  >
                    {action}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Live mode footer */}
          {isLiveMode && isActive && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <motion.span
                  className="h-2 w-2 rounded-full bg-green-500"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="font-sans text-xs text-gray-500 dark:text-gray-400">
                  Agent is using browser
                </span>
                <span className="font-mono text-xs text-gray-400">
                  {session.statusMessage}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BrowserPanel;
