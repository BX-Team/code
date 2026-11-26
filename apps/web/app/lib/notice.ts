export type NoticeLevel = 'warning' | 'info';

/** A remark shown next to generated output: what the inputs did to it. Its words are `notices.<id>.title` and `.body`. */
export interface Notice {
  level: NoticeLevel;
  id: string;
  params?: Record<string, string | number>;
}
