export type StatusSummary = 'ok' | 'degraded' | 'maintenance';

export function useStatusSummary() {
  return useState<StatusSummary>('bx-status', () => 'ok');
}
