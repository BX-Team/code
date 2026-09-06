export type ConfigValue = string | number | boolean | string[];
export type ConfigTree = { [key: string]: ConfigValue | ConfigTree };

/** Never a whole file: upstream owns the defaults and moves them every release. */
export type Patch = Record<string, ConfigValue>;

export interface Change {
  path: string;
  from: ConfigValue | undefined;
  to: ConfigValue;
}

const isTree = (value: unknown): value is ConfigTree =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Dotted path to value, for every leaf. */
export function flatten(tree: ConfigTree, prefix = ''): Map<string, ConfigValue> {
  const out = new Map<string, ConfigValue>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isTree(value)) {
      for (const [nested, leaf] of flatten(value, path)) out.set(nested, leaf);
    } else {
      out.set(path, value);
    }
  }
  return out;
}

export function getPath(tree: ConfigTree, path: string): ConfigValue | undefined {
  let node: ConfigTree | ConfigValue | undefined = tree;
  for (const segment of path.split('.')) {
    if (!isTree(node)) return undefined;
    node = node[segment];
  }
  return isTree(node) ? undefined : node;
}

/** Returns a new tree; the defaults are never mutated. */
export function withPatch(tree: ConfigTree, patch: Patch): ConfigTree {
  const next = structuredClone(tree);
  for (const [path, value] of Object.entries(patch)) {
    const segments = path.split('.');
    const leaf = segments.pop() as string;
    let node = next;
    for (const segment of segments) {
      const child = node[segment];
      if (!isTree(child)) break;
      node = child;
    }
    node[leaf] = value;
  }
  return next;
}

export function changesFrom(base: ConfigTree, next: ConfigTree): Change[] {
  const baseFlat = flatten(base);
  const changes: Change[] = [];
  for (const [path, value] of flatten(next)) {
    const before = baseFlat.get(path);
    if (!same(before, value)) changes.push({ path, from: before, to: value });
  }
  return changes;
}

export function same(a: ConfigValue | undefined, b: ConfigValue | undefined): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => item === b[i]);
  return a === b;
}

/** Builds a nested tree out of a flat patch, so it can be emitted as valid YAML. */
export function treeFromPatch(patch: Patch): ConfigTree {
  const out: ConfigTree = {};
  for (const [path, value] of Object.entries(patch)) {
    const segments = path.split('.');
    const leaf = segments.pop() as string;
    let node = out;
    for (const segment of segments) {
      const child = node[segment];
      if (!isTree(child)) node[segment] = {};
      node = node[segment] as ConfigTree;
    }
    node[leaf] = value;
  }
  return out;
}
