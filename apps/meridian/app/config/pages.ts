export interface DisabledPageConfig {
  disabled: boolean;
  message?: string;
}

/**
 * Map of route paths to their disabled state config.
 * Prefix matching applies — disabling '/docs' also disables '/docs/anything'.
 */
export const DISABLED_PAGES: Record<string, DisabledPageConfig> = {
  // '/downloads': { disabled: true, message: 'Downloads are temporarily unavailable.' },
};
