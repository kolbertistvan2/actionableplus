import { atomFamily } from 'recoil';
import type { BrowserSession } from '~/components/BrowserPreview/types';
import type { UIResource } from 'librechat-data-provider';

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

/**
 * Active UI Resource for browser panel per conversation
 * Stores the latest UIResource iframe to display in the side panel
 */
export const activeUIResourceFamily = atomFamily<UIResource | null, string>({
  key: 'activeUIResourceByConversation',
  default: null,
});

/**
 * Browser side panel visibility per conversation
 * Auto-opens when UIResource is detected, can be manually closed
 */
export const browserSidePanelOpenFamily = atomFamily<boolean, string>({
  key: 'browserSidePanelOpenByConversation',
  default: false,
});

/**
 * Current browsed URL per conversation
 * Updated when navigate tool is called - stores the actual website URL (not browserbase debug URL)
 */
export const currentBrowsedUrlFamily = atomFamily<string, string>({
  key: 'currentBrowsedUrlByConversation',
  default: '',
});

/**
 * Browser thumbnail dismissed state per conversation
 * When true, the thumbnail card is hidden but the Globe icon remains visible
 * Resets to false when new UIResource arrives or when side panel is closed
 */
export const browserThumbnailDismissedFamily = atomFamily<boolean, string>({
  key: 'browserThumbnailDismissedByConversation',
  default: false,
});
