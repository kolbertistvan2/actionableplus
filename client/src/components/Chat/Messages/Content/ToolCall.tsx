import { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSetRecoilState, useRecoilState } from 'recoil';
import { Button } from '@librechat/client';
import { TriangleAlert } from 'lucide-react';
import { actionDelimiter, actionDomainSeparator, Constants, Tools } from 'librechat-data-provider';
import type { TAttachment, UIResource } from 'librechat-data-provider';
import { useLocalize, useProgress } from '~/hooks';
import { activeUIResourceFamily, browserSidePanelOpenFamily, currentBrowsedUrlFamily } from '~/store';
import { BrowserThumbnail } from '~/components/BrowserPreview';
import { AttachmentGroup } from './Parts';
import ToolCallInfo from './ToolCallInfo';
import ProgressText from './ProgressText';
import { logger, cn } from '~/utils';

/**
 * Maps clean tool action names to user-friendly display names
 * Used after stripping browserbase_ and stagehand_ prefixes
 */
const BROWSER_ACTION_NAMES: Record<string, { running: string; completed: string }> = {
  session_create: { running: 'Starting browser', completed: 'Browser started' },
  session_close: { running: 'Closing browser', completed: 'Browser closed' },
  navigate: { running: 'Browsing', completed: 'Navigated' },
  act: { running: 'Clicking element', completed: 'Clicked element' },
  observe: { running: 'Viewing the page', completed: 'Observed page' },
  extract: { running: 'Extracting data', completed: 'Data extracted' },
  screenshot: { running: 'Taking screenshot', completed: 'Screenshot taken' },
  click: { running: 'Clicking', completed: 'Clicked' },
  type: { running: 'Typing', completed: 'Typed text' },
  scroll: { running: 'Scrolling', completed: 'Scrolled' },
  get_text: { running: 'Reading text', completed: 'Text extracted' },
  get_url: { running: 'Getting URL', completed: 'URL retrieved' },
  run_javascript: { running: 'Running script', completed: 'Script executed' },
  agent: { running: 'Running browser agent', completed: 'Browser agent completed' },
  deeplocator: { running: 'Finding element', completed: 'Element found' },
};

/**
 * Extracts clean action name from browserbase/stagehand tool names
 * Strips "browserbase_", "browserbase_stagehand_", and "stagehand_" prefixes
 */
function getCleanBrowserAction(toolName: string): string | null {
  const prefixes = ['browserbase_stagehand_', 'browserbase_', 'stagehand_'];
  for (const prefix of prefixes) {
    if (toolName.toLowerCase().startsWith(prefix)) {
      return toolName.substring(prefix.length);
    }
  }
  return null;
}

/**
 * Check if this is a browser-related tool and get friendly name
 */
function getBrowserFriendlyName(toolName: string): { running: string; completed: string } | null {
  const cleanAction = getCleanBrowserAction(toolName);
  if (cleanAction && BROWSER_ACTION_NAMES[cleanAction]) {
    return BROWSER_ACTION_NAMES[cleanAction];
  }
  return null;
}

