export type NoticeLevel = 'warning' | 'info';

/** A remark next to generated output; its words are `notices.<id>.title` and `.body`. */
export interface Notice {
  level: NoticeLevel;
  id: string;
  params?: Record<string, string | number>;
}
