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

DivineMC's RCT implementation is much simpler. Each tick, the ticking chunks are split into groups that cannot affect each other within the tick, and those groups are processed simultaneously instead of one after another.
Groups are rebuilt from scratch on every tick, so there is no long-lived region ownership to maintain.
While this approach is not as fast as Folia's, it provides better compatibility with existing plugins.

## Technical Details

Regionized Chunk Ticking is actually simpler than you might expect. We mainly had to solve two problems.

### Grouping Chunks

For the first challenge, the existing code was already structured to pass a list of chunks to a separate function for ticking.
We simply intercepted that list and split it into groups!

RCT has two ways of splitting it, called layouts, and picks the faster one at runtime.

#### Tiles

The world is cut into tiles of 8×8 chunks, and every tile gets one of four colours in a repeating 2×2 pattern.
Two tiles of the same colour never touch: there is always at least one full tile (128 blocks) between them.

The tick then runs in four phases, one per colour. Inside a phase, all tiles of that colour are ticked in parallel, and the next phase starts only after the previous one has finished.
Every ticking chunk belongs to exactly one tile, so nothing is left for the world thread.

This layout does not depend on where players stand, so it keeps working when everyone is gathered in one place.

#### Player Regions

This is the original RCT layout, now built out of tiles:

1. Each player covers the tiles within their own tick view distance (players may have individual view distances).
2. Players whose tiles overlap are merged with a union-find pass, so players standing near each other always end up in one region.
3. Each region is ticked in parallel with the others in a single phase.

Tiles that no player covers (chunks kept alive by tickets rather than by players, for example) are ticked on the world's own thread after the parallel phase, so nothing is skipped.

When players are spread out, this layout needs only one phase instead of four. When they are close together, their regions merge into one and there is nothing left to parallelize.

#### Picking a Layout

RCT starts with tiles. After every minute of parallel ticking it switches to the other layout for a few seconds, measures how long the tick takes, and keeps whichever layout was more than 5% faster.
If the player regions collapse into a single region, RCT goes back to tiles right away.

Inside every phase, the groups that took the longest on the previous tick are started first, so the tick is not left waiting on a slow group at the end.

#### Serial Fallback

Handing work to other threads has a cost, and it only pays off when there is enough work to split. RCT skips the parallel path and ticks the world the regular Paper way when:

- there are fewer than two non-empty groups,
- one group holds 90% or more of the ticking chunks, or
- all groups together took less than 1 ms on the previous tick.

Once it falls back, it stays in the regular path for 100 ticks (5 seconds) before checking again.

### Ticking Chunks

Parallel ticking often introduces complications, but the grouping method removes most of the risk.
Groups never share a chunk. With tiles, groups that tick at the same time are at least 128 blocks apart, so anything that reaches less than that from its own tile cannot touch another group in the same phase. With player regions, the whole ticking area around a player always lands in a single region, so the chunks a player interacts with are never split across threads.
Because groups are rebuilt every tick and joined before the tick ends, interactions only ever need to be considered within the current tick, and no state is carried between ticks that two threads could disagree about.
What is left are the rare cases where chunks in different groups influence each other inside one tick. Those are handled explicitly: the phases are ordered so that entities never observe half-finished block updates, the few entity types that reach far beyond their own chunk (primed TNT) are ticked on the world thread, and chunk system work that shows up in the middle of the tick (ticket updates, finishing generated chunks) only ever runs on the world thread, never on the region threads.

### Parallel Entity Ticking (PET)

Parallel Entity Ticking (PET) is designed specifically to complement RCT. With PET:

1. Entities are assigned to the tile of the chunk they are in, and so to that tile's group.
2. Groups tick their own entities in parallel, on the same thread pool and in the same phases as the block ticking.
3. Entities outside of any group, plus the few entity types that must stay on the world thread (currently primed TNT), are ticked afterwards on the world's own thread.

This approach significantly improves performance on servers with many entities, as entity processing is often one of the most CPU-intensive tasks in Minecraft. By distributing entity ticking across multiple threads, we can utilize modern multi-core processors much more efficiently.

Entity activation range (EAR) is evaluated once before the parallel phases begin, so activation decisions stay identical to a non-RCT server, and Dynamic Activation of Brain works exactly as it does on the regular entity tick path.

### Tick Phase Ordering

To stay compatible with vanilla mechanics, a single world tick under RCT runs in strict phases, and each phase fully completes before the next one begins:

1. **Block ticking** — all grouped chunks are ticked in parallel (scheduled block ticks, random ticks, redstone, piston activation, etc.), then the chunks left outside every group are ticked on the world thread.
2. **Natural spawning** — mob spawning runs alongside block ticking and is joined before moving on (see `async-natural-spawn`).
3. **Block events** — piston and chest events are dispatched on the world thread, exactly where vanilla dispatches them.
4. **Sensors** — if [Parallel Sensor Phase](./parallel-sensor-phase) is enabled, the due brain sensors are computed on their own pool right before entities tick.
5. **Entity ticking (PET)** — only after every block update above has been finalized do entities tick.
6. **Block entities** — ticked last on the world thread, matching the vanilla order.

This ordering is important. Many Minecraft mechanics, and the "block break" tricks that rely on them (TNT dupers, bedrock breaking, coral/piston duplication, etc.), depend on blocks reaching their final state within a tick *before* entities read them. By separating block ticking from entity ticking, an entity such as a primed TNT always sees the finalized world state (for example a fence that a piston has already moved), so these mechanics behave exactly as they would with RCT disabled.

### DivineMC vs Folia

If you're familiar with Folia, you may notice a key difference in RCT behavior.
In Folia, each region ticks independently, similar to how DivineMC handles different worlds separately. This means that if one region lags, the others remain unaffected.
DivineMC, however, waits for all regions to finish processing before moving on to the next tick.
This design choice ensures stability since groups are rebuilt every tick. If the server didn't wait for all groups to complete, some chunks could be ticked twice (or not at all) within the same tick cycle.

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
  Block events and block entities (pistons, hoppers, furnaces, redstone components that are block entities) still run on the world thread. On redstone-heavy servers they can take most of the tick, and RCT will not speed that part up.
::

## Debugging

Starting the server with `-Ddivinemc.rct.checkOwnership=true` turns on ownership checks for the tile layout. Whenever a region thread places a block or adds an entity in a different tile of the same colour, the server logs a warning with a stack trace, once per call site.
These are exactly the writes that can race with another thread, so the flag is useful when a plugin or a mechanic misbehaves only with RCT enabled. Leave it off in production.

Every 100 ticks RCT also writes the current groups, their chunk and entity counts, and the average tick time of every player in them to `tracking/<world>/region-tick-<date>.log` in the server folder. Older days are gzipped and removed after 30 days. Layout switches and fallbacks to the serial path are written there as well.

::callout{type="warning"}
  Regionized Chunk Ticking and [Parallel World Ticking](./parallel-world-ticking) are independent features that complement each other: RCT parallelizes work **within** a world, while Parallel World Ticking parallelizes work **across** worlds. You can enable them separately or together.
::
