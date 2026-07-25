---
icon: Table
title: Regionized Chunk Ticking
description: Basic introduction to Regionized Chunk Ticking (RCT) in DivineMC, its benefits, and how it works.
badge: Experimental
---

::callout{type="warning"}
  This feature is experimental and disabled by default. Test it on a staging server before enabling it in production.
::

::callout{type="info"}
  This feature was originally took from [CanvasMC](https://github.com/CraftCanvasMC/Canvas), before being reworked to Folia. All credits go to them for the original implementation.
::

## Basics

Regionized chunk ticking basically means that different areas of the world are ticked at the same time instead of one after another.

This concept may sound similar to another server software called [Folia](https://github.com/PaperMC/Folia). While both approaches share the same core idea, their implementations differ significantly.
If you're interested in learning about Folia's approach, you can check out [their documentation](https://docs.papermc.io/folia/reference/region-logic)!

DivineMC's RCT implementation is much simpler. Each tick, the ticking area around every player is collected, overlapping areas are merged into as few regions as possible, and the resulting regions are processed simultaneously instead of one after another.
Regions are thrown away and rebuilt from scratch on the next tick, so there is no long-lived region ownership to maintain.
While this approach is not as fast as Folia's, it provides better compatibility with existing plugins.

## Technical Details

Regionized Chunk Ticking is actually simpler than you might expect. We mainly had to solve two problems.

### Grouping Chunks

For the first challenge, the existing code was already structured to pass a list of chunks to a separate function for ticking.
We simply intercepted that list and split it into groups!

Regions are rebuilt from scratch every tick, around the players:

1. Each player gets a square boundary of their own tick view distance (players may have individual view distances).
2. Overlapping boundaries are merged with a union-find pass, so players standing near each other always end up in one region.
3. The chunks of every player in a merged group form that group's chunk set.
4. Each region is handed to the region ticking thread pool and processed simultaneously with the others.

Regions are submitted in order of their players' recent average region tick time, so the historically slowest region starts first and the tick is not left waiting on it at the end.

Any entity-ticking chunk that ended up in no region at all (chunks kept alive by tickets rather than by players, for example) is ticked on the world's own thread after the parallel phase, so nothing is skipped.

### Ticking Chunks

Parallel ticking often introduces complications, but the grouping method removes most of the risk.
Regions never share a chunk: every chunk belongs to exactly one region, and the whole ticking area around a player always lands in a single region, so the chunks a player interacts with are never split across threads.
Because regions are rebuilt every tick and joined before the tick ends, interactions only ever need to be considered within the current tick, and no state is carried between ticks that two threads could disagree about.
What is left are the rare cases where chunks that ended up in different regions influence each other inside one tick. Those are handled explicitly: the phases are ordered so that entities never observe half-finished block updates, and the few entity types that reach far beyond their own chunk (primed TNT) are ticked on the world thread instead.

### Parallel Entity Ticking (PET)

Parallel Entity Ticking (PET) is designed specifically to complement RCT. With PET:

1. Entities are assigned to their respective regions based on the chunk they are in.
2. Each region ticks its own entities in parallel, on the same thread pool as the block phase.
3. Entities outside of any region, plus the few entity types that must stay on the world thread (currently primed TNT), are ticked afterwards on the world's own thread.

This approach significantly improves performance on servers with many entities, as entity processing is often one of the most CPU-intensive tasks in Minecraft. By distributing entity ticking across multiple threads, we can utilize modern multi-core processors much more efficiently.

Entity activation range (EAR) is evaluated once before the parallel phases begin, so activation decisions stay identical to a non-RCT server, and Dynamic Activation of Brain works exactly as it does on the regular entity tick path.

### Tick Phase Ordering

To stay compatible with vanilla mechanics, a single world tick under RCT runs in strict phases, and each phase fully completes before the next one begins:

1. **Block ticking** — all region chunks are ticked in parallel (scheduled block ticks, random ticks, redstone, piston activation, etc.), then the chunks left outside every region are ticked on the world thread.
2. **Natural spawning** — mob spawning runs alongside block ticking and is joined before moving on (see `async-natural-spawn`).
3. **Block events** — piston and chest events are dispatched, exactly where vanilla dispatches them.
4. **Sensors** — if [Parallel Sensor Phase](./parallel-sensor-phase) is enabled, the due brain sensors are computed on their own pool right before entities tick.
5. **Entity ticking (PET)** — only after every block update above has been finalized do entities tick.
6. **Block entities** — ticked last, matching the vanilla order.

This ordering is important. Many Minecraft mechanics, and the "block break" tricks that rely on them (TNT dupers, bedrock breaking, coral/piston duplication, etc.), depend on blocks reaching their final state within a tick *before* entities read them. By separating block ticking from entity ticking, an entity such as a primed TNT always sees the finalized world state (for example a fence that a piston has already moved), so these mechanics behave exactly as they would with RCT disabled.

### DivineMC vs Folia

If you're familiar with Folia, you may notice a key difference in RCT behavior.
In Folia, each region ticks independently, similar to how DivineMC handles different worlds separately. This means that if one region lags, the others remain unaffected.
DivineMC, however, waits for all regions to finish processing before moving on to the next tick.
This design choice ensures stability since regions are rebuilt every tick. If the server didn't wait for all regions to complete, some chunks could be ticked twice (or not at all) within the same tick cycle.

While our approach may not achieve the same level of isolation as Folia, it strikes a balance between performance improvement and plugin compatibility, making it a practical solution for most Minecraft servers.

## Configuration

All options live in `divinemc.yml` under the `async` section.

```yaml
async:
  regionized-chunk-ticking:
    # Enable Regionized Chunk Ticking. Disabled by default.
    enable: false
    # Number of threads in the region ticking pool. Must be > 1 and no more than the
    # number of CPU threads, otherwise it is reset to the default of 4.
    executor-thread-count: 4
    # Thread priority of the region ticking pool (default: 7, i.e. NORM_PRIORITY + 2).
    executor-thread-priority: 7
  mob-spawning:
    # Run natural mob spawning alongside region ticking. Enabled by default.
    async-natural-spawn: true
```

Instead of picking the thread count by hand you can let the server do it:

```yaml
async:
  # Enables both Regionized Chunk Ticking and Parallel World Ticking and splits
  # the available CPU threads between them, ignoring the manual thread counts.
  auto-thread-allocation: false
```

Auto allocation needs at least 6 CPU threads; on smaller machines it logs a warning and turns itself off.

::callout{type="info"}
  RCT is most effective when players are spread across the world, so that several independent regions can be formed. When all players are grouped together in one area, their regions merge into a single region and there is little to parallelize.
::

::callout{type="warning"}
  Regionized Chunk Ticking and [Parallel World Ticking](./parallel-world-ticking) are independent features that complement each other: RCT parallelizes work **within** a world, while Parallel World Ticking parallelizes work **across** worlds. You can enable them separately or together.
::
