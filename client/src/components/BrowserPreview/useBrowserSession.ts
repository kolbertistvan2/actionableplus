import { useState, useCallback, useMemo } from 'react';
import type { BrowserSession, BrowserStatus } from './types';

/**
 * Hook to manage browser session state
 * Parses MCP tool responses to extract session info
 */
export function useBrowserSession() {
  const [session, setSession] = useState<BrowserSession | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  /**
   * Parse session info from MCP tool response
   * Looks for Browserbase URLs in the response text
   */
  const parseSessionFromResponse = useCallback((responseText: string): Partial<BrowserSession> | null => {
    // Match Browserbase session URL
    const sessionMatch = responseText.match(
      /Browserbase Live Session View URL:\s*(https:\/\/www\.browserbase\.com\/sessions\/[\w-]+)/
    );

    // Match debugger URL (iframe-embeddable)
    const debuggerMatch = responseText.match(
      /Browserbase Live Debugger URL:\s*(https:\/\/[\w.-]+\/[\w/-]+)/
    );

    if (!sessionMatch && !debuggerMatch) {
      return null;
    }

    const sessionId = sessionMatch?.[1]?.split('/').pop() || '';
    const debuggerUrl = debuggerMatch?.[1] || '';

    return {
      sessionId,
      debuggerUrl,
    };
  }, []);

  /**
   * Update session status based on MCP tool being called
   */
  const updateStatus = useCallback((toolName: string, statusMessage?: string) => {
    let status: BrowserStatus = 'idle';

    if (toolName.includes('session_create')) {
      status = 'connecting';
    } else if (toolName.includes('navigate')) {
      status = 'navigating';
    } else if (toolName.includes('observe')) {
      status = 'observing';
    } else if (toolName.includes('act')) {
      // Determine if clicking or typing based on message
      if (statusMessage?.toLowerCase().includes('type') || statusMessage?.toLowerCase().includes('typing')) {
        status = 'typing';
      } else {
        status = 'clicking';
      }
    } else if (toolName.includes('extract')) {
      status = 'extracting';
    } else if (toolName.includes('screenshot')) {
      status = 'screenshot';
    } else if (toolName.includes('close')) {
      status = 'completed';
    }

    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status,
        statusMessage,
        lastActionAt: new Date(),
      };
    });
  }, []);

  /**
   * Initialize a new session from MCP response
   */
  const initSession = useCallback((responseText: string) => {
    const parsed = parseSessionFromResponse(responseText);
    if (parsed?.sessionId && parsed?.debuggerUrl) {
      setSession({
        sessionId: parsed.sessionId,
        debuggerUrl: parsed.debuggerUrl,
        status: 'idle',
        startedAt: new Date(),
      });
    }
  }, [parseSessionFromResponse]);

  /**
   * Update current URL
   */
  const updateUrl = useCallback((url: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      return { ...prev, currentUrl: url };
    });
  }, []);

  /**
   * Clear session
   */
  const clearSession = useCallback(() => {
    setSession(null);
    setIsPanelOpen(false);
  }, []);

  /**
   * Open expanded panel
   */
  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
  }, []);

  /**
   * Close expanded panel
   */
  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  return {
    session,
    isPanelOpen,
    initSession,
    updateStatus,
    updateUrl,
    clearSession,
    openPanel,
    closePanel,
  };
}

export default useBrowserSession;