export default function ToolCall({
  initialProgress = 0.1,
  isLast = false,
  isSubmitting,
  name,
  args: _args = '',
  output,
  attachments,
  auth,
}: {
  initialProgress: number;
  isLast?: boolean;
  isSubmitting: boolean;
  name: string;
  args: string | Record<string, unknown>;
  output?: string | null;
  attachments?: TAttachment[];
  auth?: string;
  expires_at?: number;
}) {
  const localize = useLocalize();
  const { conversationId = '' } = useParams<{ conversationId: string }>();
  const setActiveUIResource = useSetRecoilState(activeUIResourceFamily(conversationId));
  const setCurrentBrowsedUrl = useSetRecoilState(currentBrowsedUrlFamily(conversationId));
  const [isBrowserPanelOpen, setIsBrowserPanelOpen] = useRecoilState(browserSidePanelOpenFamily(conversationId));
  const [showInfo, setShowInfo] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevShowInfoRef = useRef<boolean>(showInfo);

  const { function_name, domain, isMCPToolCall } = useMemo(() => {
    if (typeof name !== 'string') {
      return { function_name: '', domain: null, isMCPToolCall: false };
    }
    if (name.includes(Constants.mcp_delimiter)) {
      const [func, server] = name.split(Constants.mcp_delimiter);
      return {
        function_name: func || '',
        domain: server && (server.replaceAll(actionDomainSeparator, '.') || null),
        isMCPToolCall: true,
      };
    }
    const [func, _domain] = name.includes(actionDelimiter)
      ? name.split(actionDelimiter)
      : [name, ''];
    return {
      function_name: func || '',
      domain: _domain && (_domain.replaceAll(actionDomainSeparator, '.') || null),
      isMCPToolCall: false,
    };
  }, [name]);

  const error =
    typeof output === 'string' && output.toLowerCase().includes('error processing tool');

  const args = useMemo(() => {
    if (typeof _args === 'string') {
      return _args;
    }
    try {
      return JSON.stringify(_args, null, 2);
    } catch (e) {
      logger.error(
        'client/src/components/Chat/Messages/Content/ToolCall.tsx - Failed to stringify args',
        e,
      );
      return '';
    }
  }, [_args]) as string | undefined;

  const hasInfo = useMemo(
    () => (args?.length ?? 0) > 0 || (output?.length ?? 0) > 0,
    [args, output],
  );

  const authDomain = useMemo(() => {
    const authURL = auth ?? '';
    if (!authURL) {
      return '';
    }
    try {
      const url = new URL(authURL);
      return url.hostname;
    } catch (e) {
      logger.error(
        'client/src/components/Chat/Messages/Content/ToolCall.tsx - Failed to parse auth URL',
        e,
      );
      return '';
    }
  }, [auth]);

  const progress = useProgress(initialProgress);
  const cancelled = (!isSubmitting && progress < 1) || error === true;

  // Get friendly display names for browser tools (rule-based)
  const friendlyNames = useMemo(() => {
    return getBrowserFriendlyName(function_name);
  }, [function_name]);

  const getFinishedText = () => {
    if (cancelled) {
      return localize('com_ui_cancelled');
    }
    // Use friendly name if available
    if (friendlyNames) {
      return friendlyNames.completed;
    }
    if (isMCPToolCall === true) {
      return localize('com_assistants_completed_function', { 0: function_name });
    }
    if (domain != null && domain && domain.length !== Constants.ENCODED_DOMAIN_LENGTH) {
      return localize('com_assistants_completed_action', { 0: domain });
    }
    return localize('com_assistants_completed_function', { 0: function_name });
  };

  const getInProgressText = () => {
    // Use friendly name if available
    if (friendlyNames) {
      return friendlyNames.running;
    }
    return function_name
      ? localize('com_assistants_running_var', { 0: function_name })
      : localize('com_assistants_running_action');
  };

  useLayoutEffect(() => {
    if (showInfo !== prevShowInfoRef.current) {
      prevShowInfoRef.current = showInfo;
      setIsAnimating(true);

      if (showInfo && contentRef.current) {
        requestAnimationFrame(() => {
          if (contentRef.current) {
            const height = contentRef.current.scrollHeight;
            setContentHeight(height + 4);
          }
        });
      } else {
        setContentHeight(0);
      }

      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [showInfo]);

  useEffect(() => {
    if (!contentRef.current) {
      return;
    }
    const resizeObserver = new ResizeObserver((entries) => {
      if (showInfo && !isAnimating) {
        for (const entry of entries) {
          if (entry.target === contentRef.current) {
            setContentHeight(entry.contentRect.height + 4);
          }
        }
      }
    });
    resizeObserver.observe(contentRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [showInfo, isAnimating]);

  // Extract UI Resources from attachments for side panel
  const uiResources: UIResource[] =
    attachments
      ?.filter((attachment) => attachment.type === Tools.ui_resources)
      .flatMap((attachment) => {
        return attachment[Tools.ui_resources] as UIResource[];
      }) ?? [];

  // When UIResource is detected, update state (panel doesn't auto-open - user clicks thumbnail)
  useEffect(() => {
    if (uiResources.length > 0) {
      // Use the latest UIResource (last one in array)
      const latestResource = uiResources[uiResources.length - 1];
      setActiveUIResource(latestResource);
      // Panel nem nyílik automatikusan - a thumbnail-re kattintva nyílik
    }
  }, [uiResources.length, setActiveUIResource]);

  // Extract and store the actual browsed URL from navigate tool args
  useEffect(() => {
    const cleanAction = getCleanBrowserAction(function_name);
    if (cleanAction === 'navigate' && _args) {
      try {
        const parsedArgs = typeof _args === 'string' ? JSON.parse(_args) : _args;
        if (parsedArgs.url && typeof parsedArgs.url === 'string') {
          setCurrentBrowsedUrl(parsedArgs.url);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [function_name, _args, setCurrentBrowsedUrl]);

  if (!isLast && (!function_name || function_name.length === 0) && !output) {
    return null;
  }

  return (
    <>
      <div className="relative my-2.5 flex h-5 shrink-0 items-center gap-2.5">
        <ProgressText
          progress={progress}
          onClick={() => setShowInfo((prev) => !prev)}
          inProgressText={getInProgressText()}
          authText={
            !cancelled && authDomain.length > 0 ? localize('com_ui_requires_auth') : undefined
          }
          finishedText={getFinishedText()}
          hasInput={hasInfo}
          isExpanded={showInfo}
          error={cancelled}
        />
      </div>
      <div
        className="relative"
        style={{
          height: showInfo ? contentHeight : 0,
          overflow: 'hidden',
          transition:
            'height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: showInfo ? 1 : 0,
          transformOrigin: 'top',
          willChange: 'height, opacity',
          perspective: '1000px',
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'subpixel-antialiased',
        }}
      >
        <div
          className={cn(
            'overflow-hidden rounded-xl border border-border-light bg-surface-secondary shadow-md',
            showInfo && 'shadow-lg',
          )}
          style={{
            transform: showInfo ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
            opacity: showInfo ? 1 : 0,
            transition:
              'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div ref={contentRef}>
            {showInfo && hasInfo && (
              <ToolCallInfo
                input={args ?? ''}
                output={output}
                domain={authDomain || (domain ?? '')}
                function_name={function_name}
                pendingAuth={authDomain.length > 0 && !cancelled && progress < 1}
                attachments={attachments}
              />
            )}
          </div>
        </div>
      </div>
      {auth != null && auth && progress < 1 && !cancelled && (
        <div className="flex w-full flex-col gap-2.5">
          <div className="mb-1 mt-2">
            <Button
              className="font-mediu inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm"
              variant="default"
              rel="noopener noreferrer"
              onClick={() => window.open(auth, '_blank', 'noopener,noreferrer')}
            >
              {localize('com_ui_sign_in_to_domain', { 0: authDomain })}
            </Button>
          </div>
          <p className="flex items-center text-xs text-text-warning">
            <TriangleAlert className="mr-1.5 inline-block h-4 w-4" aria-hidden="true" />
            {localize('com_assistants_allow_sites_you_trust')}
          </p>
        </div>
      )}
      {attachments && attachments.length > 0 && <AttachmentGroup attachments={attachments} />}
    </>
  );
}
