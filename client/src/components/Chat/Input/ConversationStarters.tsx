import { useMemo, useCallback } from 'react';
import { EModelEndpoint, Constants } from 'librechat-data-provider';
import { useChatContext, useAgentsMapContext, useAssistantsMapContext } from '~/Providers';
import { useGetAssistantDocsQuery, useGetEndpointsQuery } from '~/data-provider';
import { getIconEndpoint, getEntity } from '~/utils';
import { useSubmitMessage } from '~/hooks';

const ConversationStarters = () => {
  const { conversation } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const assistantMap = useAssistantsMapContext();
  const { data: endpointsConfig } = useGetEndpointsQuery();

  const endpointType = useMemo(() => {
    let ep = conversation?.endpoint ?? '';
    if (ep === EModelEndpoint.azureOpenAI) {
      ep = EModelEndpoint.openAI;
    }
    return getIconEndpoint({
      endpointsConfig,
      iconURL: conversation?.iconURL,
      endpoint: ep,
    });
  }, [conversation?.endpoint, conversation?.iconURL, endpointsConfig]);

  const { data: documentsMap = new Map() } = useGetAssistantDocsQuery(endpointType, {
    select: (data) => new Map(data.map((dbA) => [dbA.assistant_id, dbA])),
  });

  const { entity, isAgent } = getEntity({
    endpoint: endpointType,
    agentsMap,
    assistantMap,
    agent_id: conversation?.agent_id,
    assistant_id: conversation?.assistant_id,
  });

  const conversation_starters = useMemo(() => {
    if (entity?.conversation_starters?.length) {
      return entity.conversation_starters;
    }

    if (isAgent) {
      return [];
    }

    return documentsMap.get(entity?.id ?? '')?.conversation_starters ?? [];
  }, [documentsMap, isAgent, entity]);

  const { submitMessage } = useSubmitMessage();
  const sendConversationStarter = useCallback(
    (text: string) => submitMessage({ text }),
    [submitMessage],
  );

  if (!conversation_starters.length) {
    return null;
  }

  return (
    <div className="conversation-starters-container">
      <style>
        {`
          .conversation-starters-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px;
            padding: 0 16px;
            margin-top: 32px;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
          }

          .starter-card {
            position: relative;
            display: flex;
            flex-direction: column;
            width: 180px;
            min-height: 90px;
            padding: 16px;
            cursor: pointer;
            border-radius: 16px;
            text-align: left;
            border: 1px solid var(--border-medium);
            background: linear-gradient(
              135deg,
              var(--surface-primary) 0%,
              var(--surface-secondary) 100%
            );
            box-shadow:
              0 4px 16px -2px rgba(0, 0, 0, 0.08),
              0 2px 4px -1px rgba(0, 0, 0, 0.04),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0;
            transform: translateY(16px);
            animation: starterFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            overflow: hidden;
          }

          .starter-card::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 16px;
            background: linear-gradient(
              135deg,
              rgba(171, 104, 255, 0.05) 0%,
              rgba(16, 163, 127, 0.05) 100%
            );
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .starter-card::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(
              circle at center,
              rgba(255, 255, 255, 0.15) 0%,
              transparent 60%
            );
            opacity: 0;
            transform: scale(0.5);
            transition: all 0.4s ease;
            pointer-events: none;
          }

          .starter-card:hover {
            transform: translateY(-4px);
            border-color: var(--brand-purple);
            box-shadow:
              0 12px 32px -4px rgba(171, 104, 255, 0.15),
              0 4px 12px -2px rgba(0, 0, 0, 0.08),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
          }

          .starter-card:hover::before {
            opacity: 1;
          }

          .starter-card:hover::after {
            opacity: 1;
            transform: scale(1);
          }

          .starter-card:active {
            transform: translateY(-2px) scale(0.98);
            transition: all 0.1s ease;
          }

          .starter-card:nth-child(1) { animation-delay: 0s; }
          .starter-card:nth-child(2) { animation-delay: 0.08s; }
          .starter-card:nth-child(3) { animation-delay: 0.16s; }
          .starter-card:nth-child(4) { animation-delay: 0.24s; }

          .starter-text {
            position: relative;
            z-index: 1;
            font-size: 14px;
            line-height: 1.5;
            color: var(--text-secondary);
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
            transition: color 0.3s ease;
          }

          .starter-card:hover .starter-text {
            color: var(--text-primary);
          }

          .starter-icon {
            position: absolute;
            bottom: 12px;
            right: 12px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--surface-tertiary);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transform: translateX(-8px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .starter-card:hover .starter-icon {
            opacity: 1;
            transform: translateX(0);
          }

          .starter-icon svg {
            width: 12px;
            height: 12px;
            color: var(--text-secondary);
          }

          @keyframes starterFadeIn {
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Tablet: 2x2 grid */
          @media (max-width: 768px) {
            .conversation-starters-container {
              gap: 10px;
              padding: 0 12px;
            }

            .starter-card {
              width: calc(50% - 5px);
              min-width: 140px;
              max-width: 200px;
              min-height: 80px;
              padding: 14px;
            }

            .starter-text {
              font-size: 13px;
            }
          }

          /* Mobile: vertical stack */
          @media (max-width: 480px) {
            .conversation-starters-container {
              flex-direction: column;
              align-items: stretch;
              gap: 8px;
              padding: 0 16px;
            }

            .starter-card {
              width: 100%;
              max-width: none;
              min-height: auto;
              padding: 14px 16px;
              flex-direction: row;
              align-items: center;
              gap: 12px;
            }

            .starter-text {
              -webkit-line-clamp: 2;
              font-size: 14px;
              flex: 1;
            }

            .starter-icon {
              position: static;
              opacity: 0.5;
              transform: none;
              flex-shrink: 0;
            }

            .starter-card:hover .starter-icon {
              opacity: 1;
            }
          }

          /* Dark mode adjustments */
          .dark .starter-card {
            background: linear-gradient(
              135deg,
              var(--surface-secondary) 0%,
              var(--surface-primary) 100%
            );
            box-shadow:
              0 4px 16px -2px rgba(0, 0, 0, 0.3),
              0 2px 4px -1px rgba(0, 0, 0, 0.2),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
          }

          .dark .starter-card::before {
            background: linear-gradient(
              135deg,
              rgba(171, 104, 255, 0.08) 0%,
              rgba(16, 163, 127, 0.08) 100%
            );
          }

          .dark .starter-card::after {
            background: radial-gradient(
              circle at center,
              rgba(255, 255, 255, 0.08) 0%,
              transparent 60%
            );
          }

          .dark .starter-card:hover {
            box-shadow:
              0 12px 32px -4px rgba(171, 104, 255, 0.25),
              0 4px 12px -2px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
          }

          /* Reduced motion preference */
          @media (prefers-reduced-motion: reduce) {
            .starter-card {
              animation: none;
              opacity: 1;
              transform: none;
            }

            .starter-card,
            .starter-card::before,
            .starter-card::after,
            .starter-text,
            .starter-icon {
              transition: none;
            }
          }
        `}
      </style>
      {conversation_starters
        .slice(0, Constants.MAX_CONVO_STARTERS)
        .map((text: string, index: number) => (
          <button
            key={index}
            onClick={() => sendConversationStarter(text)}
            className="starter-card"
            type="button"
          >
            <p className="starter-text">{text}</p>
            <span className="starter-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </button>
        ))}
    </div>
  );
};

export default ConversationStarters;
