/**
 * Base URL of the azimuth API Worker. The site is fully static, so every dynamic
 * request goes cross-origin to this host; override with VITE_API_BASE at build time
 * to point dev builds elsewhere.
 */
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.bxteam.org';
