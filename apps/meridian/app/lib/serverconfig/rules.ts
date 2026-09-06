import type { FileId, Software } from './files';
import type { Derived, Profile } from './profile';
import type { ConfigValue } from './tree';

export interface Rule {
  file: FileId;
  /** Checked against the upstream reference by `scripts/build-config-reference.ts`, so a
   *  path that moved fails there instead of being ignored by the server. */
  path: string;
  /** The value for this profile, or undefined to leave the key alone. */
  value: (profile: Profile, derived: Derived) => ConfigValue | undefined;
  /** One sentence, written above the key in the generated snippet. */
  why: string;
  /** Players can tell the difference. Dropped on Safe, and on a technical server. */
  gameplay?: boolean;
  /** Only applied on Aggressive. */
  aggressive?: boolean;
  /** Needs this software or a fork downstream of it. */
  since?: Software;
}

type Valuer = (profile: Profile, derived: Derived) => ConfigValue | undefined;

interface Shared {
  file: FileId;
  why: string;
  gameplay?: boolean;
  aggressive?: boolean;
  since?: Software;
}

/** One `why` shared by a block of keys that only make sense together. */
function block(shared: Shared, entries: Record<string, Valuer>): Rule[] {
  return Object.entries(entries).map(([path, value]) => ({ ...shared, path, value }));
}

/** A record of fixed values under one prefix, e.g. the projectile save limits. */
function fixed(
  shared: Shared,
  prefix: string,
  values: Record<string, ConfigValue>,
  when: (p: Profile, d: Derived) => boolean = () => true,
): Rule[] {
  return Object.entries(values).map(([key, value]) => ({
    ...shared,
    path: `${prefix}.${key}`,
    value: (profile: Profile, derived: Derived) => (when(profile, derived) ? value : undefined),
  }));
}

/** Stops one arrow farm from producing a chunk the server cannot write back. */
const SAVE_LIMITS: Record<string, number> = {
  area_effect_cloud: 8,
  arrow: 16,
  breeze_wind_charge: 8,
  dragon_fireball: 3,
  egg: 8,
  ender_pearl: 8,
  experience_bottle: 3,
  experience_orb: 16,
  eye_of_ender: 8,
  fireball: 8,
  firework_rocket: 8,
  llama_spit: 3,
  splash_potion: 8,
  lingering_potion: 8,
  shulker_bullet: 8,
  small_fireball: 8,
  snowball: 8,
  spectral_arrow: 16,
  trident: 16,
  wind_charge: 8,
  wither_skull: 4,
};

/** Bulk blocks players dig and throw away, gone in 15s instead of 5min. */
const FAST_DESPAWN: Record<string, number> = {
  cobblestone: 300,
  netherrack: 300,
  sand: 300,
  red_sand: 300,
  gravel: 300,
  dirt: 300,
  short_grass: 300,
  pumpkin: 300,
  melon_slice: 300,
  kelp: 300,
  bamboo: 300,
  sugar_cane: 300,
  twisting_vines: 300,
  weeping_vines: 300,
  oak_leaves: 300,
  spruce_leaves: 300,
  birch_leaves: 300,
  jungle_leaves: 300,
  acacia_leaves: 300,
  dark_oak_leaves: 300,
  mangrove_leaves: 300,
  cherry_leaves: 300,
  cactus: 300,
  diorite: 300,
  granite: 300,
  andesite: 300,
  scaffolding: 600,
};

const MOB_CATEGORIES = [
  'ambient',
  'axolotls',
  'creature',
  'misc',
  'monster',
  'underground_water_creature',
  'water_ambient',
  'water_creature',
];

/** Rates that survive normal play and cut off the client-side crash exploits, from the
 *  SpigotMC optimization guide. */
const PACKET_LIMITS: Record<string, { action: string; interval: number; rate: number }> = {
  'minecraft:command_suggestion': { action: 'DROP', interval: 1.0, rate: 10.0 },
  'minecraft:container_button_click': { action: 'KICK', interval: 1.5, rate: 15.0 },
  'minecraft:container_click': { action: 'KICK', interval: 3.0, rate: 32.0 },
  'minecraft:custom_payload': { action: 'DROP', interval: 1.5, rate: 25.0 },
  'minecraft:interact': { action: 'KICK', interval: 2.0, rate: 30.0 },
  'minecraft:place_recipe': { action: 'DROP', interval: 3.0, rate: 6.0 },
  'minecraft:player_action': { action: 'KICK', interval: 3.0, rate: 240.0 },
  'minecraft:set_creative_mode_slot': { action: 'DROP', interval: 2.5, rate: 20.0 },
  'minecraft:use_item_on': { action: 'KICK', interval: 2.0, rate: 26.0 },
};

