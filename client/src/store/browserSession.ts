import { atomFamily } from 'recoil';
import type { BrowserSession } from '~/components/BrowserPreview/types';

/**
 * Browser session state per conversation
 * Stores the active Browserbase session for live preview
 */
export const browserSessionFamily = atomFamily<BrowserSession | null, string>({
  key: 'browserSessionByConversation',
  default: null,
});

/**
 * Browser panel open state per conversation
 * Controls whether the expanded browser panel is visible
 */
export const browserPanelOpenFamily = atomFamily<boolean, string>({
  key: 'browserPanelOpenByConversation',
  default: false,
});
