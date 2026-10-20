export interface DisabledPageConfig {
  disabled: boolean;
  message?: string;
}

/** Prefix matching: disabling '/docs' also disables '/docs/anything'. */
export const DISABLED_PAGES: Record<string, DisabledPageConfig> = {
  // '/downloads': { disabled: true, message: 'Downloads are temporarily unavailable.' },
};
