import { formatBytes } from '~/lib/format';
import { parseAnalyticsDate } from '~/utils/datetime';

/** Dates, sizes and "5 min ago" in the visitor's language. */
export function useFormat() {
  const { t, locale } = useI18n();
  const tag = computed(() => (locale.value === 'ru' ? 'ru-RU' : 'en-US'));

  return {
    bytes: (bytes: number) => formatBytes(bytes, [t('format.bytes'), t('format.kb'), t('format.mb')]),
    /** Day, month and year, such as "Nov 26, 2026". */
    date: (value: string | Date) =>
      new Date(value).toLocaleDateString(tag.value, { day: 'numeric', month: 'short', year: 'numeric' }),
    dateTime: (value: string | Date) =>
      new Intl.DateTimeFormat(tag.value, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value)),
    dayMonth: (value: string | Date) =>
      new Date(value).toLocaleDateString(tag.value, { day: 'numeric', month: 'short' }),
    monthYear: (value: string | Date) =>
      new Date(value).toLocaleDateString(tag.value, { month: 'long', year: 'numeric' }),
    relative: (value: string) => {
      const minutes = Math.floor((Date.now() - parseAnalyticsDate(value).getTime()) / 60000);
      if (minutes < 1) return t('format.justNow');
      const format = new Intl.RelativeTimeFormat(tag.value, { style: 'short' });
      if (minutes < 60) return format.format(-minutes, 'minute');
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return format.format(-hours, 'hour');
      return format.format(-Math.floor(hours / 24), 'day');
    },
  };
}
