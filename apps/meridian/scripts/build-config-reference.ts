/** Regenerates `reference.gen.ts` from upstream. Every key the builder writes is looked
 *  up in the YAML behind the PaperMC docs and in Purpur's config classes, so a path that
 *  moved fails here rather than being ignored by the server.
 *
 *  Run after a Paper, Purpur or DivineMC bump:
 *  `bun run --filter @bx-team/meridian build:config-reference` */

import { DIVINEMC_DEFAULTS } from '../app/lib/divinemc/defaults';
import { DESCRIPTIONS } from '../app/lib/divinemc/descriptions';
import type { FileId } from '../app/lib/serverconfig/files';
import { RULES } from '../app/lib/serverconfig/rules';
import { type ConfigValue, flatten } from '../app/lib/serverconfig/tree';

/** The Minecraft version the upstream sources were read at. Shown on the page. */
const VERIFIED_AGAINST = '26.2';

const PAPER_DOCS = 'https://raw.githubusercontent.com/PaperMC/docs/main/src/config/paper';
const PURPUR_SRC =
  'https://raw.githubusercontent.com/PurpurMC/Purpur/HEAD/purpur-server/src/main/java/org/purpurmc/purpur';

const PAPER_SOURCES: Partial<Record<FileId, string>> = {
  'server.properties': 'server-properties.yml',
  'bukkit.yml': 'bukkit.yml',
  'spigot.yml': 'spigot.yml',
  'paper-global.yml': 'paper-global.yml',
  'paper-world-defaults.yml': 'paper-world-defaults.yml',
};

/** Defaults DivineMC changes in files it inherits, from its own patch set:
 *  divinemc-server/paper-patches/features/0008 and purpur-patches/features/0003. */
const DIVINEMC_DELTA: Record<string, ConfigValue> = {
  'bukkit.yml:settings.query-plugins': false,
  'spigot.yml:settings.save-user-cache-on-stop-only': true,
  'purpur.yml:settings.use-alternate-keepalive': true,
};

/** Purpur's config classes carry no prose. These are written from the Purpur
 *  documentation (purpurmc.org/docs/Configuration); the path and the default next to
 *  them are still read out of the source, which is the part that breaks silently. */
const PURPUR_DESCRIPTIONS: Record<string, string> = {
  'settings.use-alternate-keepalive':
    'Sends a keepalive packet every second and only kicks after 30 seconds with no answer, instead of kicking on one dropped packet.',
  'settings.lagging-threshold': 'The TPS below which Purpur considers the server to be lagging.',
  'settings.logger.suppress-init-legacy-material-errors': 'Hides the legacy material warnings plugins produce on load.',
  'settings.logger.suppress-ignored-advancement-warnings': 'Hides warnings about advancements the server ignored.',
  'settings.logger.suppress-unrecognized-recipe-errors': 'Hides errors about recipes the server does not recognise.',
  'settings.logger.suppress-setblock-in-far-chunk-errors': 'Hides the setblock-in-a-far-chunk errors plugins trigger.',
  'settings.logger.suppress-library-loader': 'Hides the library loader chatter on startup.',
  'world-settings.default.mobs.dolphin.disable-treasure-searching':
    'Stops dolphins from running the structure search they use to lead players to treasure.',
  'world-settings.default.mobs.villager.lobotomize.enabled':
    'A villager that cannot path to its destination loses its AI and only restocks its trades.',
  'world-settings.default.mobs.villager.search-radius.acquire-poi':
    'Radius in blocks a villager searches for a job site block.',
  'world-settings.default.mobs.villager.search-radius.nearest-bed-sensor':
    'Radius in blocks a villager searches for a bed.',
  'world-settings.default.mobs.zombie.aggressive-towards-villager-when-lagging':
    'Whether zombies keep targeting villagers while the server is below the lagging threshold.',
  'world-settings.default.mobs.squid.immune-to-EAR':
    'Whether squid ignore the entity activation range from spigot.yml.',
  'world-settings.default.gameplay-mechanics.entities-can-use-portals':
    'Whether entities other than players may travel through portals.',
  'world-settings.default.gameplay-mechanics.player.teleport-if-outside-border':
    'Teleports a player who ends up outside the world border back to spawn.',
  'world-settings.default.gameplay-mechanics.armorstand.can-movement-tick':
    'Whether armour stands are allowed to move at all.',
  'world-settings.default.gameplay-mechanics.armorstand.can-move-in-water':
    'Whether armour stands are pushed by water.',
  'world-settings.default.gameplay-mechanics.armorstand.can-move-in-water-over-fence':
    'Whether armour stands are pushed by water over a fence.',
  'world-settings.default.blocks.observer.disable-clock':
    'Stops two observers facing each other from producing an endless signal.',
};

