<script setup lang="ts">
const config = {
	"world-settings": {
		"default": {
			"gameplay-mechanics": {
				"projectiles": {
					"snowball": { "knockback": true, "disable-saving": false },
					"egg": { "knockback": true },
					"firework": { "disable-saving": false }
				}
			},
			"unsupported-features": {
				"allow-entity-portal-with-passenger": true,
				"allow-tripwire-dupe": false
			}
		}
	},
	"version": 7,
	"network": {
		"general": {
			"optimize-non-flush-packet-sending": false,
			"disable-disconnect-spam": false,
			"dont-respond-ping-before-start": true,
			"send-spectator-change-packet": true
		},
		"player-profile-result-caching": { "enabled": true, "timeout": 1440 },
		"no-chat-reports": {
			"enabled": false,
			"add-query-data": true,
			"convert-to-game-message": true,
			"debug-log": false,
			"demand-on-client": false,
			"disconnect-demand-on-client-message": "No Chat Reports required on client!"
		},
		"protocols": {
			"appleskin": { "appleskin-enable": false, "sync-tick-interval": 20 },
			"jade": { "jade-enable": false },
			"xaeromap": { "xaeromap-enable": false, "xaero-map-server-id": "GENERATED" },
			"syncmatica": { "syncmatica-enable": false, "quota": false, "quota-limit": 40000000 }
		}
	},
	"misc": {
		"secure-seed": { "enable": false },
		"lag-compensation": {
			"enabled": true,
			"block-entity-acceleration": false,
			"block-breaking-acceleration": true,
			"eating-acceleration": true,
			"potion-effect-acceleration": true,
			"fluid-acceleration": true,
			"pickup-acceleration": true,
			"portal-acceleration": true,
			"time-acceleration": true,
			"random-tick-speed-acceleration": true
		},
		"region-format": {
			"type": "MCA",
			"compression-level": 1,
			"linear-io-thread-count": 6,
			"linear-io-flush-delay-ms": 100,
			"linear-use-virtual-threads": true
		},
		"sentry": { "dsn": "", "log-level": "WARN", "only-log-thrown": true },
		"old-features": { "copper-bulb-1gt": false, "crafter-1gt": false }
	},
	"fixes": {
		"gameplay": {
			"fix-incorrect-bounce-logic": false,
			"update-suppression-crash-fix": true,
			"ignore-moved-too-quickly-when-lagging": true,
			"always-allow-weird-movement": true
		},
		"misc": { "force-minecraft-command": false, "disable-leaf-decay": false },
		"bug": {
			"fix-mc-258859": false,
			"fix-mc-200418": false,
			"fix-mc-2025": false,
			"fix-mc-94054": false,
			"fix-mc-183990": false
		}
	},
	"performance": {
		"chunks": {
			"chunk-data-cache-soft-limit": 8192,
			"chunk-data-cache-limit": 32678,
			"max-view-distance": 32,
			"player-near-chunk-detection-range": 128,
			"chunk-worker-algorithm": "MOONRISE",
			"use-euclidean-distance-squared": true,
			"end-biome-cache-enabled": false,
			"end-biome-cache-capacity": 1024,
			"smooth-bedrock-layer": false,
			"experimental": {
				"enable-density-function-compiler": false,
				"enable-structure-layout-optimizer": true,
				"deduplicate-shuffled-template-pool-element-list": false
			}
		},
		"optimizations": {
			"skip-useless-secondary-poi-sensor": true,
			"clump-orbs": true,
			"enable-suffocation-optimization": true,
			"use-compact-bit-storage": false,
			"command-block-parse-results-caching": true,
			"sheep-optimization": true,
			"optimized-dragon-respawn": false,
			"reduce-chunk-load-and-lookup": true,
			"create-snapshot-on-retrieving-block-state": true,
			"sleeping-block-entity": false,
			"equipment-tracking": false,
			"hopper-throttle-when-full": { "enabled": false, "skip-ticks": 0 }
		},
		"dab": {
			"enabled": true,
			"start-distance": 12,
			"maximum-activation-frequency": 20,
			"activation-distance-mod": 8,
			"dont-enable-if-in-water": false,
			"blacked-entities": ["villager", "axolotl", "hoglin", "zombified_piglin", "goat"]
		},
		"virtual-threads": {
			"enabled": false,
			"bukkit-scheduler": false,
			"chat-scheduler": false,
			"tab-complete-scheduler": false,
			"async-executor": false,
			"command-builder-scheduler": false,
			"server-text-filter-pool": false
		}
	},
	"async": {
		"parallel-world-ticking": {
			"enable": false,
			"thread-count": 4,
			"log-container-creation-stacktraces": false,
			"disable-hard-throw": false,
			"use-per-world-tps-bar": true,
			"show-tps-of-server-instead-of-world": true
		},
		"regionized-chunk-ticking": {
			"enable": false,
			"executor-thread-count": 4,
			"executor-thread-priority": 7
		},
		"pathfinding": { "enable": true, "max-threads": 1, "keepalive": 60, "queue-size": 0, "reject-policy": "FLUSH_ALL" },
		"multithreaded-tracker": { "enable": true, "compat-mode": false, "max-threads": 1, "keepalive": 60, "queue-size": 0 },
		"chunk-sending": { "enable": true, "max-threads": 1 },
		"mob-spawning": { "enable": true, "async-natural-spawn": true }
	}
}

