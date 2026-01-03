import { TranslationKeys } from '~/hooks/useLocalize';

export interface AgentCategory {
  label: TranslationKeys;
  value: string;
}

// The default category - "Consulting & Strategy"
export const EMPTY_AGENT_CATEGORY: AgentCategory = {
  value: 'consulting',
  label: 'com_agents_category_consulting',
};
