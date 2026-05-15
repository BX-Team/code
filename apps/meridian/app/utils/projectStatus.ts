export type ProjectStatusClass = 'ok' | 'warn' | 'muted';

export interface ProjectStatus {
  label: 'Healthy' | 'Issues' | 'Offline' | 'Pending';
  cls: ProjectStatusClass;
}

const OFFLINE_THRESHOLD_MS = 1000 * 60 * 60 * 2;

export function projectStatus(input: { errors?: number; lastSeenAt: string | null }): ProjectStatus {
  if ((input.errors ?? 0) > 0) return { label: 'Issues', cls: 'warn' };
  if (!input.lastSeenAt) return { label: 'Pending', cls: 'muted' };
  const age = Date.now() - new Date(input.lastSeenAt).getTime();
  if (age > OFFLINE_THRESHOLD_MS) return { label: 'Offline', cls: 'muted' };
  return { label: 'Healthy', cls: 'ok' };
}
