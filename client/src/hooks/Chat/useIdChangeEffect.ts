import { useEffect, useRef } from 'react';
import { useResetRecoilState } from 'recoil';
import { logger } from '~/utils';
import store from '~/store';

/**
 * Hook to reset visible artifacts and files when the conversation ID changes
 * @param conversationId - The current conversation ID
 */
export default function useIdChangeEffect(conversationId: string) {
  const lastConvoId = useRef<string | null>(null);
  const resetVisibleArtifacts = useResetRecoilState(store.visibleArtifacts);
  const resetFiles = useResetRecoilState(store.filesByIndex(0));

  useEffect(() => {
    if (conversationId !== lastConvoId.current) {
      logger.log('conversation', 'Conversation ID change');
      resetVisibleArtifacts();
      resetFiles();
    }
    lastConvoId.current = conversationId;
  }, [conversationId, resetVisibleArtifacts, resetFiles]);
}
