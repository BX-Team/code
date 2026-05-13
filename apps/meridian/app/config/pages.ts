export interface DisabledPageConfig {
  disabled: boolean;
  message?: string;
}

/**
 * Map of route paths to their disabled state config.
 * Prefix matching applies — disabling '/docs' also disables '/docs/anything'.
 *
 * Example:
 *   '/downloads': { disabled: true, message: 'Downloads are temporarily unavailable.' },
 */
export const DISABLED_PAGES: Record<string, DisabledPageConfig> = {
  // '/downloads': { disabled: true, message: 'Downloads are temporarily unavailable.' },
  '/login': { disabled: true, message: 'Pulsify is currently in testing before launching open beta, expect news.' },
  '/dashboard': { disabled: true, message: 'Pulsify is currently in testing before launching open beta, expect news.' },
};
