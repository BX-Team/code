import type { VersionFile } from '@bx-team/projects';
import { formatSemver, type Semver } from './version';

export interface BumpContext {
  version: Semver;
  /** `v<version>`, the tag the release will get. */
  tag: string;
}

/** Rewrites one file for a new version; throws when the file no longer has the expected shape. */
export interface FileBump {
  path: string;
  /** Left untouched for a pre-release — install instructions keep pointing at the last stable one. */
  stableOnly?: boolean;
  apply(text: string, context: BumpContext): string;
}

/** The `version` of `[workspace.package]`, or of `[package]` in a single-crate repository. */
export function cargoManifest(path = 'Cargo.toml'): FileBump {
  return {
    path,
    apply(text, { version }) {
      const section = /^\[(workspace\.package|package)\]\s*$/m.exec(text);
      if (!section) throw new Error(`${path}: no [workspace.package] or [package] section`);

      const start = section.index + section[0].length;
      const next = text.slice(start).search(/^\[/m);
      const end = next === -1 ? text.length : start + next;

      const body = text.slice(start, end);
      const line = /^version = "[^"]*"$/m;
      if (!line.test(body)) throw new Error(`${path}: [${section[1]}] has no version line`);

      return text.slice(0, start) + body.replace(line, `version = "${formatSemver(version)}"`) + text.slice(end);
    },
  };
}

/** Every `[[package]]` without a `source` — the workspace's own crates — gets the new version. */
export function cargoLock(path = 'Cargo.lock'): FileBump {
  return {
    path,
    apply(text, { version }) {
      let changed = 0;
      const blocks = text.split(/(?=^\[\[package\]\]$)/m).map(block => {
        if (!block.startsWith('[[package]]') || /^source = /m.test(block)) return block;
        changed++;
        return block.replace(/^version = "[^"]*"$/m, `version = "${formatSemver(version)}"`);
      });

      if (changed === 0) throw new Error(`${path}: no workspace packages found`);
      return blocks.join('');
    },
  };
}

export interface Replacement {
  pattern: RegExp;
  /** `{version}` and `{tag}` are substituted; `$1` and friends keep their `String.replace` meaning. */
  with: string;
}

/**
 * Regex rewrites, optionally confined to the text between two marker lines. Every pattern
 * must match at least once, so a README edit that drops a link fails the release PR loudly.
 */
export function replace(
  path: string,
  replacements: Replacement[],
  options: { between?: [string, string]; stableOnly?: boolean } = {},
): FileBump {
  return {
    path,
    stableOnly: options.stableOnly,
    apply(text, context) {
      let start = 0;
      let end = text.length;
      if (options.between) {
        const [open, close] = options.between;
        start = text.indexOf(open);
        end = text.indexOf(close, start);
        if (start === -1 || end === -1) throw new Error(`${path}: markers ${open} … ${close} not found`);
      }

      let region = text.slice(start, end);
      for (const { pattern, with: template } of replacements) {
        const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
        if (!global.test(region)) throw new Error(`${path}: ${pattern} matched nothing`);
        global.lastIndex = 0;
        const substitute = template
          .replaceAll('{version}', formatSemver(context.version))
          .replaceAll('{tag}', context.tag);
        region = region.replace(global, substitute);
      }

      return text.slice(0, start) + region + text.slice(end);
    },
  };
}

/** The rewrite a registry entry describes. */
export function fileBump(file: VersionFile): FileBump {
  switch (file.kind) {
    case 'cargo-manifest':
      return cargoManifest(file.path);
    case 'cargo-lock':
      return cargoLock(file.path);
    case 'replace':
      return replace(file.path, file.replacements, { between: file.between, stableOnly: file.stableOnly });
  }
}