const comments: Record<string, string> = {
	"world-settings.default": "Default world settings that apply to all worlds unless overridden",
	"world-settings.default.unsupported-features.allow-entity-portal-with-passenger": "Fixes MC-67: https://bugs-legacy.mojang.com/browse/MC-67\nEntities with passengers cannot travel through portals",
	"world-settings.default.unsupported-features.allow-tripwire-dupe": "Bring back MC-59471, MC-129055 on 1.21.2+",
	"world-settings.default.gameplay-mechanics.projectiles.snowball.knockback": "Whether snowballs should knockback entities",
	"world-settings.default.gameplay-mechanics.projectiles.snowball.disable-saving": "Disable saving snowball entities to NBT",
	"world-settings.default.gameplay-mechanics.projectiles.egg.knockback": "Whether eggs should knockback entities",
	"world-settings.default.gameplay-mechanics.projectiles.firework.disable-saving": "Disable saving firework entities to NBT",
	"network.general.optimize-non-flush-packet-sending": "Optimizes non-flush packet sending by using Netty's lazyExecute method.\n\nNOTE: NOT compatible with ProtocolLib!",
	"network.general.disable-disconnect-spam": "Prevents players being disconnected by 'disconnect.spam'",
	"network.general.dont-respond-ping-before-start": "Prevents the server from responding to pings before fully booted.",
	"network.general.send-spectator-change-packet": "When disabled, tab list will not show the player entered spectator mode.",
	"network.player-profile-result-caching.enabled": "Enables caching of player profile results on first join.",
	"network.player-profile-result-caching.timeout": "The amount of time in minutes to cache player profile results.",
	"network.no-chat-reports.enabled": "Enables or disables the No Chat Reports feature",
	"network.protocols.appleskin.appleskin-enable": "Enables AppleSkin protocol support",
	"network.protocols.jade.jade-enable": "Enables Jade protocol support",
	"network.protocols.xaeromap.xaeromap-enable": "Enables Xaero's Map protocol support",
	"network.protocols.syncmatica.syncmatica-enable": "Enables SyncMatica protocol support",
	"misc.secure-seed.enable": "Terrain and biome generation remains the same, but ores and structures use a 1024-bit seed instead of 64-bit.",
	"misc.lag-compensation.enabled": "Improves the player experience when TPS is low",
	"misc.region-format.type": "The type of region file format.\nValid values:\n - MCA: Default Minecraft region file format\n - LINEAR: Linear region file format V2\n - B_LINEAR: Buffered region file format",
	"misc.sentry.dsn": "The DSN for Sentry. Leave blank to disable.",
	"performance.chunks.max-view-distance": "Changes the maximum view distance, allowing clients to have render distances higher than 32",
	"performance.chunks.chunk-worker-algorithm": "Algorithm for chunk worker threads.\nAvailable: MOONRISE, C2ME, C2ME_NEW",
	"performance.dab.enabled": "Reduces the frequency of brain ticks for distant entities.",
	"performance.virtual-threads.enabled": "Enables use of virtual threads from Java 21",
	"async.parallel-world-ticking.enable": "Executes each world's tick in a separate thread while ensuring all worlds complete before the next cycle.",
	"async.parallel-world-ticking.disable-hard-throw": "Disables 'not on main thread' throws. NOT RECOMMENDED — may cause data corruption!",
	"async.regionized-chunk-ticking.enable": "Enables regionized chunk ticking, similar to Folia.",
	"async.pathfinding.enable": "Enable asynchronous pathfinding",
	"async.multithreaded-tracker.enable": "Make entity tracking asynchronous for better performance.",
	"async.chunk-sending.enable": "Makes chunk sending asynchronous to reduce main thread load.",
	"async.mob-spawning.enable": "Offloads mob spawning computation to a different thread.",
}
</script>

<template>
	<ConfigViewer :config="config" :comments="comments" title="DivineMC Configuration" />
</template>
