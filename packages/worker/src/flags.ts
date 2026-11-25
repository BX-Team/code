/** The part of a Workers `Flagship` binding read here; this package has no Workers types of its own. */
interface Flagship {
  getBooleanValue(key: string, fallback: boolean): Promise<boolean>;
  getNumberValue(key: string, fallback: number): Promise<number>;
  getObjectValue<T extends object>(key: string, fallback: T): Promise<T>;
}

/** Kill switches in the Flagship app `bx-id`; each value is what runs while Flagship has no answer. */
const SWITCHES = {
  'sign-up': true,
  'email-otp': true,
  'discord-sign-in': true,
  'github-sign-in': true,
  'turn-relay': true,
  'skin-upload': true,
  'open-lobbies': true,
} as const;

/** Limits tuned without a deploy, with the values that run while Flagship has no answer. */
const LIMITS = {
  'lobby-size': 16,
  'otp-sends-per-minute': 3,
  'otp-tries-per-minute': 5,
  'pending-friend-requests': 50,
  'activity-kept': 300,
  'nicks-per-account': 5,
  'nick-hold-days': 5,
} as const;

export type Switch = keyof typeof SWITCHES;
export type Limit = keyof typeof LIMITS;

/** Whether `key` is on; a failed evaluation keeps the service running. */
export async function isOn(flags: Flagship, key: Switch): Promise<boolean> {
  return flags.getBooleanValue(key, SWITCHES[key]).catch(() => SWITCHES[key]);
}

/** A whole number of at least 1; anything else in Flagship falls back to the built-in value. */
export async function limit(flags: Flagship, key: Limit): Promise<number> {
  const value = await flags.getNumberValue(key, LIMITS[key]).catch(() => LIMITS[key]);
  return Number.isInteger(value) && value >= 1 ? value : LIMITS[key];
}

/** The JSON of the `site-banner` flag, unchecked; `{}` while it is off. */
export async function bannerFlag(flags: Flagship): Promise<unknown> {
  return flags.getObjectValue('site-banner', {}).catch(() => ({}));
}
