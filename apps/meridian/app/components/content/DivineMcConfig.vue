<script setup lang="ts">
const config = {
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

const comments: Record<string, string> = {
  'world-settings.default.features.spectator-dont-get-advancement': 'Prevents spectators from getting advancements',
  'world-settings.default.unsupported-features.allow-entity-portal-with-passenger':
    'Fixes MC-67: https://bugs-legacy.mojang.com/browse/MC-67\nEntities with passengers cannot travel through portals',
  'world-settings.default.unsupported-features.allow-tripwire-dupe':
    'Bring back MC-59471, MC-129055 on 1.21.2+, which fixed in 1.21.2 snapshots 24w33a and 24w36a',
  'world-settings.default.gameplay-mechanics.reduce-projectile-chunk-loading.per-tick':
    'The maximum number of chunks that can be synchronously loaded by all projectiles in one world in a tick',
  'world-settings.default.gameplay-mechanics.reduce-projectile-chunk-loading.per-projectile.max':
    'The maximum number of chunks that can be synchronously loaded by a projectile throughout its lifetime. If a value < 0, the feature is disabled.',
  'world-settings.default.gameplay-mechanics.reduce-projectile-chunk-loading.per-projectile.reset-movement-after-reach-limit':
    'Whether to set the planar velocity of projectiles that cross the projectileMax threshold to 0, so that they stop attempting to cross chunk boundaries',
  'world-settings.default.gameplay-mechanics.reduce-projectile-chunk-loading.per-projectile.remove-from-world-after-reach-limit':
    'Whether to remove projectiles that cross the projectileMax threshold from the world entirely',
  'world-settings.default.gameplay-mechanics.projectiles.snowball.knockback':
    'Whether snowballs should knockback entities',
  'world-settings.default.gameplay-mechanics.projectiles.snowball.disable-saving':
    'Disable saving snowball entities to NBT',
  'world-settings.default.gameplay-mechanics.projectiles.egg.knockback': 'Whether eggs should knockback entities',
  'world-settings.default.gameplay-mechanics.projectiles.firework.disable-saving':
    'Disable saving firework entities to NBT',
  'region-settings.type':
    'The type of region file format to use for storing chunk data.\nValid values:\n - MCA: Default Minecraft region file format\n - LINEAR: Linear region file format V2\n - B_LINEAR: Buffered region file format (just uses Zstd)',
  'region-settings.thread-count': 'The number of threads to use for IO operations.',
  'region-settings.compression-level':
    'The compression level to use for the either linear or buffered linear region file format.',
  'region-settings.linear.io-flush-delay-ms': 'The delay in milliseconds to wait before flushing IO operations.',
  'region-settings.linear.implementation':
    'The implementation of the linear region file format to use.\nValid values:\n - V1: Basic and default linear implementation\n - V2: Introduces a grid-based compression scheme for better data management and flexibility (default)\n - V3: Minor improvements over V2',
  'region-settings.b-linear.check-interval-ms':
    'The interval in milliseconds to check for dirty region files to flush.',
  'region-settings.b-linear.flush-of-write-timeout-ms':
    'The timeout in milliseconds to wait before forcing a flush of a region file that is being written to.',
  'network.general.optimize-non-flush-packet-sending':
    "Optimizes non-flush packet sending by using Netty's lazyExecute method to avoid expensive thread wakeup calls when scheduling packet operations.\n\nNOTE: This option is NOT compatible with ProtocolLib and may cause issues with other plugins that modify packet handling!",
  'network.general.disable-disconnect-spam':
    "Prevents players being disconnected by 'disconnect.spam' when sending too many chat packets",
  'network.general.dont-respond-ping-before-start':
    'Prevents the server from responding to pings before the server is fully booted.',
  'network.general.send-spectator-change-packet':
    'When disabled, tab list will not show that the player have entered the spectator mode. Otherwise, it will act as normal spectator change packet.',
  'network.player-profile-result-caching.enabled':
    'Enables caching of player profile results on first join.\nWARNING: When enabled, a cached premium profile can allow an offline (cracked) player\nto bypass online-mode authentication by joining with the same username after the\npremium player has logged in. Disable this if you run an online-mode server without\na proxy or login plugin. Default: false is recommended for online-mode servers.',
  'network.player-profile-result-caching.timeout': 'The amount of time in minutes to cache player profile results.',
  'network.no-chat-reports.enabled': 'Enables or disables the No Chat Reports feature',
  'network.no-chat-reports.add-query-data':
    'Should server include extra query data to help clients know that your server is secure',
  'network.no-chat-reports.convert-to-game-message': 'Should the server convert all player messages to system messages',
  'network.no-chat-reports.demand-on-client': 'Should the server require No Chat Reports on the client side',
  'network.no-chat-reports.disconnect-demand-on-client-message':
    'Message to send to the client when they are disconnected for not having No Chat Reports',
  'network.protocols.appleskin.appleskin-enable': 'Enables AppleSkin protocol support',
  'network.protocols.appleskin.sync-tick-interval': 'Sync tick interval for AppleSkin protocol',
  'network.protocols.jade.jade-enable': 'Enables Jade protocol support',
  'network.protocols.xaeromap.xaeromap-enable': "Enables Xaero's Map protocol support",
  'network.protocols.xaeromap.xaero-map-server-id': "Server ID for Xaero's Map protocol",
  'network.protocols.syncmatica.syncmatica-enable': 'Enables SyncMatica protocol support',
  'network.protocols.syncmatica.quota': 'Enables quota system for SyncMatica',
  'network.protocols.syncmatica.quota-limit': 'Quota limit for SyncMatica protocol',
  'network.raytrace-entity-culling.enabled':
    "Enables Raytrace Entity Culling, a server-side port of tr7zw's EntityCulling mod.\nEntities that a player provably cannot see (fully hidden behind opaque blocks)\nare removed from that player's entity tracker. This reduces network bandwidth,\nimproves client FPS and blinds entity-ESP cheats (e.g. freecam/x-ray style hacks\ncannot see mobs, players or items through walls anymore).\n\nVisibility is checked asynchronously via raytracing; when a hidden entity comes\ninto view it is re-tracked within one check interval plus one tracker tick.\nPlayers with very high ping may notice entities appearing slightly late when\npeeking around corners.",
  'network.raytrace-entity-culling.threads':
    'The number of threads used for visibility raytracing. All players share this pool.\nSet to 0 to determine automatically based on CPU core count.',
  'network.raytrace-entity-culling.check-interval-ms':
    'The interval in milliseconds between visibility passes for each player.\nLower values make hidden entities appear faster when they come into view,\nat the cost of more raytracing work.',
  'network.raytrace-entity-culling.max-trace-distance':
    'The maximum distance in blocks at which entities are raytraced.\nEntities beyond this distance are always visible (never culled).\nNOTE: each player allocates an occlusion cache of (2*distance)^3 / 4 bytes\n(~512KB at 64), so keep this value reasonable.',
  'network.raytrace-entity-culling.force-visible-radius':
    'Entities within this radius of the player are always visible, no raytracing done.',
  'network.raytrace-entity-culling.visibility-timeout-ms':
    'Once an entity is proven visible it stays visible for at least this many\nmilliseconds before it can be culled again. Prevents track/untrack packet\nflicker for entities on the edge of visibility.',
  'network.raytrace-entity-culling.aabb-expansion':
    'How much the entity bounding box is expanded before raytracing. Larger values\nmake entities visible slightly earlier around corners (smoother but less strict).',
  'network.raytrace-entity-culling.bounding-box-limit':
    'Entities with a bounding box larger than this on any axis are never culled.',
  'network.raytrace-entity-culling.cull-players':
    'Whether player entities may be culled too. This is the main anti-ESP protection,\nbut on PvP servers with high-ping players it can give a slight disadvantage when\npeeking around corners - disable it if that matters more to you.',
  'network.raytrace-entity-culling.skip-marker-armor-stands':
    'Whether invisible armor stands (often used as plugin markers/holograms) are\nalways visible and never raytraced.',
  'network.raytrace-entity-culling.skipped-entity-types':
    'Entity types that are never culled, e.g. ["minecraft:item_frame", "minecraft:villager"].\nGlowing entities, entities with always-visible custom names, display entities and\nfishing bobbers are always skipped regardless of this list.',
  'misc.secure-seed.enable':
    'This feature is based on Secure Seed mod by Earthcomputer.\n\nTerrain and biome generation remains the same, but all the ores and structures are generated with 1024-bit seed, instead of the usual 64-bit seed.\nThis seed is almost impossible to crack, and there are no weird links between structures.',
  'misc.secure-seed.hashing-version':
    'Type of hashing algorithm to use for secure seed.\nValid values:\n - BLAKE2B: Cryptographically secure, well-tested, and reliable (default)\n - BLAKE3: Faster than BLAKE2b with better security guarantees. Requires jdk.incubator.vector module',
  'misc.lag-compensation.enabled': 'Improves the player experience when TPS is low',
  'misc.sentry.dsn':
    'The DSN for Sentry, a service that provides real-time crash reporting that helps you monitor and fix crashes in real time. Leave blank to disable. Obtain link at https://sentry.io',
  'misc.sentry.log-level': 'Logs with a level higher than or equal to this level will be recorded.',
  'misc.sentry.only-log-thrown': 'Only log Throwable exceptions to Sentry.',
  'misc.old-features.copper-bulb-1gt': 'Whether to delay the copper lamp by 1 tick when the redstone signal changes.',
  'misc.old-features.crafter-1gt': 'Whether to reduce the frequency of the crafter outputting items to 1 tick.',
  'fixes.gameplay.fix-incorrect-bounce-logic': 'Fixes incorrect bounce logic in SlimeBlock.',
  'fixes.gameplay.ignore-moved-too-quickly-when-lagging':
    "Improves general gameplay experience of the player when the server is lagging, as they won't get lagged back (message 'moved too quickly')",
  'fixes.gameplay.always-allow-weird-movement': "Means ignoring messages like 'moved too quickly' and 'moved wrongly'",
  'fixes.misc.force-minecraft-command': 'Whether to force the use of vanilla commands over plugin commands.',
  'fixes.misc.disable-leaf-decay': 'Disables leaf block decay.',
  'fixes.bug.fix-mc-258859':
    'Fixes MC-258859: https://bugs.mojang.com/browse/MC-258859\nFixes slopes visual bug in biomes like Snowy Slopes, Frozen Peaks, Jagged Peaks, and including Terralith.',
  'fixes.bug.fix-mc-200418':
    'Fixes MC-200418: https://bugs.mojang.com/browse/MC-200418\nBaby zombie villagers stay as jockey variant.',
  'fixes.bug.fix-mc-2025':
    'Fixes MC-2025: https://bugs.mojang.com/browse/MC-2025\nMobs going out of fenced areas/suffocate in blocks when loading chunks.',
  'fixes.bug.fix-mc-94054':
    'Fixes MC-94054: https://bugs.mojang.com/browse/MC-94054\nCave spiders spin around when walking.',
  'fixes.bug.fix-mc-183990':
    'Fixes MC-183990: https://bugs.mojang.com/browse/MC-183990\nAI of some mobs breaks when their target dies.',
  'fixes.bug.fix-mc-118740':
    'Fixes MC-118740: https://bugs.mojang.com/browse/MC-118740\nAny right click resets attack cooldown.',
  'fixes.bug.fix-mc-28289':
    'Fixes MC-28289: https://bugs.mojang.com/browse/MC-28289\nSwitching items at the same time as attacking carries over the attributes and enchantments of the previously held item.',
  'performance.chunks.native-acceleration.enabled':
    "Enables native (C2ME) acceleration of world generation math.\n\nWARNING: native floating-point math may not be bit-identical to Java's, so worlds\ngenerated with this enabled can differ block-by-block from vanilla generation and\nbetween machines with different CPU ISA levels. Seed-parity is NOT guaranteed.",
  'performance.chunks.native-acceleration.allow-avx512':
    'Enables AVX512 support for natives-math optimizations\n\nRead more about AVX512: https://en.wikipedia.org/wiki/AVX-512',
  'performance.chunks.native-acceleration.isa-target-level-override':
    'Overrides the ISA target located by the native loader, which allows forcing AVX512 (must be a value between 6-9 for AVX512 support).\nValue must be between 1-9, and -1 to disable override',
  'performance.chunks.max-view-distance':
    'Changes the maximum view distance for the server, allowing clients to have render distances higher than 32',
  'performance.chunks.player-near-chunk-detection-range':
    "In certain checks, like if a player is near a chunk(primarily used for spawning), it checks if the player is within a certain\ncircular range of the chunk. This configuration allows configurability of the distance(in blocks) the player must be to pass the check.\n\nThis value is used in the calculation 'range/16' to get the distance in chunks any player must be to allow the check to pass.\nBy default, this range is computed to 8, meaning a player must be within an 8 chunk radius of a chunk position to pass.\nKeep in mind the result is rounded to the nearest whole number.",
  'performance.chunks.chunk-worker-algorithm':
    "Algorithm used to determine the number of worker threads for chunk loading and generation.\n\nAvailable algorithms:\n - MOONRISE: Paper's default algorithm. Conservative approach, uses fewer threads (CPU cores / 2).\n - C2ME: More aggressive thread allocation than MOONRISE. Considers both CPU cores and available memory. May use more threads on high-end systems.\n - C2ME_NEW: Modern C2ME algorithm. Balanced approach between MOONRISE and C2ME. Optimized for current hardware, slightly less aggressive than old C2ME.",
  'performance.chunks.end-biome-cache-enabled': 'Enables the end biome cache, which can accelerate The End worldgen.',
  'performance.chunks.end-biome-cache-capacity':
    'The cache capacity for the end biome cache. Only used if end-biome-cache-enabled is true.',
  'performance.chunks.smooth-bedrock-layer':
    'Smoothens the bedrock layer at the bottom of overworld, and on the top of nether during the world generation.',
  'performance.chunks.experimental.enable-density-function-compiler':
    'Whether to use density function compiler to accelerate world generation\n\nDensity function: https://minecraft.wiki/w/Density_function\n\nThis functionality compiles density functions from world generation\ndatapacks (including vanilla generation) to JVM bytecode to increase\nperformance by allowing JVM JIT to better optimize the code.\nAll functions provided by vanilla are implemented.',
  'performance.chunks.experimental.enable-structure-layout-optimizer':
    'Enables a port of the mod StructureLayoutOptimizer, which optimizes general Jigsaw structure generation',
  'performance.chunks.experimental.deduplicate-shuffled-template-pool-element-list':
    'Whether to use an alternative strategy to make structure layouts generate slightly even faster than\nthe default optimization this mod has for template pool weights. This alternative strategy works by\nchanging the list of pieces that structures collect from the template pool to not have duplicate entries.\n\nThis will not break the structure generation, but it will make the structure layout different than\nif this config was off (breaking vanilla seed parity). The cost of speed may be worth it in large\nmodpacks where many structure mods are using very high weight values in their template pools.',
  'performance.optimizations.disable-method-profiler':
    'Disables the method profiler to save some performance. Mainly used for debugging purposes.',
  'performance.optimizations.clump-orbs': 'Clumps experience orbs together to reduce entity count',
  'performance.optimizations.enable-suffocation-optimization':
    'Optimizes the suffocation check by selectively skipping the check in a way that still appears vanilla.\nThis option should be left enabled on most servers, but is provided as a configuration option if the vanilla deviation is undesirable.',
  'performance.optimizations.use-compact-bit-storage':
    'Fixes memory waste caused by sending empty chunks as if they contain blocks. Can significantly reduce memory usage.',
  'performance.optimizations.command-block-parse-results-caching':
    'Caches the parse results of command blocks, can significantly reduce performance impact.',
  'performance.optimizations.sheep-optimization':
    'Enables optimization from Carpet Fixes mod, using a prebaked list of all the possible colors and combinations for sheep.',
  'performance.optimizations.optimized-dragon-respawn':
    'When enabled, improving performance and reducing lag during the dragon’s resurrection event.',
  'performance.optimizations.reduce-chunk-load-and-lookup':
    'If enabled, optimizes chunk loading and block state lookups by reducing the number of chunk accesses required during operations such as Enderman teleportation.',
  'performance.optimizations.create-snapshot-on-retrieving-block-state':
    'Whether to create a snapshot (copy) of BlockState data when plugins retrieve them.\nIf false, plugins get direct BlockState access for better performance but risk data corruption from poor plugin design.',
  'performance.optimizations.sleeping-block-entity':
    'When enabled, block entities will enter a sleep state when they are inactive.',
  'performance.optimizations.equipment-tracking':
    'When enabled, skips repeated checks whether the equipment of an entity changed.',
  'performance.optimizations.hopper-throttle-when-full.enabled':
    'When enabled, hoppers will throttle if target container is full.',
  'performance.optimizations.hopper-throttle-when-full.skip-ticks':
    'The amount of ticks to skip when the hopper is throttled.',
  'performance.dab':
    "DAB is an optimization that reduces the frequency of brain ticks. Brain ticks are very intensive, which is why they are limited. DAB can be tuned to meet your preferred performance-experience tradeoff. The farther away entities are from players, the less frequently their brains will be ticked. While DAB does impact the AI goal selector behavior of all entities, the only entities who's brain ticks are limited are: Villager, Axolotl, Hoglin, Zombified Piglin and Goat",
  'performance.dab.enabled': 'Enables DAB feature',
  'performance.dab.start-distance': 'This value determines how far away an entity has to be',
  'performance.dab.maximum-activation-frequency':
    'How often in ticks, the furthest entity will get their pathfinders and behaviors ticked.',
  'performance.dab.activation-distance-mod':
    "Modifies an entity's tick frequency.\nThe exact calculation to obtain the tick frequency for an entity is: freq = (distanceToPlayer^2) / (2^value), where value is this configuration setting.\nLarge servers may want to reduce the value to 7, but this value should never be reduced below 6. If you want further away entities to tick more often, set the value to 9",
  'performance.dab.dont-enable-if-in-water':
    'When this is enabled, non-aquatic entities in the water will not be affected by DAB.',
  'performance.dab.blacked-entities':
    'Use this configuration option to specify that certain entities should not be impacted by DAB.',
  'performance.virtual-threads.enabled': 'Enables use of virtual threads that was added in Java 21',
  'performance.virtual-threads.bukkit-scheduler': 'Uses virtual threads for the Bukkit scheduler.',
  'performance.virtual-threads.chat-scheduler': 'Uses virtual threads for the Chat scheduler.',
  'performance.virtual-threads.tab-complete-scheduler': 'Uses virtual threads for the Tab Complete scheduler.',
  'performance.virtual-threads.async-executor': 'Uses virtual threads for the MCUtil async executor.',
  'performance.virtual-threads.command-builder-scheduler':
    'Uses virtual threads for the Async Command Builder Thread Pool.',
  'performance.virtual-threads.server-text-filter-pool': 'Uses virtual threads for the server text filter pool.',
  'async.auto-thread-allocation':
    "Enables optimal thread allocation for Parallel World Ticking and Regionized Chunk Ticking.\nBy enabling this, both Parallel World Ticking and Regionized Chunk Ticking will get enabled and\nthread count in config will get ignored and automatically allocated based on your system's CPU cores.",
  'async.parallel-world-ticking.enable':
    "Enables Parallel World Ticking, which executes each world's tick in a separate thread while ensuring that all worlds complete their tick before the next cycle begins.\n\nRead more info about this feature at https://bxteam.org/docs/divinemc/features/parallel-world-ticking",
  'async.parallel-world-ticking.disable-hard-throw':
    "Disables annoying 'not on main thread' throws. But, THIS IS NOT RECOMMENDED because you SHOULD FIX THE ISSUES THEMSELVES instead of RISKING DATA CORRUPTION! If you lose something, take the blame on yourself.",
  'async.parallel-world-ticking.use-per-world-tps-bar':
    'Enables per-world TPS bar, which shows the TPS of the world the player is currently in. TPS bar can be turned on/off with /tpsbar command.',
  'async.parallel-world-ticking.show-tps-of-server-instead-of-world':
    'Enables showing the TPS of the entire server instead of the world in the TPS bar.',
  'async.regionized-chunk-ticking.enable':
    'Enables regionized chunk ticking, similar to like Folia works.\n\nRead more info about this feature at https://bxteam.org/docs/divinemc/features/regionized-chunk-ticking',
  'async.regionized-chunk-ticking.executor-thread-count':
    'The amount of threads to allocate to regionized chunk ticking.',
  'async.regionized-chunk-ticking.executor-thread-priority': 'Configures the thread priority of the executor',
  'async.pathfinding.reject-policy':
    'The policy to use when the queue is full and a new task is submitted.\nFLUSH_ALL: All pending tasks will be run on server thread.\nCALLER_RUNS: Newly submitted task will be run on server thread.',
  'async.parallel-entity-tracker.enable':
    'Runs the entity tracker across a thread pool: the read-only visibility scan and the\nper-entity packet diffs run in parallel, while pairing changes and Bukkit events are\napplied on the tick thread between them. Each phase is joined before the tick continues,\nso tracking keeps vanilla ordering and works with entity-based NPC plugins (Citizens).',
  'async.parallel-entity-tracker.threads':
    'Worker threads used by the tracker.\n0 = a quarter of available cores; negative = all cores minus that many.\nAt least 1 thread is always used.',
  'async.parallel-entity-tracker.keepalive': 'Seconds an idle worker thread is kept alive before being released.',
  'async.chunk-sending.enable':
    'Offloads chunk packet serialization to a thread pool, which can significantly reduce\nmain thread load when many players are loading chunks. A consistent snapshot of the\nchunk is taken on its owning thread, so packets are always internally consistent and\npacket order is preserved per player.',
  'async.mob-spawning.enable':
    'Enables optimization that will offload much of the computational effort involved with spawning new mobs to a different thread.',
  'async.mob-spawning.async-natural-spawn': 'Enables offloading of natural spawning to a different thread',
  'async.portal-search-prefetch.enable':
    'Async pre-loads the exit portal search area (chunk and POI data) when an entity enters a nether\nportal, so the destination search at teleport time hits warm caches instead of reading from disk.',
  'async.parallel-sensors.enable':
    "Runs the read-only part of brain AI (sensors: nearest-entity scans, line-of-sight raycasts)\non a worker thread pool right before the entity ticking phase, instead of on the main thread\nduring each mob's tick. Sensors are a stable top entry in profiler output on servers with\nmany villagers/piglins, and they only read world state, which makes them safe to batch.",
  'async.parallel-sensors.max-threads':
    'The amount of threads to use for the parallel sensor phase.\nValues <= 0 mean 1/4 of available cores (at least 1).',
};
</script>

<template>
	<ConfigViewer :config="config" :comments="comments" title="DivineMC Configuration" />
</template>