/** Java constants Purpur uses as a default value instead of a literal. */
const JAVA_CONSTANTS: Record<string, ConfigValue> = {
  'AcquirePoi.SCAN_RANGE': 48,
};

interface Entry {
  /** null when upstream has no value for this exact key: a map entry that does not exist
   *  by default, or a documented default of "default"/"disabled". */
  default: ConfigValue | null;
  description: string;
}

async function get(url: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.text();
    } catch {
      // The GitHub CDN drops connections often enough that one retry is not enough.
    }
    await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
  }
  throw new Error(`could not fetch ${url}`);
}

/** "false" → false, "256" → 256, "10s" → "10s", "default" → null. */
function literal(raw: unknown): ConfigValue | null {
  if (typeof raw === 'boolean' || typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return null;
  const text = raw.trim().replace(/[DFL]$/, '');
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (['default', 'disabled', 'N/A', 'now-in-commands.yml', ''].includes(text)) return null;
  if (text.startsWith('"') && text.endsWith('"')) return text.slice(1, -1);
  return text;
}

const isDocLeaf = (node: unknown): node is { default: unknown; description: string } =>
  typeof node === 'object' && node !== null && typeof (node as { description?: unknown }).description === 'string';

function readPaperDocs(yaml: string): Map<string, Entry> {
  const out = new Map<string, Entry>();
  const walk = (node: unknown, prefix: string) => {
    if (isDocLeaf(node)) {
      out.set(prefix, { default: literal(node.default), description: collapse(node.description) });
      return;
    }
    if (typeof node !== 'object' || node === null) return;
    for (const [key, value] of Object.entries(node)) walk(value, prefix ? `${prefix}.${key}` : key);
  };
  walk(Bun.YAML.parse(yaml), '');
  return out;
}

/** Purpur reads its config as `getBoolean("path", field)`, so the default is whichever
 *  value the field was declared with — or Java's own default when it has none. */
function readPurpurSource(sources: { text: string; prefix: string }[]): Map<string, Entry> {
  const javaDefault: Record<string, string> = {
    boolean: 'false',
    int: '0',
    double: '0.0',
    float: '0.0',
    long: '0',
    String: '',
  };
  const out = new Map<string, Entry>();
  for (const { text, prefix } of sources) {
    const fields = new Map<string, string>();
    const declaration =
      /^\s*(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?(boolean|int|double|float|long|String)\s+(\w+)\s*(?:=\s*([^;]+?))?\s*;/gm;
    for (const match of text.matchAll(declaration)) {
      fields.set(match[2] as string, (match[3] ?? javaDefault[match[1] as string]) as string);
    }
    const read = /get(?:Boolean|Int|Double|String|Long|Float)\(\s*"([^"]+)"\s*,\s*([^)]+?)\s*\)/g;
    for (const match of text.matchAll(read)) {
      const path = prefix + (match[1] as string);
      if (out.has(path)) continue;
      const raw = (match[2] as string).trim();
      const resolved = JAVA_CONSTANTS[raw] ?? literal(fields.get(raw) ?? raw);
      out.set(path, { default: resolved ?? null, description: PURPUR_DESCRIPTIONS[path] ?? '' });
    }
  }
  return out;
}

function readDivineMc(): Map<string, Entry> {
  const out = new Map<string, Entry>();
  for (const [path, value] of flatten(DIVINEMC_DEFAULTS)) {
    out.set(path, { default: value, description: collapse(DESCRIPTIONS[path] ?? '') });
  }
  return out;
}

const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Documented map keys appear as `<entity-type>` placeholders. A concrete key resolves
 *  against the placeholder, but its own default is unknown — the map is empty by default. */
function resolve(index: Map<string, Entry>, path: string): Entry | null {
  const exact = index.get(path);
  if (exact) return exact;

  const segments = path.split('.');
  for (const [candidate, entry] of index) {
    if (!candidate.includes('<')) continue;
    const parts = candidate.split('.');
    if (parts.length !== segments.length) continue;
    const matches = parts.every((part, i) => (part.startsWith('<') && part.endsWith('>')) || part === segments[i]);
    if (matches) return { default: null, description: entry.description };
  }
  return null;
}

/** Keys that share a documented sibling: the reference only spells out one example of
 *  the map, and every other entry in it means the same thing. */
function alias(path: string): string | null {
  const override = path.match(/^packet-limiter\.overrides\.[^.]+\.(.+)$/);
  if (override) return `packet-limiter.overrides.minecraft:place_recipe.${override[1]}`;
  return null;
}

const [paperFiles, purpurConfig, purpurWorld] = await Promise.all([
  Promise.all(
    Object.entries(PAPER_SOURCES).map(async ([id, file]) => [id, await get(`${PAPER_DOCS}/${file}`)] as const),
  ),
  get(`${PURPUR_SRC}/PurpurConfig.java`),
  get(`${PURPUR_SRC}/PurpurWorldConfig.java`),
]);

const indexes = new Map<FileId, Map<string, Entry>>();
for (const [id, yaml] of paperFiles) indexes.set(id as FileId, readPaperDocs(yaml));
indexes.set(
  'purpur.yml',
  readPurpurSource([
    { text: purpurConfig, prefix: '' },
    { text: purpurWorld, prefix: 'world-settings.default.' },
  ]),
);
indexes.set('divinemc.yml', readDivineMc());

const reference: Record<string, Entry> = {};
const missing: string[] = [];
const undocumented: string[] = [];

for (const rule of RULES) {
  const key = `${rule.file}:${rule.path}`;
  if (reference[key]) continue;
  const index = indexes.get(rule.file);
  if (!index) throw new Error(`no reference source for ${rule.file}`);

  const entry = resolve(index, rule.path) ?? (alias(rule.path) ? resolve(index, alias(rule.path) as string) : null);
  if (!entry) {
    missing.push(key);
    continue;
  }
  if (!entry.description) undocumented.push(key);
  reference[key] = alias(rule.path) ? { default: null, description: entry.description } : entry;
}

if (missing.length) {
  console.error(`\n${missing.length} path(s) do not exist upstream:\n${missing.map(key => `  ${key}`).join('\n')}\n`);
  process.exit(1);
}
if (undocumented.length) {
  // Not fatal: a handful of DivineMC keys carry no comment in the file itself, and the
  // page falls back to the rule's own reasoning for those.
  console.warn(
    `\n${undocumented.length} path(s) carry no upstream description:\n${undocumented.map(key => `  ${key}`).join('\n')}\n`,
  );
}

const body = Object.entries(reference)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, entry]) => `  ${JSON.stringify(key)}: ${JSON.stringify(entry)},`)
  .join('\n');

