---
icon: Table
title: Regionized Chunk Ticking
description: Basic introduction to Regionized Chunk Ticking (RCT) in DivineMC, its benefits, and how it works.
---

::callout{type="info"}
  This feature was originally took from [CanvasMC](https://github.com/CraftCanvasMC/Canvas), before being reworked to Folia. All credits go to them for the original implementation.
::

## Basics

Regionized chunk ticking basically means that different areas of the world are ticked at the same time instead of one after another.

This concept may sound similar to another server software called [Folia](https://github.com/PaperMC/Folia). While both approaches share the same core idea, their implementations differ significantly.
If you're interested in learning about Folia's approach, you can check out [their documentation](https://docs.papermc.io/folia/reference/region-logic)!

DivineMC's RCT implementation is much simpler. Each tick, all currently active chunks are compiled and then divided into as many non-connected groups as possible.
Once these groups are formed, the server processes them simultaneously instead of ticking them sequentially.
While this approach is not as fast as Folia's, it provides better compatibility with existing plugins.

## Technical Details

Regionized Chunk Ticking is actually simpler than you might expect. We mainly had to solve two problems.

### Grouping Chunks

For the first challenge, the existing code was already structured to pass a list of chunks to a separate function for ticking.
We simply intercepted that list and split it into groups!

In our latest implementation, we use a more efficient approach to group chunks. The algorithm now:

1. First identifies chunks around each player based on view distance
2. Merges overlapping player regions to form larger cohesive regions
3. Uses a thread pool to process these regions simultaneously

This approach ensures that player-centered regions are ticked efficiently while maintaining server stability.

### Ticking Chunks

Parallel ticking often introduces complications, but our grouping method eliminates most risks.
Since touching chunks are always in the same group, all ticked regions are guaranteed to have at least one chunk of space between them.
Additionally, because regions are rebuilt every tick, interactions only need to be considered within the current tick.
There are very few, if any, cases where separate, non-connected chunks interact within the same tick. As long as those edge cases are accounted for, parallelization is safe!

### Parallel Entity Ticking (PET)

Our latest update introduces Parallel Entity Ticking (PET), a feature designed specifically to complement RCT. With PET:

1. Entities are assigned to their respective regions based on their chunk location
2. Each region ticks its own entities in parallel
3. Entities outside of any player region are ticked separately

This approach significantly improves performance on servers with many entities, as entity processing is often one of the most CPU-intensive tasks in Minecraft. By distributing entity ticking across multiple threads, we can utilize modern multi-core processors much more efficiently.

PET includes special synchronization mechanisms to ensure thread safety while minimizing overhead, making it both safe and efficient.

### Tick Phase Ordering

To stay compatible with vanilla mechanics, a single world tick under RCT runs in strict phases, and each phase fully completes before the next one begins:

1. **Block ticking** — all region chunks are ticked in parallel (scheduled block ticks, random ticks, redstone, piston activation, etc.).
2. **Natural spawning** — mob spawning runs alongside block ticking and is joined before moving on (see `async-natural-spawn`).
3. **Entity ticking (PET)** — only after every block update above has been finalized do entities tick.
4. **Block entities** — ticked last, matching the vanilla order.

This ordering is important. Many Minecraft mechanics — and the "block break" tricks that rely on them (TNT dupers, bedrock breaking, coral/piston duplication, etc.) — depend on blocks reaching their final state within a tick *before* entities read them. By separating block ticking from entity ticking, an entity such as a primed TNT always sees the finalized world state (for example a fence that a piston has already moved), so these mechanics behave exactly as they would with RCT disabled.

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
    # Number of threads in the region ticking pool. Range: 1-10 (default: 4).
    executor-thread-count: 4
    # Thread priority of the region ticking pool (default: 7, i.e. NORM_PRIORITY + 2).
    executor-thread-priority: 7
  mob-spawning:
    # Run natural mob spawning alongside region ticking. Enabled by default.
    async-natural-spawn: true
```

::callout{type="info"}
  RCT is most effective when players are spread across the world, so that several independent regions can be formed. When all players are grouped together in one area, their regions merge into a single region and there is little to parallelize.
::

::callout{type="warning"}
  Regionized Chunk Ticking and [Parallel World Ticking](./parallel-world-ticking) are independent features that complement each other: RCT parallelizes work **within** a world, while Parallel World Ticking parallelizes work **across** worlds. You can enable them separately or together.
::
