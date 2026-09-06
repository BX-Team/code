import type { Software } from './files';

export type ServerType = 'survival' | 'anarchy' | 'minigames' | 'creative' | 'technical';

/** How much observable behaviour the profile is willing to trade for tick time. */
export type Intensity = 'safe' | 'balanced' | 'aggressive';

export type ProxyKind = 'none' | 'velocity' | 'bungeecord';

export interface Profile {
  software: Software;
  type: ServerType;
  /** Concurrent players at peak, not the registered total. */
  players: number;
  /** Populated worlds. Parallel world ticking only pays for itself past the first one. */
  worlds: 'one' | 'few' | 'many';
  /** Cores the server may actually use. Every thread count is derived from it. */
  cores: number;
  intensity: Intensity;
  proxy: ProxyKind;
  /** Cracked server: chat signing and secure profiles have to come off. */
  offlineMode: boolean;
  /** An anti-cheat plugin is installed, so the vanilla flight check is in the way. */
  antiCheat: boolean;
  /** ItemsAdder, ModelEngine and Oraxen keep armour stands and markers alive. */
  customEntities: boolean;
  /** Pregenerated and fenced by a vanilla world border. */
  pregenerated: boolean;
  /** Add the packet and item limits that stop the common crash exploits. */
  harden: boolean;
}

export const DEFAULT_PROFILE: Profile = {
  software: 'divinemc',
  type: 'survival',
  players: 40,
  worlds: 'few',
  cores: 8,
  intensity: 'balanced',
  proxy: 'none',
  offlineMode: false,
  antiCheat: false,
  customEntities: false,
  pregenerated: false,
  harden: true,
};

export const SERVER_TYPES: { id: ServerType; name: string; blurb: string }[] = [
  {
    id: 'survival',
    name: 'Survival / SMP',
    blurb: 'Players build, farms matter, mobs are part of the game. Entity ranges do most of the work.',
  },
  {
    id: 'anarchy',
    name: 'Anarchy',
    blurb: 'No rules, lag machines are the point. Exploits stay on, crash surfaces get closed instead.',
  },
  {
    id: 'minigames',
    name: 'Minigames / PvP',
    blurb: 'Many players, small maps, few mobs. Distances and spawn limits go down hard.',
  },
  { id: 'creative', name: 'Creative / plots', blurb: 'Flat worlds, no mobs worth ticking, lots of block edits.' },
  {
    id: 'technical',
    name: 'Technical / redstone',
    blurb: 'Contraptions must behave exactly as in vanilla. Only changes players cannot observe.',
  },
];

export const INTENSITIES: { id: Intensity; name: string; blurb: string }[] = [
  { id: 'safe', name: 'Safe', blurb: 'Only changes nobody can observe in-game.' },
  { id: 'balanced', name: 'Balanced', blurb: 'The usual trade: mobs think a little less far away.' },
  { id: 'aggressive', name: 'Aggressive', blurb: 'Everything, including settings that break farms and plugins.' },
];

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, Math.round(value)));

interface TypeBase {
  simulation: number;
  view: number;
  monsters: number;
  animals: number;
  water: number;
  ambient: number;
  maxTnt: number;
}

const TYPE_BASE: Record<ServerType, TypeBase> = {
  survival: { simulation: 5, view: 8, monsters: 20, animals: 5, water: 2, ambient: 1, maxTnt: 60 },
  anarchy: { simulation: 5, view: 8, monsters: 20, animals: 5, water: 2, ambient: 1, maxTnt: 100 },
  minigames: { simulation: 4, view: 6, monsters: 4, animals: 2, water: 1, ambient: 1, maxTnt: 30 },
  creative: { simulation: 3, view: 8, monsters: 5, animals: 2, water: 1, ambient: 1, maxTnt: 60 },
  technical: { simulation: 8, view: 10, monsters: 40, animals: 10, water: 3, ambient: 2, maxTnt: 100 },
};

const ACTIVATION: Record<Intensity, Record<string, number>> = {
  safe: { animals: 24, monsters: 32, raiders: 48, misc: 12, water: 12, villagers: 24, 'flying-monsters': 48 },
  balanced: { animals: 16, monsters: 24, raiders: 48, misc: 8, water: 8, villagers: 16, 'flying-monsters': 48 },
  aggressive: { animals: 12, monsters: 20, raiders: 32, misc: 6, water: 6, villagers: 12, 'flying-monsters': 32 },
};

