---
icon: Radar
title: Parallel Sensor Phase
description: Running the read-only part of brain AI on a worker thread pool.
badge: Experimental
---

::callout{type="warning"}
  This feature is experimental and disabled by default. Test it on a staging server before enabling it in production.
::

## About the Parallel Sensor Phase

Mobs that use the brain AI system (villagers, piglins, hoglins, axolotls, wardens, and others) split their AI into two parts:

- **Sensors** — periodically *scan* the world: find the nearest living entities, check line of sight with raycasts, look for hostiles, detect held items. They only read world state and write the results into their own mob's brain memories.
- **Behaviors** — *act* on those memories: pathfind, trade, flee, attack.

On servers with many villagers or piglins, sensors are a stable top entry in profiler output: nearest-entity scans and line-of-sight raycasts are expensive, and every brain mob runs them on a fixed cadence (typically every 20 game ticks, with a random per-mob offset).

That cadence is what makes them parallelizable: the set of sensors due to fire on a given tick is known *before* entities start ticking. DivineMC uses this to run a dedicated sensing phase right before the entity ticking phase:

1. All active brain mobs with due sensors are collected.
2. Their sensors are executed on a worker thread pool, one task per mob, so a single brain is only ever touched by one thread.
3. The world tick thread waits for all sensor tasks to finish before entity ticking begins, so sensors always see a world that is not mutating.
4. When each mob later ticks its brain, the pre-computed sensors are simply skipped, since their timers were reset exactly as a regular sensor tick would.

Behaviors still run on the main thread, on the same tick, with the same data they would have seen in vanilla.

## Configuration

```yaml
async:
  parallel-sensors:
    enable: false      # experimental, opt-in
    max-threads: 0     # <= 0 means 1/4 of available cores (at least 1)
```

## Compatibility Notes

- Sensors that may touch disk (the villager bed sensor performs POI lookups) are excluded from the parallel phase and keep running on the tick thread.
- Mobs throttled by EAR (entity activation range) or DAB (dynamic activation of brain) are skipped, matching vanilla behavior of not sensing for inactive mobs.
- The feature composes with [Parallel World Ticking](/docs/divinemc/features/parallel-world-ticking): each world runs its own sensing phase on a shared worker pool.
- Plugins registering custom NMS sensors: sensors run off the main thread during this phase. If a custom sensor mutates world state, it must override `divinemc$canRunAsync()` to return `false`.
