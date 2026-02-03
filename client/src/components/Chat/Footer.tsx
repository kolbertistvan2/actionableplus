import { useEffect } from 'react';
import TagManager from 'react-gtm-module';
import { useGetStartupConfig } from '~/data-provider';

// Footer hidden - branding info available in Settings menu
export default function Footer({ className }: { className?: string }) {
  const { data: config } = useGetStartupConfig();

  // Keep GTM initialization
  useEffect(() => {
    if (config?.analyticsGtmId != null && typeof window.google_tag_manager === 'undefined') {
      const tagManagerArgs = {
        gtmId: config.analyticsGtmId,
      };
      TagManager.initialize(tagManagerArgs);
    }
  }, [config?.analyticsGtmId]);

  return null;
}
