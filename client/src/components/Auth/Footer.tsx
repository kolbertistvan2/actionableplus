import { TStartupConfig } from 'librechat-data-provider';

// Terms and Privacy links removed - accessible via menu instead
function Footer({ startupConfig }: { startupConfig: TStartupConfig | null | undefined }) {
  if (!startupConfig) {
    return null;
  }

  // Footer intentionally empty - Terms and Privacy are in the settings menu
  return null;
}

export default Footer;
