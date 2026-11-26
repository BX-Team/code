import { toast } from 'vue-sonner';
import { problem } from '~/lib/errors';

/** An error in the visitor's language: by its code when known, else by the kind of failure. */
export function useErrorText() {
  const { t, te } = useI18n();
  return (error: unknown): string => {
    const { status, code, params } = problem(error);
    if (code && te(`errors.${code}`)) return t(`errors.${code}`, params ?? {});
    if (status === 429) return t('errors.TOO_MANY_REQUESTS');
    if (status === 401) return t('errors.UNAUTHORIZED');
    if (status && status >= 500) return t('errors.UNAVAILABLE');
    return t('errors.GENERIC');
  };
}

/** Toasts for action errors and short confirmations. */
export function useNotify() {
  const text = useErrorText();
  return {
    error: (error: unknown) => toast.error(text(error)),
    success: (message: string) => toast.success(message),
  };
}
