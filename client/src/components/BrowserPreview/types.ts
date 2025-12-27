export type BrowserStatus =
  | 'idle'
  | 'connecting'
  | 'navigating'
  | 'observing'
  | 'clicking'
  | 'typing'
  | 'extracting'
  | 'screenshot'
  | 'completed'
  | 'error';

export interface BrowserSession {
  sessionId: string;
  debuggerUrl: string;
  currentUrl?: string;
  status: BrowserStatus;
  statusMessage?: string;
  startedAt: Date;
  lastActionAt?: Date;
}

export interface BrowserPreviewProps {
  session: BrowserSession;
  isExpanded?: boolean;
  onExpand?: () => void;
  onClose?: () => void;
  className?: string;
}

export interface BrowserPanelProps {
  session: BrowserSession;
  isOpen: boolean;
  onClose: () => void;
}
