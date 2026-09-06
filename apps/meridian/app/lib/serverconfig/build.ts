import type { Notice } from '../notice';
import { type ConfigFile, filesFor, includes } from './files';
import { type Derived, derive, type Profile } from './profile';
import { DIVINEMC_DELTA, REFERENCE, VERIFIED_AGAINST } from './reference.gen';
import { RULES } from './rules';
import { type ConfigValue, type Patch, same, treeFromPatch } from './tree';
import { scalar, toYaml } from './yaml';

export { VERIFIED_AGAINST };

export interface Applied {
  path: string;
  value: ConfigValue;
  /** The shipped value, or null when upstream leaves the key unset. */
  from: ConfigValue | null;
  /** Why this profile wants it. Ours, not upstream's. */
  why: string;
  /** Upstream's own words about the key; empty when it ships without a comment. */
  description: string;
  gameplay: boolean;
}

export interface FileOutput {
  file: ConfigFile;
  changes: Applied[];
  /** The snippet to paste, or an empty string when the profile changes nothing here. */
  text: string;
}

export interface BuildResult {
  files: FileOutput[];
  notices: Notice[];
  changed: number;
}

export function build(profile: Profile): BuildResult {
  const derived = derive(profile);
  const patches = new Map<string, { patch: Patch; changes: Applied[] }>();

  for (const file of filesFor(profile.software)) patches.set(file.id, { patch: {}, changes: [] });

  for (const rule of RULES) {
    if (rule.since && !includes(profile.software, rule.since)) continue;
    if (rule.gameplay && derived.vanillaOnly) continue;
    if (rule.aggressive && profile.intensity !== 'aggressive') continue;

    const bucket = patches.get(rule.file);
    if (!bucket) continue;

    const value = rule.value(profile, derived);
    if (value === undefined) continue;

    const key = `${rule.file}:${rule.path}`;
    const reference = REFERENCE[key];
    const shipped = shippedDefault(profile, key, reference?.default ?? null);
    const applied: Applied = {
      path: rule.path,
      value,
      from: shipped,
      why: rule.why,
      description: reference?.description ?? '',
      gameplay: rule.gameplay === true,
    };

    // A key the chosen software already ships this way is not a change worth writing.
    if (shipped !== null && same(shipped, value)) continue;

    bucket.patch[rule.path] = value;
    bucket.changes.push(applied);
  }

  const files: FileOutput[] = filesFor(profile.software).map(file => {
    const bucket = patches.get(file.id) as { patch: Patch; changes: Applied[] };
    return { file, changes: bucket.changes, text: render(file, bucket.patch, bucket.changes) };
  });

  return {
    files,
    notices: diagnose(profile, derived),
    changed: files.reduce((total, file) => total + file.changes.length, 0),
  };
}

/** DivineMC changes some defaults in the files it inherits, so a change on Paper can be
 *  a no-op there. */
function shippedDefault(profile: Profile, key: string, upstream: ConfigValue | null): ConfigValue | null {
  if (profile.software === 'divinemc' && key in DIVINEMC_DELTA) return DIVINEMC_DELTA[key] as ConfigValue;
  return upstream;
}

function render(file: ConfigFile, patch: Patch, changes: Applied[]): string {
  if (changes.length === 0) return '';
  const comments = Object.fromEntries(changes.map(change => [change.path, change.why]));

  if (file.format === 'properties') {
    const written = new Set<string>();
    const lines = changes.map(change => {
      const head = written.has(change.why) ? '' : `# ${change.why}\n`;
      written.add(change.why);
      return `${head}${change.path}=${plain(change.value)}`;
    });
    return `${lines.join('\n\n')}\n`;
  }
  return toYaml(treeFromPatch(patch), { comments });
}

const plain = (value: ConfigValue) => (Array.isArray(value) ? value.join(',') : String(value));