export interface Derived {
  simulation: number;
  view: number;
  /** Blocks. Past this a mob is deleted at once. */
  hardDespawn: number;
  softDespawn: number;
  mobSpawnRange: number;
  spawnLimits: Record<string, number>;
  spawnTicks: Record<string, number>;
  activation: Record<string, number>;
  tracking: Record<string, number>;
  nettyThreads: number;
  autoSaveChunks: number;
  hopperTransfer: number;
  hopperCheck: number;
  mergeItem: number;
  mergeExp: number;
  maxTnt: number;
  entityBroadcast: number;
  /** DivineMC only. */
  dab: boolean;
  dabStart: number;
  dabMod: number;
  parallelTicking: boolean;
  regionized: boolean;
  parallelThreads: number;
  chunkCacheSoft: number;
  chunkCacheHard: number;
  regionThreads: number;
  ioThreads: number;
  pathfindingThreads: number;
  /** True when the profile refuses anything a player could notice. */
  vanillaOnly: boolean;
}

export function derive(profile: Profile): Derived {
  const base = TYPE_BASE[profile.type];
  const { intensity, cores, players } = profile;
  const step = intensity === 'safe' ? 1 : intensity === 'aggressive' ? -1 : 0;

  let simulation = base.simulation + step;
  let view = base.view + step * 2;
  if (players > 80) {
    simulation -= 1;
    view -= 1;
  }
  if (cores <= 2) {
    simulation -= 1;
    view -= 2;
  }
  simulation = clamp(simulation, 3, 12);
  view = clamp(Math.max(view, simulation + 1), 4, 16);

  const scale = intensity === 'safe' ? 1.6 : intensity === 'aggressive' ? 0.7 : 1;
  const limit = (value: number) => clamp(Math.max(1, value * scale), 1, 200);

  const activation = ACTIVATION[intensity] as Record<string, number>;
  const trackingFloor = Math.max(activation.monsters as number, activation.animals as number);

  const vanillaOnly = intensity === 'safe' || profile.type === 'technical';
  const dab = profile.software === 'divinemc' && !vanillaOnly && profile.type !== 'anarchy';

  const parallelTicking =
    profile.software === 'divinemc' && profile.worlds !== 'one' && cores >= 6 && profile.type !== 'technical';
  const regionized = profile.software === 'divinemc' && cores >= 6 && profile.type !== 'technical';
  // Sized apart the two pools each look reasonable and together take every core.
  const workerBudget = Math.max(2, Math.floor(cores / 2)) / (parallelTicking && regionized ? 2 : 1);

  return {
    simulation,
    view,
    // (simulation-distance * 16) + 8, so a mob survives the chunks that are still loaded.
    hardDespawn: simulation * 16 + 8,
    softDespawn: 30,
    mobSpawnRange: clamp(Math.min(intensity === 'aggressive' ? 3 : 4, simulation), 1, 8),
    spawnLimits: {
      monsters: limit(base.monsters),
      animals: limit(base.animals),
      'water-animals': limit(base.water),
      'water-ambient': limit(base.water),
      'water-underground-creature': limit(base.water + 1),
      axolotls: limit(base.water + 1),
      ambient: limit(base.ambient),
    },
    spawnTicks: {
      'monster-spawns': intensity === 'aggressive' ? 15 : 10,
      'animal-spawns': 400,
      'water-spawns': 400,
      'water-ambient-spawns': 400,
      'water-underground-creature-spawns': 400,
      'axolotl-spawns': 400,
      'ambient-spawns': 400,
    },
    activation,
    tracking: {
      players: 48,
      animals: Math.max(48, trackingFloor),
      monsters: Math.max(48, trackingFloor),
      misc: 32,
      other: 64,
    },
    // Netty wants roughly a quarter of the cores; the main tick needs the rest.
    nettyThreads: clamp(cores / 4, 1, 8),
    autoSaveChunks: clamp(Math.max(24, players / 2), 24, 64),
    hopperTransfer: intensity === 'aggressive' ? 20 : 8,
    hopperCheck: intensity === 'aggressive' ? 10 : 8,
    mergeItem: intensity === 'aggressive' ? 4 : 3.5,
    mergeExp: intensity === 'aggressive' ? 8 : 4,
    maxTnt: base.maxTnt,
    entityBroadcast: intensity === 'aggressive' ? 75 : 100,
    dab,
    dabStart: players > 100 ? 8 : 12,
    dabMod: players > 100 ? 7 : 8,
    parallelTicking,
    regionized,
    parallelThreads: clamp(workerBudget, 2, 8),
    chunkCacheSoft: cores <= 4 ? 4096 : players > 60 ? 16384 : 8192,
    chunkCacheHard: cores <= 4 ? 16384 : players > 60 ? 65536 : 32678,
    regionThreads: clamp(workerBudget, 1, 12),
    ioThreads: clamp(cores / 2, 1, 8),
    pathfindingThreads: clamp(cores / 4, 1, 4),
    vanillaOnly,
  };
}
