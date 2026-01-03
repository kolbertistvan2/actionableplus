import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import type { TAttachment } from 'librechat-data-provider';
import { useSearchResultsByTurn } from './useSearchResultsByTurn';
import store from '~/store';

export default function useAttachments({
  messageId,
  attachments,
}: {
  messageId?: string;
  attachments?: TAttachment[];
}) {
  const messageAttachmentsMap = useRecoilValue(store.messageAttachmentsMap);

  // Combine message attachments and streaming attachments from SSE
  const messageAttachments = useMemo(() => {
    const existingAttachments = attachments ?? [];
    const streamingAttachments = messageAttachmentsMap[messageId ?? ''] ?? [];

    // Deduplicate by toolCallId to avoid showing same attachment twice
    const allAttachments = [...existingAttachments];
    for (const streamingAtt of streamingAttachments) {
      const exists = allAttachments.some(
        (att) => att.toolCallId && att.toolCallId === streamingAtt.toolCallId,
      );
      if (!exists) {
        allAttachments.push(streamingAtt);
      }
    }
    return allAttachments;
  }, [attachments, messageAttachmentsMap, messageId]);

  const searchResults = useSearchResultsByTurn(messageAttachments);

  return {
    attachments: messageAttachments,
    searchResults,
  };
}
