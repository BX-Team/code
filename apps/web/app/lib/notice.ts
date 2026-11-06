export type NoticeLevel = 'warning' | 'info';

/** A remark shown next to generated output: what the inputs did to it. */
export interface Notice {
  level: NoticeLevel;
  title: string;
  body: string;
}
