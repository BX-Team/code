import type { ConfigTree, ConfigValue } from './tree';

export interface EmitOptions {
  /** Dotted path to the comment written above that key. */
  comments?: Record<string, string>;
}

const isTree = (value: unknown): value is ConfigTree =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function toYaml(tree: ConfigTree, options: EmitOptions = {}): string {
  return `${emit(tree, '', '', options, new Set()).join('\n')}\n`;
}

/** A reason shared by a block of keys is written above the first of them and not
 *  repeated; `written` is what has been said so far. */
function emit(tree: ConfigTree, prefix: string, indent: string, options: EmitOptions, written: Set<string>): string[] {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const own = options.comments?.[path];
    const comment = own !== undefined && !written.has(own) ? own : undefined;
    if (own !== undefined) written.add(own);
    if (comment) {
      // The file's own comments are multi-line; each line needs its own `#`.
      for (const line of comment.split('\n')) lines.push(`${indent}# ${line}`.trimEnd());
    }

    if (isTree(value)) {
      lines.push(`${indent}${key}:`);
      lines.push(...emit(value, path, `${indent}  `, options, written));
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${indent}${key}: []`);
      } else {
        lines.push(`${indent}${key}:`);
        for (const item of value) lines.push(`${indent}  - ${scalar(item)}`);
      }
    } else {
      lines.push(`${indent}${key}: ${scalar(value)}`);
    }
  }

  return lines;
}

/** Quotes only what YAML would otherwise read as something else. */
export function scalar(value: ConfigValue | string | number | boolean): string {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `[${value.map(scalar).join(', ')}]`;
  const text = String(value);
  if (text === '') return "''";
  if (/^[A-Za-z0-9_][A-Za-z0-9_.\-/]*$/.test(text) && !/^(true|false|null|yes|no|on|off)$/i.test(text)) return text;
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
