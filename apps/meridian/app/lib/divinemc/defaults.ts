/** The stock `divinemc.yml`, as shipped. Single source for the reference table in the
 *  docs and for the config builder — a second copy would drift within one release. */
export const DIVINEMC_DEFAULTS = {
  'world-settings': {
    default: {
      features: {
        'spectator-dont-get-advancement': false,
      },
      'unsupported-features': {
        'allow-entity-portal-with-passenger': true,
        'allow-tripwire-dupe': false,
      },
      'gameplay-mechanics': {
        'reduce-projectile-chunk-loading': {
          'per-tick': 10,
          'per-projectile': {
            max: 10,
            'reset-movement-after-reach-limit': false,
            'remove-from-world-after-reach-limit': false,
          },
        },
        projectiles: {
          snowball: { knockback: true, 'disable-saving': false },
          egg: { knockback: true },
          firework: { 'disable-saving': false },
        },
      },
    },
  },
  version: 9,
  'region-settings': {
    type: 'MCA',
    'thread-count': 4,
    'compression-level': 4,
    linear: {
      'io-flush-delay-ms': 10000,
      implementation: 'V2',
    },
    'b-linear': {
      'check-interval-ms': 20,
      'flush-of-write-timeout-ms': 3000,
    },
  },
  network: {
    general: {
      'optimize-non-flush-packet-sending': false,
      'disable-disconnect-spam': false,
      'dont-respond-ping-before-start': true,
      'send-spectator-change-packet': true,
    },
    'player-profile-result-caching': { enabled: false, timeout: 1440 },
    'no-chat-reports': {
      enabled: false,
      'add-query-data': true,
      'convert-to-game-message': true,
      'debug-log': false,
      'demand-on-client': false,
      'disconnect-demand-on-client-message':
        'You do not have No Chat Reports, and this server is configured to require it on client!',
    },
    protocols: {
      appleskin: { 'appleskin-enable': false, 'sync-tick-interval': 20 },
      jade: { 'jade-enable': false },
      xaeromap: { 'xaeromap-enable': false, 'xaero-map-server-id': 1269608353 },
      syncmatica: { 'syncmatica-enable': false, quota: false, 'quota-limit': 40000000 },
    },
    'raytrace-entity-culling': {
      enabled: false,
      threads: 0,
      'check-interval-ms': 50,
      'max-trace-distance': 64,
      'force-visible-radius': 4.0,
      'visibility-timeout-ms': 1000,
      'aabb-expansion': 0.5,
      'bounding-box-limit': 20,
      'cull-players': true,
      'skip-marker-armor-stands': true,
      'skipped-entity-types': [],
    },
  },
  misc: {
    'secure-seed': { enable: false, 'hashing-version': 'BLAKE2B' },
    'lag-compensation': {
      enabled: true,
      'block-entity-acceleration': false,
      'block-breaking-acceleration': true,
      'eating-acceleration': true,
      'potion-effect-acceleration': true,
      'fluid-acceleration': true,
      'pickup-acceleration': true,
      'portal-acceleration': true,
      'random-tick-speed-acceleration': true,
    },
    sentry: { dsn: '', 'log-level': 'WARN', 'only-log-thrown': true },
    'old-features': { 'copper-bulb-1gt': false, 'crafter-1gt': false },
  },
  fixes: {
    gameplay: {
      'fix-incorrect-bounce-logic': false,
      'update-suppression-crash-fix': true,
      'ignore-moved-too-quickly-when-lagging': true,
      'always-allow-weird-movement': true,
    },
    misc: { 'force-minecraft-command': false, 'disable-leaf-decay': false },
    bug: {
      'fix-mc-258859': false,
      'fix-mc-200418': false,
      'fix-mc-2025': false,
      'fix-mc-94054': false,
      'fix-mc-183990': false,
      'fix-mc-118740': false,
      'fix-mc-28289': false,
    },
  },
  performance: {
    chunks: {
      'native-acceleration': {
        enabled: false,
        'allow-avx512': false,
        'isa-target-level-override': -1,
      },
      'chunk-data-cache-soft-limit': 8192,
      'chunk-data-cache-limit': 32678,
      'max-view-distance': 32,
      'player-near-chunk-detection-range': 128,
      'chunk-worker-algorithm': 'MOONRISE',
      'end-biome-cache-enabled': false,
      'end-biome-cache-capacity': 1024,
      'smooth-bedrock-layer': false,
      experimental: {
        'enable-density-function-compiler': false,
        'enable-structure-layout-optimizer': true,
        'deduplicate-shuffled-template-pool-element-list': false,
      },
    },
    optimizations: {
      'disable-method-profiler': true,
      'skip-useless-secondary-poi-sensor': true,
      'clump-orbs': false,
      'enable-suffocation-optimization': true,
      'use-compact-bit-storage': false,
      'command-block-parse-results-caching': true,
      'sheep-optimization': true,
      'optimized-dragon-respawn': false,
      'reduce-chunk-load-and-lookup': true,
      'create-snapshot-on-retrieving-block-state': true,
      'sleeping-block-entity': false,
      'equipment-tracking': false,
      'hopper-throttle-when-full': { enabled: false, 'skip-ticks': 0 },
    },
    dab: {
      enabled: false,
      'start-distance': 12,
      'maximum-activation-frequency': 20,
      'activation-distance-mod': 8,
      'dont-enable-if-in-water': false,
      'blacked-entities': ['villager', 'axolotl', 'hoglin', 'zombified_piglin', 'goat'],
    },
    'virtual-threads': {
      enabled: true,
      'bukkit-scheduler': true,
      'chat-scheduler': true,
      'tab-complete-scheduler': true,
      'async-executor': true,
      'command-builder-scheduler': true,
      'server-text-filter-pool': true,
    },
  },
  async: {
    'auto-thread-allocation': false,
    'parallel-world-ticking': {
      enable: false,
      'thread-count': 4,
      'log-container-creation-stacktraces': false,
      'disable-hard-throw': false,
      'use-per-world-tps-bar': true,
      'show-tps-of-server-instead-of-world': true,
    },
    'regionized-chunk-ticking': {
      enable: false,
      'executor-thread-count': 4,
      'executor-thread-priority': 7,
    },
    pathfinding: {
      enable: true,
      'max-threads': 1,
      keepalive: 60,
      'queue-size': 0,
      'reject-policy': 'CALLER_RUNS',
    },
    'parallel-entity-tracker': {
      enable: true,
      threads: 0,
      keepalive: 60,
    },
    'chunk-sending': { enable: false, 'max-threads': 1 },
    'mob-spawning': { enable: true, 'async-natural-spawn': true },
    'portal-search-prefetch': { enable: true },
    'parallel-sensors': { enable: false, 'max-threads': 0 },
  },
};

/** `version:` in the file above. A pasted config newer than this is flagged, not parsed
 *  against the wrong defaults. */
export const CONFIG_VERSION = 9;

export type { ConfigTree, ConfigValue } from '../serverconfig/tree';
