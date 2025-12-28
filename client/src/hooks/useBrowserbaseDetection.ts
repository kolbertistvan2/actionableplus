import { useCallback, useMemo } from 'react';
import type { BrowserSession, BrowserStatus } from '~/components/BrowserPreview/types';

/**
 * Regex patterns to detect Browserbase session URLs in tool output
 * Supports both plain text and escaped JSON formats (\\n for newlines)
 */
const SESSION_URL_REGEX =
  /Browserbase Live Session View URL:\s*(https:\/\/www\.browserbase\.com\/sessions\/[\w-]+)/;
// Debugger URL can contain query strings with special chars like ? and =
const DEBUGGER_URL_REGEX =
  /Browserbase Live Debugger URL:\s*(https:\/\/[^\s\\]+)/;

/**
 * Maps MCP tool names to browser status
 */
function getStatusFromToolName(toolName: string): BrowserStatus {
  const lowerName = toolName.toLowerCase();

  if (lowerName.includes('session_create') || lowerName.includes('sessioncreate')) {
    return 'connecting';
  }
  if (lowerName.includes('navigate')) {
    return 'navigating';
  }
  if (lowerName.includes('observe')) {
    return 'observing';
  }
  if (lowerName.includes('act') || lowerName.includes('click')) {
    return 'clicking';
  }
  if (lowerName.includes('type') || lowerName.includes('input')) {
    return 'typing';
  }
  if (lowerName.includes('extract')) {
    return 'extracting';
  }
  if (lowerName.includes('screenshot')) {
    return 'screenshot';
  }
  if (lowerName.includes('close') || lowerName.includes('session_close')) {
    return 'completed';
  }

  return 'idle';
}

/**
 * Hook for detecting and parsing Browserbase session information from MCP tool output
 */
export function useBrowserbaseDetection() {
  /**
   * Detect if the output contains Browserbase session URLs
   * Returns a BrowserSession object if found, null otherwise
   */
  const detectSession = useCallback(
    (output: string, toolName?: string): BrowserSession | null => {
      if (!output) {
        return null;
      }

      const sessionMatch = output.match(SESSION_URL_REGEX);
      const debuggerMatch = output.match(DEBUGGER_URL_REGEX);

      // Need at least the debugger URL to show live view
      if (!debuggerMatch) {
        return null;
      }

      const sessionUrl = sessionMatch?.[1] || '';
      const sessionId = sessionUrl ? sessionUrl.split('/').pop() || '' : '';
      const debuggerUrl = debuggerMatch[1];
      const status = toolName ? getStatusFromToolName(toolName) : 'idle';

      return {
        sessionId,
        debuggerUrl,
        status,
        startedAt: new Date(),
      };
    },
    [],
  );

  /**
   * Update status based on tool name
   */
  const updateStatus = useCallback((toolName: string): BrowserStatus => {
    return getStatusFromToolName(toolName);
  }, []);

  /**
   * Check if a tool name is a Browserbase/Stagehand tool
   */
  const isBrowserbaseTool = useCallback((toolName: string): boolean => {
    const browserbasePatterns = [
      'stagehand',
      'browserbase',
      'kolbert-ai-browser',
      'session_create',
      'session_close',
      'navigate',
      'observe',
      'act',
      'extract',
      'screenshot',
    ];

    const lowerName = toolName.toLowerCase();
    return browserbasePatterns.some((pattern) => lowerName.includes(pattern));
  }, []);

  return useMemo(
    () => ({
      detectSession,
      updateStatus,
      isBrowserbaseTool,
      getStatusFromToolName,
    }),
    [detectSession, updateStatus, isBrowserbaseTool],
  );
}

export default useBrowserbaseDetection;
