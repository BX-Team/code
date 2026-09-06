/** Walks the whole answer matrix, parses every generated snippet back with a real YAML
 *  parser, and checks the numbers that only make sense against each other. A tracking
 *  range below the activation range reads fine and plays badly.
 *
 *  `bun run --filter @bx-team/meridian check:config` */

import { build } from '../app/lib/serverconfig/build';
import type { Software } from '../app/lib/serverconfig/files';
import {
  DEFAULT_PROFILE,
  derive,
  type Intensity,
  type Profile,
  type ProxyKind,
  type ServerType,
} from '../app/lib/serverconfig/profile';
import { flatten, same } from '../app/lib/serverconfig/tree';

const SOFTWARE: Software[] = ['paper', 'purpur', 'divinemc'];
const TYPES: ServerType[] = ['survival', 'anarchy', 'minigames', 'creative', 'technical'];
const LEVELS: Intensity[] = ['safe', 'balanced', 'aggressive'];
const PROXIES: ProxyKind[] = ['none', 'velocity', 'bungeecord'];
const WORLDS: Profile['worlds'][] = ['one', 'few', 'many'];

const failures: string[] = [];
let profiles = 0;
let keys = 0;

function check(condition: boolean, label: string, message: string) {
  if (!condition) failures.push(`${label}: ${message}`);
}

for (const software of SOFTWARE) {
  for (const type of TYPES) {
    for (const intensity of LEVELS) {
      for (const players of [5, 40, 120, 400]) {
        for (const cores of [1, 2, 4, 8, 16, 64]) {
          for (const worlds of WORLDS) {
            for (const proxy of PROXIES) {
              for (const flags of [0, 1]) {
                const profile: Profile = {
                  ...DEFAULT_PROFILE,
                  software,
                  type,
                  intensity,
                  players,
                  cores,
                  worlds,
                  proxy,
                  offlineMode: flags === 1,
                  antiCheat: flags === 1,
                  customEntities: flags === 1,
                  pregenerated: flags === 1,
                  harden: flags === 0,
                };
                verify(profile);
                profiles += 1;
              }
            }
          }
        }
      }
    }
  }
}

function verify(profile: Profile) {
  const label = [
    profile.software,
    profile.type,
    profile.intensity,
    `${profile.players}p`,
    `${profile.cores}c`,
    profile.worlds,
    profile.proxy,
  ].join('/');
  const derived = derive(profile);
  const result = build(profile);
  const written = new Map<string, unknown>();

  for (const file of result.files) {
    for (const change of file.changes) {
      keys += 1;
      written.set(`${file.file.id}:${change.path}`, change.value);
      check(
        change.from === null || !same(change.from, change.value),
        label,
        `${file.file.id}:${change.path} is written but already equals the shipped default`,
      );
    }

    if (!file.changes.length) {
      check(file.text === '', label, `${file.file.id} has no changes but produced text`);
      continue;
    }

    if (file.file.format === 'properties') {
      const parsed = Object.fromEntries(
        file.text
          .split('\n')
          .filter(line => line && !line.startsWith('#'))
          .map(line => line.split('=') as [string, string]),
      );
      for (const change of file.changes) {
        check(
          parsed[change.path] === String(change.value),
          label,
          `${file.file.id}:${change.path} did not survive the properties round trip`,
        );
      }
      continue;
    }

    const parsed = flatten(Bun.YAML.parse(file.text) as Record<string, never>);
    for (const change of file.changes) {
      check(
        same(parsed.get(change.path), change.value),
        label,
        `${file.file.id}:${change.path} did not survive the YAML round trip (${String(parsed.get(change.path))} vs ${String(change.value)})`,
      );
    }
    check(
      parsed.size === file.changes.length,
      label,
      `${file.file.id} emitted ${parsed.size} keys for ${file.changes.length} changes`,
    );
  }

  // Effective value: what the server ends up with, whether we wrote it or left the
  // shipped default alone. A pair is only worth asserting when we moved one of them.
  const number = (key: string, shipped: number) => (written.get(key) as number | undefined) ?? shipped;
  const touched = (...keys: string[]) => keys.some(key => written.has(key));

  const simulation = number('server.properties:simulation-distance', 10);
  const view = number('server.properties:view-distance', 10);
  if (touched('server.properties:simulation-distance', 'server.properties:view-distance')) {
    check(view >= simulation, label, `view-distance ${view} is below simulation-distance ${simulation}`);
  }

  const spawnRange = number('spigot.yml:world-settings.default.mob-spawn-range', 8);
  if (touched('spigot.yml:world-settings.default.mob-spawn-range')) {
    check(
      spawnRange <= simulation,
      label,
      `mob-spawn-range ${spawnRange} is outside the simulation distance ${simulation}: mobs would spawn in chunks that never tick`,
    );
  }

  const hardKey = 'paper-world-defaults.yml:entities.spawning.despawn-ranges.monster.hard';
  const hard = number(hardKey, 128);
  const soft = number('paper-world-defaults.yml:entities.spawning.despawn-ranges.monster.soft', 32);
  if (touched(hardKey)) {
    check(hard > soft, label, `hard despawn ${hard} is not past the soft range ${soft}`);
    check(
      hard > simulation * 16,
      label,
      `hard despawn ${hard} is inside the simulated area (${simulation} × 16): mobs would vanish in front of players`,
    );
  }

  for (const group of ['animals', 'monsters']) {
    const activationKey = `spigot.yml:world-settings.default.entity-activation-range.${group}`;
    const trackingKey = `spigot.yml:world-settings.default.entity-tracking-range.${group}`;
    if (!touched(activationKey, trackingKey)) continue;
    const activation = number(activationKey, 32);
    const tracking = number(trackingKey, 96);
    check(
      tracking >= activation,
      label,
      `${group} are tracked to ${tracking} but ticked to ${activation}: they would act before they are visible`,
    );
  }

  const workers =
    number('divinemc.yml:async.parallel-world-ticking.thread-count', 0) +
    number('divinemc.yml:async.regionized-chunk-ticking.executor-thread-count', 0);
  check(
    workers < profile.cores,
    label,
    `parallel ticking asks for ${workers} threads on ${profile.cores} cores, leaving nothing for the main tick`,
  );

  if (derived.dab) {
    check(
      !written.has('paper-world-defaults.yml:tick-rates.behavior.villager.acquirepoi'),
      label,
      'DAB and the Paper villager behaviour rates are both set; they compound into visibly broken villagers',
    );
  }

  if (profile.customEntities) {
    check(
      !written.has('paper-world-defaults.yml:entities.armor-stands.tick'),
      label,
      'armour stand ticking was disabled on a server that animates them with a plugin',
    );
  }

  if (derived.vanillaOnly) {
    const observable = result.files.flatMap(file => file.changes).filter(change => change.gameplay);
    check(observable.length === 0, label, `${observable.length} observable changes on a vanilla-only profile`);
  }
}

if (failures.length) {
  const unique = [...new Set(failures)];
  console.error(
    `\n${failures.length} failure(s), ${unique.length} distinct:\n${unique.map(line => `  ${line}`).join('\n')}\n`,
  );
  process.exit(1);
}

console.log(`${profiles} profiles, ${keys} generated keys, no failures`);