function packetLimiterRules(): Rule[] {
  const shared: Shared = {
    file: 'paper-global.yml',
    why: 'Caps how fast a client may send this packet. Without it a single modified client can hang the main thread.',
  };
  const rules: Rule[] = [];
  for (const [packet, limit] of Object.entries(PACKET_LIMITS)) {
    const prefix = `packet-limiter.overrides.${packet}`;
    rules.push(
      { ...shared, path: `${prefix}.action`, value: p => (p.harden ? limit.action : undefined) },
      { ...shared, path: `${prefix}.interval`, value: p => (p.harden ? limit.interval : undefined) },
      { ...shared, path: `${prefix}.max-packet-rate`, value: p => (p.harden ? limit.rate : undefined) },
    );
  }
  return rules;
}

export const RULES: Rule[] = [
  {
    file: 'server.properties',
    path: 'network-compression-threshold',
    value: p => (p.proxy === 'none' ? 256 : -1),
    why: 'Behind a proxy the hop is local, so compression only burns CPU; on a public port 256 keeps the bandwidth bill down.',
  },
  {
    file: 'server.properties',
    path: 'simulation-distance',
    value: (_p, d) => d.simulation,
    why: 'Chunks this close to a player actually tick: mobs, crops, furnaces. It is the single most expensive number on the server.',
    gameplay: true,
  },
  {
    file: 'server.properties',
    path: 'view-distance',
    value: (_p, d) => d.view,
    why: 'Chunks sent to the client but not ticked. Players still see far, the server does not pay for it.',
    gameplay: true,
  },
  {
    file: 'server.properties',
    path: 'entity-broadcast-range-percentage',
    value: (_p, d) => d.entityBroadcast,
    why: 'How close a player has to be before entities are sent to them. Lower means less packet traffic on a crowded server.',
    gameplay: true,
    aggressive: true,
  },
  {
    file: 'server.properties',
    path: 'online-mode',
    value: p => (p.proxy !== 'none' || p.offlineMode ? false : undefined),
    why: 'A backend server behind a proxy must not authenticate itself, because the proxy already did it.',
  },
  {
    file: 'server.properties',
    path: 'enforce-secure-profile',
    value: p => (p.offlineMode ? false : undefined),
    why: 'An offline-mode server has no Mojang chat signatures to enforce, and the check rejects those players outright.',
  },
  {
    file: 'server.properties',
    path: 'allow-flight',
    value: p => (p.antiCheat ? true : undefined),
    why: 'The vanilla flight check false-flags normal movement on a laggy tick. With a real anti-cheat installed, let it do the job.',
  },

  {
    file: 'bukkit.yml',
    path: 'settings.query-plugins',
    value: () => false,
    why: 'Stops the server from listing its plugins to anyone who queries the port.',
  },
  {
    file: 'bukkit.yml',
    path: 'chunk-gc.period-in-ticks',
    value: () => 300,
    why: 'Sweeps unreferenced chunks out of memory twice as often as the default.',
  },
  ...block(
    {
      file: 'bukkit.yml',
      why: 'Mob cap per player. The server multiplies this by the player count, so on a busy server the default is thousands of mobs.',
      gameplay: true,
    },
    Object.fromEntries(
      [
        'monsters',
        'animals',
        'water-animals',
        'water-ambient',
        'water-underground-creature',
        'axolotls',
        'ambient',
      ].map(key => [`spawn-limits.${key}`, ((_p, d) => d.spawnLimits[key]) as Valuer]),
    ),
  ),
  ...block(
    {
      file: 'bukkit.yml',
      why: 'How many ticks between spawn attempts for this group. Water and ambient mobs do not need a try every single tick.',
      gameplay: true,
    },
    Object.fromEntries(
      [
        'monster-spawns',
        'animal-spawns',
        'water-spawns',
        'water-ambient-spawns',
        'water-underground-creature-spawns',
        'axolotl-spawns',
        'ambient-spawns',
      ].map(key => [`ticks-per.${key}`, ((_p, d) => d.spawnTicks[key]) as Valuer]),
    ),
  ),

  {
    file: 'spigot.yml',
    path: 'settings.save-user-cache-on-stop-only',
    value: () => true,
    why: 'The user cache is rebuildable. Rewriting it on every disconnect is disk traffic for nothing.',
  },
  {
    file: 'spigot.yml',
    path: 'settings.netty-threads',
    value: (_p, d) => d.nettyThreads,
    why: 'Threads handling network traffic, about a quarter of the cores. The main tick needs the rest.',
  },
  {
    file: 'spigot.yml',
    path: 'settings.bungeecord',
    value: p => (p.proxy === 'bungeecord' ? true : undefined),
    why: 'Reads the player identity BungeeCord forwards in the handshake.',
  },
  {
    file: 'spigot.yml',
    path: 'settings.log-villager-deaths',
    value: () => false,
    why: 'Console noise. Every villager death is a line written to disk.',
  },
  {
    file: 'spigot.yml',
    path: 'settings.log-named-deaths',
    value: () => false,
    why: 'Same for every named mob, which on a farm server is constant.',
  },
  {
    file: 'spigot.yml',
    path: 'world-settings.default.mob-spawn-range',
    value: (_p, d) => d.mobSpawnRange,
    why: 'Radius in chunks around a player where mobs spawn. Keep it at or below the simulation distance or mobs spawn in chunks that never tick.',
    gameplay: true,
  },
  ...block(
    {
      file: 'spigot.yml',
      why: 'Distance at which this group stops being ticked in full. The biggest single win on a server with many entities.',
      gameplay: true,
    },
    Object.fromEntries(
      ['animals', 'monsters', 'raiders', 'misc', 'water', 'villagers', 'flying-monsters'].map(key => [
        `world-settings.default.entity-activation-range.${key}`,
        ((_p, d) => d.activation[key]) as Valuer,
      ]),
    ),
  ),
  {
    file: 'spigot.yml',
    path: 'world-settings.default.entity-activation-range.tick-inactive-villagers',
    value: () => false,
    why: 'Villagers outside the activation range stop thinking. This is where most of the villager cost goes.',
    gameplay: true,
  },
  {
    file: 'spigot.yml',
    path: 'world-settings.default.entity-activation-range.ignore-spectators',
    value: () => true,
    why: 'A spectator should not keep entities awake around them.',
  },
  ...block(
    {
      file: 'spigot.yml',
      why: 'Distance in blocks at which entities are sent to a player. Keep it above the activation range or mobs appear out of nowhere.',
      gameplay: true,
    },
    Object.fromEntries(
      ['players', 'animals', 'monsters', 'misc', 'other'].map(key => [
        `world-settings.default.entity-tracking-range.${key}`,
        ((_p, d) => d.tracking[key]) as Valuer,
      ]),
    ),
  ),
  ...block(
    {
      file: 'spigot.yml',
      why: 'How many inactive entities are woken per tick, and for how long. Halving them smooths the cost of a big herd.',
      gameplay: true,
      aggressive: true,
    },
    {
      'world-settings.default.entity-activation-range.wake-up-inactive.animals-max-per-tick': () => 2,
      'world-settings.default.entity-activation-range.wake-up-inactive.animals-for': () => 60,
      'world-settings.default.entity-activation-range.wake-up-inactive.monsters-max-per-tick': () => 4,
      'world-settings.default.entity-activation-range.wake-up-inactive.monsters-for': () => 60,
      'world-settings.default.entity-activation-range.wake-up-inactive.villagers-max-per-tick': () => 2,
      'world-settings.default.entity-activation-range.wake-up-inactive.villagers-for': () => 60,
      'world-settings.default.entity-activation-range.wake-up-inactive.flying-monsters-max-per-tick': () => 4,
      'world-settings.default.entity-activation-range.wake-up-inactive.flying-monsters-for': () => 60,
    },
  ),
  {
    file: 'spigot.yml',
    path: 'world-settings.default.nerf-spawner-mobs',
    value: () => true,
    why: 'Mobs from a spawner get no AI. They still drop loot, they just stop pathfinding.',
    gameplay: true,
  },
  {
    file: 'spigot.yml',
    path: 'world-settings.default.merge-radius.item',
    value: (_p, d) => d.mergeItem,
    why: 'Dropped items within this radius stack into one entity instead of ticking separately.',
    gameplay: true,
  },
  {
    file: 'spigot.yml',
    path: 'world-settings.default.merge-radius.exp',
    value: (_p, d) => d.mergeExp,
    why: 'Same for experience orbs, which is where grinders produce thousands of entities.',
    gameplay: true,
  },
  {
    file: 'spigot.yml',
    path: 'world-settings.default.ticks-per.hopper-transfer',
    value: (_p, d) => d.hopperTransfer,
    why: 'Ticks between hopper moves. Hoppers are the most expensive block entity in the game.',
    gameplay: true,
  },
  {
    file: 'spigot.yml',
    path: 'world-settings.default.ticks-per.hopper-check',
    value: (_p, d) => d.hopperCheck,
    why: 'Ticks between a hopper looking for an item above it.',
    gameplay: true,
  },
  {
    file: 'spigot.yml',
    path: 'world-settings.default.hanging-tick-frequency',
    value: () => 250,
    why: 'Item frames, paintings and leads are checked far less often. They almost never change.',
    gameplay: true,
    aggressive: true,
  },
  {
    file: 'spigot.yml',
    path: 'world-settings.default.max-tnt-per-tick',
    value: (_p, d) => d.maxTnt,
    why: 'Caps how many TNT entities may be processed per tick, so one cannon does not stall the server.',
    gameplay: true,
  },
  {
    file: 'spigot.yml',
    path: 'world-settings.default.arrow-despawn-rate',
    value: () => 300,
    why: 'Arrows on the ground disappear after 15 seconds instead of a minute.',
    gameplay: true,
    aggressive: true,
  },

  {
    file: 'paper-global.yml',
    path: 'misc.max-joins-per-tick',
    value: p => (p.players >= 60 ? 2 : undefined),
    why: 'Spreads the cost of players reconnecting after a restart over more ticks.',
  },
  {
    file: 'paper-global.yml',
    path: 'proxies.velocity.enabled',
    value: p => (p.proxy === 'velocity' ? true : undefined),
    why: 'Accepts the player identity Velocity forwards. The matching secret has to be filled in by hand.',
  },
  {
    file: 'paper-global.yml',
    path: 'proxies.velocity.online-mode',
    value: p => (p.proxy === 'velocity' ? true : undefined),
    why: 'Keeps online-mode UUIDs on a Velocity network that authenticates with Mojang.',
  },
  {
    file: 'paper-global.yml',
    path: 'proxies.bungee-cord.online-mode',
    value: p => (p.proxy === 'bungeecord' ? !p.offlineMode : undefined),
    why: 'Decides which UUID shape the backend trusts from BungeeCord.',
  },
  ...block(
    {
      file: 'paper-global.yml',
      why: 'Exploits an anarchy server is expected to keep. They are off by default because they are not vanilla behaviour.',
      gameplay: true,
    },
    {
      'unsupported-settings.allow-headless-pistons': p => (p.type === 'anarchy' ? true : undefined),
      'unsupported-settings.allow-permanent-block-break-exploits': p => (p.type === 'anarchy' ? true : undefined),
      'unsupported-settings.allow-piston-duplication': p => (p.type === 'anarchy' ? true : undefined),
    },
  ),
  ...block(
    {
      file: 'paper-global.yml',
      why: 'Book and item limits. The defaults allow payloads large enough to lock up clients and the server that relays them.',
    },
    {
      'item-validation.book.author': p => (p.harden ? 4096 : undefined),
      'item-validation.book.page': p => (p.harden ? 8192 : undefined),
      'item-validation.book.title': p => (p.harden ? 4096 : undefined),
      'item-validation.book-size.page-max': p => (p.harden ? 2048 : undefined),
      'item-validation.book-size.total-multiplier': p => (p.harden ? 0.92 : undefined),
      'item-validation.display-name': p => (p.harden ? 2048 : undefined),
      'item-validation.lore-line': p => (p.harden ? 4096 : undefined),
      'item-validation.resolve-selectors-in-books': p => (p.harden ? false : undefined),
    },
  ),
  ...block(
    {
      file: 'paper-global.yml',
      why: 'Global packet ceiling. Anything above this rate is a client that is not playing the game.',
    },
    {
      'packet-limiter.all-packets.action': p => (p.harden ? 'KICK' : undefined),
      'packet-limiter.all-packets.interval': p => (p.harden ? 6.0 : undefined),
      'packet-limiter.all-packets.max-packet-rate': p => (p.harden ? 500.0 : undefined),
    },
  ),
  ...packetLimiterRules(),

  {
    file: 'paper-world-defaults.yml',
    path: 'chunks.prevent-moving-into-unloaded-chunks',
    value: () => true,
    why: 'Stops a player from walking into an unloaded chunk and forcing a synchronous load on the main thread.',
  },
  {
    file: 'paper-world-defaults.yml',
    path: 'chunks.max-auto-save-chunks-per-tick',
    value: (_p, d) => d.autoSaveChunks,
    why: 'Chunks written per tick during autosave. Too low and the leftovers all land in one tick as a freeze.',
  },
  ...fixed(
    {
      file: 'paper-world-defaults.yml',
      why: 'Caps how many of this entity type are written into one chunk. Without it an arrow farm can produce a chunk the server cannot load again.',
    },
    'chunks.entity-per-chunk-save-limit',
    SAVE_LIMITS,
  ),
  {
    file: 'paper-world-defaults.yml',
    path: 'collisions.max-entity-collisions',
    value: () => 2,
    why: 'How many pushes one entity processes per tick. Cramming a thousand mobs in a block stops being a server-wide cost.',
    gameplay: true,
  },
  {
    file: 'paper-world-defaults.yml',
    path: 'collisions.fix-climbing-bypassing-cramming-rule',
    value: () => true,
    why: 'Climbing mobs stop being exempt from cramming, which is how a one-block spider farm holds unlimited entities.',
    gameplay: true,
  },
  {
    file: 'paper-world-defaults.yml',
    path: 'entities.armor-stands.tick',
    value: p => (p.customEntities ? undefined : false),
    why: 'Armour stands stop being pushed by water and stop falling. Left alone when a plugin animates them.',
    gameplay: true,
  },
  {
    file: 'paper-world-defaults.yml',
    path: 'entities.armor-stands.do-collision-entity-lookups',
    value: p => (p.customEntities ? undefined : false),
    why: 'Armour stands stop scanning for entities to collide with.',
    gameplay: true,
  },
  {
    file: 'paper-world-defaults.yml',
    path: 'entities.markers.tick',
    value: p => (p.customEntities ? undefined : false),
    why: 'Marker entities hold data and never move; ticking them is pure overhead.',
  },
  {
    file: 'paper-world-defaults.yml',
    path: 'entities.behavior.disable-chest-cat-detection',
    value: () => true,
    why: 'Chests stop scanning for a cat sitting on top before they open.',
    gameplay: true,
  },
  {
    file: 'paper-world-defaults.yml',
    path: 'entities.behavior.parrots-are-unaffected-by-player-movement',
    value: () => true,
    why: 'Parrots stay on the shoulder instead of falling off on every jump.',
    gameplay: true,
  },
  {
    file: 'paper-world-defaults.yml',
    path: 'entities.behavior.zombies-target-turtle-eggs',
    value: () => false,
    why: 'Zombies stop pathfinding to turtle eggs across the map. Breaks farms built on that behaviour.',
    gameplay: true,
    aggressive: true,
  },
  ...block(
    {
      file: 'paper-world-defaults.yml',
      why: 'Arrows fired by mobs or in creative vanish quickly, since nobody can pick them up anyway.',
    },
    {
      'entities.spawning.non-player-arrow-despawn-rate': () => 20,
      'entities.spawning.creative-arrow-despawn-rate': () => 20,
    },
  ),
  ...MOB_CATEGORIES.flatMap<Rule>(category => [
    {
      file: 'paper-world-defaults.yml',
      path: `entities.spawning.despawn-ranges.${category}.hard`,
      value: (_p, d) => d.hardDespawn,
      why: 'Past this distance the mob is deleted at once. Sized as (simulation-distance × 16) + 8 so mobs do not pop out inside loaded chunks.',
      gameplay: true,
    },
    {
      file: 'paper-world-defaults.yml',
      path: `entities.spawning.despawn-ranges.${category}.soft`,
      value: (_p, d) => d.softDespawn,
      why: 'Between the soft and hard range a mob has a chance to despawn each tick.',
      gameplay: true,
    },
  ]),
  {
    file: 'paper-world-defaults.yml',
    path: 'entities.spawning.alt-item-despawn-rate.enabled',
    value: () => true,
    why: 'Turns on per-item despawn times, which replaces every ground-item clearing plugin.',
    gameplay: true,
    aggressive: true,
  },
  ...fixed(
    {
      file: 'paper-world-defaults.yml',
      why: 'Bulk blocks players dig and throw away despawn in 15 seconds instead of five minutes.',
      gameplay: true,
      aggressive: true,
    },
    'entities.spawning.alt-item-despawn-rate.items',
    FAST_DESPAWN,
  ),
  {
    file: 'paper-world-defaults.yml',
    path: 'environment.optimize-explosions',
    value: () => true,
    why: 'A faster explosion algorithm. Damage numbers move by a fraction nobody notices.',
  },
  {
    file: 'paper-world-defaults.yml',
    path: 'environment.treasure-maps.enabled',
    value: p => (p.pregenerated ? undefined : false),
    why: 'Generating a treasure map searches for a structure, and in ungenerated terrain that search hangs the server.',
    gameplay: true,
  },
  ...block(
    {
      file: 'paper-world-defaults.yml',
      why: 'Lets a new map point at a structure that was already found, instead of searching ungenerated chunks for a fresh one.',
    },
    {
      'environment.treasure-maps.find-already-discovered.loot-tables': () => true,
      'environment.treasure-maps.find-already-discovered.villager-trade': () => true,
    },
  ),
  {
    file: 'paper-world-defaults.yml',
    path: 'environment.nether-ceiling-void-damage-height',
    value: p => (p.type === 'survival' || p.type === 'minigames' ? 127 : undefined),
    why: 'Damages players above the nether roof, which stops the highway-on-the-roof chunk loading pattern.',
    gameplay: true,
    aggressive: true,
  },
  ...block(
    {
      file: 'paper-world-defaults.yml',
      why: 'Ceiling on block and fluid updates per tick, so one water flood cannot take the server down with it.',
      gameplay: true,
      aggressive: true,
    },
    {
      'environment.max-block-ticks': () => 40960,
      'environment.max-fluid-ticks': () => 40960,
    },
  ),
  {
    file: 'paper-world-defaults.yml',
    path: 'fixes.fix-items-merging-through-walls',
    value: () => true,
    why: 'Items stop merging through a block, which is both a duplication vector and a source of items teleporting.',
    gameplay: true,
  },
  {
    file: 'paper-world-defaults.yml',
    path: 'hopper.ignore-occluding-blocks',
    value: () => true,
    why: 'Hoppers stop looking for containers buried inside full blocks.',
    gameplay: true,
  },
  {
    file: 'paper-world-defaults.yml',
    path: 'hopper.disable-move-event',
    value: () => true,
    why: 'Skips InventoryMoveItemEvent entirely. Only safe when no plugin listens to it, and most protection plugins do.',
    gameplay: true,
    aggressive: true,
  },
  ...block(
    {
      file: 'paper-world-defaults.yml',
      why: 'Fewer map markers, updated less often. Item-frame maps are a surprisingly large packet cost.',
      gameplay: true,
    },
    {
      'maps.item-frame-cursor-limit': () => 32,
      'maps.item-frame-cursor-update-interval': () => 20,
    },
  ),
  {
    file: 'paper-world-defaults.yml',
    path: 'misc.redstone-implementation',
    value: p => (p.type === 'technical' ? 'VANILLA' : 'ALTERNATE_CURRENT'),
    why: 'Alternate Current removes the redundant block updates vanilla redstone does. A technical server keeps the vanilla algorithm.',
    gameplay: true,
  },
  {
    file: 'paper-world-defaults.yml',
    path: 'misc.update-pathfinding-on-block-update',
    value: () => false,
    why: 'Mobs recalculate their path on a timer instead of on every block change around them.',
    gameplay: true,
  },
  {
    file: 'paper-world-defaults.yml',
    path: 'misc.disable-relative-projectile-velocity',
    value: () => true,
    why: 'Projectiles stop inheriting the shooter movement, which is also the fix for arrows behaving differently while sprinting.',
    gameplay: true,
    aggressive: true,
  },
  ...block(
    {
      file: 'paper-world-defaults.yml',
      why: 'Ticks between attempts. These are background world processes nobody watches in real time.',
      gameplay: true,
    },
    {
      'tick-rates.grass-spread': () => 4,
      'tick-rates.mob-spawner': () => 2,
    },
  ),
  ...block(
    {
      file: 'paper-world-defaults.yml',
      why: 'Farmland drying and wetting checked half as often.',
      gameplay: true,
      aggressive: true,
    },
    {
      'tick-rates.dry-farmland': () => 2,
      'tick-rates.wet-farmland': () => 2,
    },
  ),
  ...block(
    {
      file: 'paper-world-defaults.yml',
      why: 'Villager brain rates. Acquiring a workstation is the heaviest thing a villager does, so it runs every six seconds instead of every tick.',
      gameplay: true,
    },
    {
      // Skipped when DAB is on: doing both makes villagers visibly stupid up close.
      'tick-rates.behavior.villager.validatenearbypoi': (_p, d) => (d.dab ? undefined : 60),
      'tick-rates.behavior.villager.acquirepoi': (_p, d) => (d.dab ? undefined : 120),
      'tick-rates.sensor.villager.secondarypoisensor': (_p, d) => (d.dab ? undefined : 80),
      'tick-rates.sensor.villager.nearestbedsensor': (_p, d) => (d.dab ? undefined : 80),
      'tick-rates.sensor.villager.villagerbabiessensor': (_p, d) => (d.dab ? undefined : 40),
      'tick-rates.sensor.villager.playersensor': (_p, d) => (d.dab ? undefined : 40),
      'tick-rates.sensor.villager.nearestlivingentitysensor': (_p, d) => (d.dab ? undefined : 40),
    },
  ),
  {
    file: 'paper-world-defaults.yml',
    path: 'anticheat.anti-xray.enabled',
    value: p => (p.type === 'survival' || p.type === 'anarchy' ? true : undefined),
    why: 'Costs a little CPU but far less than any anti-xray plugin, and it is the only one that works on the chunk packet itself.',
  },

  {
    file: 'purpur.yml',
    path: 'settings.use-alternate-keepalive',
    value: () => true,
    why: 'Players on a bad connection stop being kicked for one dropped keepalive. Known to conflict with TCPShield.',
    since: 'purpur',
  },
  {
    file: 'purpur.yml',
    path: 'settings.lagging-threshold',
    value: () => 17.0,
    why: 'The TPS below which Purpur starts applying its own lag measures.',
    since: 'purpur',
  },
  ...block(
    {
      file: 'purpur.yml',
      why: 'Console noise from plugins and datapacks that nobody acts on.',
      since: 'purpur',
    },
    {
      'settings.logger.suppress-init-legacy-material-errors': () => true,
      'settings.logger.suppress-ignored-advancement-warnings': () => true,
      'settings.logger.suppress-unrecognized-recipe-errors': () => true,
      'settings.logger.suppress-setblock-in-far-chunk-errors': () => true,
      'settings.logger.suppress-library-loader': () => true,
    },
  ),
  {
    file: 'purpur.yml',
    path: 'world-settings.default.mobs.dolphin.disable-treasure-searching',
    value: () => true,
    why: 'Dolphins stop running a structure search, which is the same expensive lookup treasure maps do.',
    gameplay: true,
    since: 'purpur',
  },
  {
    file: 'purpur.yml',
    path: 'world-settings.default.mobs.villager.lobotomize.enabled',
    value: p => (p.players >= 30 ? true : undefined),
    why: 'A villager that cannot path anywhere loses its AI and only restocks. Turn it on only when villagers are actually the problem.',
    gameplay: true,
    since: 'purpur',
  },
  ...block(
    {
      file: 'purpur.yml',
      why: 'How far a villager looks for a workstation or a bed. The vanilla 48 blocks is a large scan run over and over.',
      gameplay: true,
      since: 'purpur',
    },
    {
      'world-settings.default.mobs.villager.search-radius.acquire-poi': () => 16,
      'world-settings.default.mobs.villager.search-radius.nearest-bed-sensor': () => 16,
    },
  ),
  {
    file: 'purpur.yml',
    path: 'world-settings.default.mobs.zombie.aggressive-towards-villager-when-lagging',
    value: () => false,
    why: 'While the server is below the lagging threshold, zombies stop hunting villagers, which is the most expensive pathfinding in the game.',
    gameplay: true,
    since: 'purpur',
  },
  {
    file: 'purpur.yml',
    path: 'world-settings.default.mobs.squid.immune-to-EAR',
    value: () => false,
    why: 'Makes squid obey the entity activation range like everything else.',
    gameplay: true,
    since: 'purpur',
  },
  {
    file: 'purpur.yml',
    path: 'world-settings.default.gameplay-mechanics.entities-can-use-portals',
    value: p => (p.type === 'technical' ? undefined : false),
    why: 'Entities stop travelling through portals, which is how players build chunk loaders out of minecarts.',
    gameplay: true,
    aggressive: true,
    since: 'purpur',
  },
  {
    file: 'purpur.yml',
    path: 'world-settings.default.gameplay-mechanics.player.teleport-if-outside-border',
    value: p => (p.type === 'anarchy' ? undefined : true),
    why: 'The vanilla world border is bypassable; this puts anyone who gets past it back at spawn.',
    gameplay: true,
    since: 'purpur',
  },
  ...block(
    {
      file: 'purpur.yml',
      why: 'Armour stands stop moving on their own, which is how the classic lag machine is built. Left alone when a plugin animates them.',
      gameplay: true,
      aggressive: true,
      since: 'purpur',
    },
    {
      'world-settings.default.gameplay-mechanics.armorstand.can-movement-tick': p =>
        p.customEntities ? undefined : false,
      'world-settings.default.gameplay-mechanics.armorstand.can-move-in-water': p =>
        p.customEntities ? undefined : false,
      'world-settings.default.gameplay-mechanics.armorstand.can-move-in-water-over-fence': p =>
        p.customEntities ? undefined : false,
    },
  ),
  {
    file: 'purpur.yml',
    path: 'world-settings.default.blocks.observer.disable-clock',
    value: p => (p.type === 'technical' || p.type === 'anarchy' ? undefined : true),
    why: 'Two observers facing each other stop producing an endless redstone signal.',
    gameplay: true,
    aggressive: true,
    since: 'purpur',
  },

  {
    file: 'divinemc.yml',
    path: 'region-settings.thread-count',
    value: (_p, d) => d.ioThreads,
    why: 'Threads reading and writing region files.',
    since: 'divinemc',
  },
  {
    file: 'divinemc.yml',
    path: 'async.pathfinding.max-threads',
    value: (_p, d) => d.pathfindingThreads,
    why: 'Workers running pathfinding off the main thread. 0 would mean a quarter of the cores; this pins it so the number is visible.',
    since: 'divinemc',
  },
  {
    file: 'divinemc.yml',
    path: 'async.parallel-sensors.enable',
    value: p => (p.cores >= 4 ? true : undefined),
    why: 'Runs the read-only half of mob AI, meaning entity scans and line-of-sight checks, on a thread pool.',
    since: 'divinemc',
  },
  {
    file: 'divinemc.yml',
    path: 'async.chunk-sending.enable',
    value: p => (p.players >= 20 ? true : undefined),
    why: 'Chunks are serialised and sent off the main thread, which is what a join storm actually costs.',
    since: 'divinemc',
  },
  {
    file: 'divinemc.yml',
    path: 'async.chunk-sending.max-threads',
    value: (p, d) => (p.players >= 20 ? d.pathfindingThreads : undefined),
    why: 'Workers used for that serialisation, sized against the host rather than left at the implicit quarter of the cores.',
    since: 'divinemc',
  },
  ...block(
    {
      file: 'divinemc.yml',
      why: 'Ticks every world on its own thread. Worth it only with several populated worlds, and it needs plugins that are thread-safe.',
      since: 'divinemc',
    },
    {
      'async.parallel-world-ticking.enable': (_p, d) => (d.parallelTicking ? true : undefined),
      // A semaphore, not a pool: every world owns a thread, this caps how many tick at once.
      'async.parallel-world-ticking.thread-count': (_p, d) => (d.parallelTicking ? d.parallelThreads : undefined),
    },
  ),
  ...block(
    {
      file: 'divinemc.yml',
      why: 'Splits a world into regions ticked in parallel, the way Folia does. The least conservative option DivineMC has.',
      since: 'divinemc',
    },
    {
      'async.regionized-chunk-ticking.enable': (_p, d) => (d.regionized ? true : undefined),
      'async.regionized-chunk-ticking.executor-thread-count': (_p, d) => (d.regionized ? d.regionThreads : undefined),
    },
  ),
  ...block(
    {
      file: 'divinemc.yml',
      why: 'Distant mobs think less often the further they are from a player, instead of a hard on/off at one distance.',
      gameplay: true,
      since: 'divinemc',
    },
    {
      'performance.dab.enabled': (_p, d) => (d.dab ? true : undefined),
      'performance.dab.start-distance': (_p, d) => (d.dab ? d.dabStart : undefined),
      'performance.dab.activation-distance-mod': (_p, d) => (d.dab ? d.dabMod : undefined),
    },
  ),
  {
    file: 'divinemc.yml',
    path: 'performance.optimizations.clump-orbs',
    value: () => true,
    why: 'Experience orbs merge into one entity that carries the total.',
    gameplay: true,
    since: 'divinemc',
  },
  ...block(
    {
      file: 'divinemc.yml',
      why: 'Cheaper internal representations. Nothing about the game changes.',
      since: 'divinemc',
    },
    {
      'performance.optimizations.use-compact-bit-storage': () => true,
      'performance.optimizations.equipment-tracking': () => true,
      'performance.optimizations.optimized-dragon-respawn': () => true,
    },
  ),
  {
    file: 'divinemc.yml',
    path: 'performance.optimizations.sleeping-block-entity',
    value: () => true,
    why: 'Block entities with nothing to do stop ticking until something wakes them. Changes hopper and furnace timing.',
    gameplay: true,
    since: 'divinemc',
  },
  ...block(
    {
      file: 'divinemc.yml',
      why: 'A hopper pointing into a full container stops retrying for a while.',
      gameplay: true,
      aggressive: true,
      since: 'divinemc',
    },
    {
      'performance.optimizations.hopper-throttle-when-full.enabled': () => true,
      'performance.optimizations.hopper-throttle-when-full.skip-ticks': () => 20,
    },
  ),
  ...block(
    {
      file: 'divinemc.yml',
      why: 'The two non-vanilla behaviours DivineMC enables by default. A technical server needs both off to get vanilla timings.',
      since: 'divinemc',
    },
    {
      'performance.optimizations.enable-suffocation-optimization': p => (p.type === 'technical' ? false : undefined),
      'misc.lag-compensation.enabled': p => (p.type === 'technical' ? false : undefined),
    },
  ),
  ...block(
    {
      file: 'divinemc.yml',
      why: 'Chunk data caches, in entries. Larger caches trade heap for fewer re-reads on a server with many chunks in play.',
      since: 'divinemc',
    },
    {
      'performance.chunks.chunk-data-cache-soft-limit': (_p, d) => d.chunkCacheSoft,
      'performance.chunks.chunk-data-cache-limit': (_p, d) => d.chunkCacheHard,
    },
  ),
  {
    file: 'divinemc.yml',
    path: 'network.raytrace-entity-culling.enabled',
    value: p => (p.players >= 30 && p.type !== 'technical' ? true : undefined),
    why: 'Entities a player provably cannot see are not sent at all. Saves bandwidth and blinds entity ESP.',
    gameplay: true,
    since: 'divinemc',
  },
  ...block(
    {
      file: 'divinemc.yml',
      why: 'What an anarchy server wants from DivineMC: an unbreakable seed and the old duplication behaviour.',
      gameplay: true,
      since: 'divinemc',
    },
    {
      'misc.secure-seed.enable': p => (p.type === 'anarchy' ? true : undefined),
      'world-settings.default.unsupported-features.allow-tripwire-dupe': p => (p.type === 'anarchy' ? true : undefined),
      'misc.old-features.copper-bulb-1gt': p => (p.type === 'anarchy' ? true : undefined),
      'misc.old-features.crafter-1gt': p => (p.type === 'anarchy' ? true : undefined),
    },
  ),
  {
    file: 'divinemc.yml',
    path: 'network.no-chat-reports.enabled',
    value: p => (p.offlineMode ? true : undefined),
    why: 'Tells clients the server does not carry signed chat, which is what an offline-mode server wants anyway.',
    since: 'divinemc',
  },
  {
    file: 'divinemc.yml',
    path: 'network.general.disable-disconnect-spam',
    value: p => (p.type === 'anarchy' ? true : undefined),
    why: 'Stops the console filling with disconnect stack traces when people are deliberately abusing the connection.',
    since: 'divinemc',
  },
];