const delta = Object.entries(DIVINEMC_DELTA)
  .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
  .join('\n');

const output = `// Generated by scripts/build-config-reference.ts — do not edit by hand.
// Every default and description below is read out of the upstream source of truth:
// the YAML behind the PaperMC configuration reference, and Purpur's own config classes.
import type { ConfigValue } from './tree';

/** The Minecraft version the sources above were read at. */
export const VERIFIED_AGAINST = ${JSON.stringify(VERIFIED_AGAINST)};

export interface ReferenceEntry {
  /** null when upstream has no value for this key by default — an entry in a map that
   *  ships empty, or a default the reference itself only calls "default". */
  default: ConfigValue | null;
  description: string;
}

/** Keyed by \`\${file}:\${path}\`. */
export const REFERENCE: Record<string, ReferenceEntry> = {
${body}
};

/** Where DivineMC ships a different default than the file it inherits. */
export const DIVINEMC_DELTA: Record<string, ConfigValue> = {
${delta}
};
`;

const target = new URL('../app/lib/serverconfig/reference.gen.ts', import.meta.url);
await Bun.write(target, output);

// Biome is the formatter for everything in the repository, generated files included.
await Bun.spawn(['bunx', 'biome', 'check', '--write', target.pathname], { stdout: 'ignore', stderr: 'inherit' }).exited;

console.log(`wrote ${Object.keys(reference).length} keys, verified against Minecraft ${VERIFIED_AGAINST}`);