/** Everything the answers imply that the generated keys do not say out loud. */
function diagnose(profile: Profile, derived: Derived): Notice[] {
  const notices: Notice[] = [];
  const { cores, players, intensity, type } = profile;

  if (cores <= 2) {
    notices.push({
      level: 'warning',
      title: `${cores} core${cores === 1 ? '' : 's'} is the ceiling here`,
      body: 'No configuration turns a two-core host into a big server. The distances above are already cut for it; past that the answer is a better host, not another setting.',
    });
  }

  if (profile.software === 'divinemc' && derived.regionized && cores < 8) {
    notices.push({
      level: 'info',
      title: 'Parallel ticking is on with little headroom',
      body: `Regionized chunk ticking asks for ${derived.regionThreads} threads on ${cores} cores, and the main tick, chunk system and GC still need theirs. Watch the MSPT after enabling it and drop the count if it got worse.`,
    });
  }

  if (profile.software === 'divinemc' && profile.worlds === 'one') {
    notices.push({
      level: 'info',
      title: 'Parallel world ticking left off',
      body: 'It gives each world its own tick thread, so on a single world there is nothing to run in parallel and it would only add the synchronisation cost. Say "a few" or "many" worlds to turn it on.',
    });
  }

  if (derived.vanillaOnly) {
    notices.push({
      level: 'info',
      title: type === 'technical' ? 'Vanilla parity kept' : 'Only invisible changes',
      body: 'Every setting a player could notice was left at its default: activation ranges, spawn limits, hopper timings, redstone. This config is smaller on purpose.',
    });
  }

  if (intensity === 'aggressive') {
    notices.push({
      level: 'warning',
      title: 'Aggressive settings break things on purpose',
      body: 'Item despawn rates, hopper move events and the nether ceiling are in this profile. Read the reason on each key before pasting it into a live server.',
    });
  }

  if (intensity === 'aggressive' && !profile.customEntities) {
    notices.push({
      level: 'warning',
      title: 'InventoryMoveItemEvent is switched off',
      body: 'hopper.disable-move-event skips the event entirely, and most protection plugins listen to it to stop hopper theft. Turn it back on if you run one.',
    });
  }

  if (profile.customEntities) {
    notices.push({
      level: 'info',
      title: 'Armour stands and markers left alone',
      body: 'ItemsAdder, ModelEngine and Oraxen animate armour stands and markers, so the settings that stop them ticking were skipped for you.',
    });
  }

  if (profile.proxy === 'velocity') {
    notices.push({
      level: 'warning',
      title: 'Velocity still needs its secret',
      body: 'proxies.velocity.secret is not generated here. Copy it from forwarding.secret on the proxy, because without it every join is rejected.',
    });
  }

  if (profile.proxy !== 'none') {
    notices.push({
      level: 'warning',
      title: 'Firewall the backend port',
      body: 'online-mode is off so the proxy can forward identities. If the port is reachable from the internet, anyone can join as anyone.',
    });
  }

  if (!profile.pregenerated) {
    notices.push({
      level: 'info',
      title: 'Treasure maps switched off',
      body: 'Generating one searches for a structure, and in ungenerated terrain that search can hang the server. Pregenerate the world with Chunky and a vanilla world border, then turn them back on.',
    });
  }

  if (profile.harden) {
    notices.push({
      level: 'info',
      title: 'Packet limits are a blunt instrument',
      body: 'The custom_payload limit also covers plugin messaging. If a plugin sends a lot of it, raise that one entry rather than dropping the whole block.',
    });
  }

  if (derived.dab) {
    notices.push({
      level: 'info',
      title: 'DAB replaced the villager tick rates',
      body: 'Paper’s villager behaviour and sensor rates were deliberately not written: DAB already slows distant villagers, and doing both makes them visibly stupid up close.',
    });
  }

  if (type === 'anarchy') {
    notices.push({
      level: 'warning',
      title: 'Secure seed needs a fresh world',
      body: 'It only applies to chunks generated after it is on. Terrain that already exists keeps the seed it was made with, so ore locations stay known.',
    });
  }

  if (players >= 100 && derived.view >= 8) {
    notices.push({
      level: 'info',
      title: 'View distance is the next lever',
      body: `At ${players} players every chunk is sent many times over. If the network is the bottleneck rather than the tick, take view-distance below ${derived.view} before touching anything else.`,
    });
  }

  notices.push({
    level: 'info',
    title: 'Per-world overrides beat global ones',
    body: 'These land in the defaults for every world. A nether with no players needs none of this; give it its own file under world/dimensions and cut it further.',
  });

  return notices;
}

export { scalar };
