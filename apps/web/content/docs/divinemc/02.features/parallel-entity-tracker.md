---
icon: Waypoints
title: Parallel Entity Tracker
description: Spreading the entity tracker across a thread pool without moving pairing changes or Bukkit events off the tick thread.
---

## About the Entity Tracker

The entity tracker is the part of the server that decides, for every entity and every player, whether that player should currently see that entity, and then sends the packets that keep the client's copy in sync. It runs once per tick for every tracked entity in the world, and it is quadratic in the worst case: each entity has to be compared against every player near it.

On servers with many entities or many players in one area, the tracker is reliably one of the top entries in a profiler snapshot. The work itself, however, splits cleanly into three parts with very different requirements:

- **Scanning** — for each entity, compute which nearby players *should* see it (distance, tracking range, Y-range, `broadcastToPlayer`, vanish API, chunk tracking). This only reads state.
- **Pairing** — apply the difference: add or remove players from the entity's viewer set, fire `PlayerTrackEntityEvent`, register debug synchronizers, send spawn/despawn packets.
- **Sending** — for each entity, diff its state against what each viewer was last told and send the resulting movement/metadata packets.

Scanning and sending are the expensive parts and neither of them needs to mutate shared server state. Pairing is cheap but touches Bukkit events and plugin-visible state.

## How DivineMC Splits It

A tracker tick runs as three phases, each fully joined before the next begins:

1. **Parallel scan.** The tracker entity list is cut into batches (at least 64 entities each, at most one batch per worker plus one) and handed to the worker pool. Each batch produces a list of *deltas* ("these players should start seeing this entity, these should stop") and nothing else. No viewer set is touched, no packet is sent, no event is fired.
2. **Serial apply.** Back on the world's tick thread, the deltas are applied in order. This is where `addPlayer`/`removePlayer` run, so `PlayerTrackEntityEvent` fires on the tick thread, synchronously, in the same order a single-threaded tracker would fire it.
3. **Parallel send.** The per-entity packet diffs run on the worker pool again.

The tick thread does not idle while the workers run: it takes the last batch of each parallel phase itself.

Two entity types are pulled out of the parallel send phase and always sent on the tick thread: **players** and **item frames**. Player entities carry the most plugin-visible state (equipment, attributes, scaled health, boss bars), and item frames mutate the map data they display while being serialized.

## Differences From the Original Petal Tracker

DivineMC's implementation is a rewrite rather than a port. The original Petal multithreaded tracker took the whole `updatePlayers` call, scan *and* pairing, and ran it on worker threads, which forced a chain of workarounds:

| | Original Petal design | DivineMC |
|---|---|---|
| Unit of work | Entity-ticking chunks, claimed by workers via an atomic index | The tracker's own entity list, split into fixed-size batches |
| Pairing changes | On worker threads, off the tick thread | On the tick thread, between the two parallel phases |
| Bukkit events | Rescheduled onto the main thread, so they fire later and out of order relative to the tick that caused them | Fire inline on the tick thread, in the original order |
| Packets sent during pairing | Pushed to a main-thread task queue that the tick thread drains while workers are still running | No queue needed, pairing already runs on the tick thread |
| Viewer set (`seenBy`) | Always a concurrent set, because workers mutate it | Plain reference set; only upgraded to a concurrent set when [Parallel World Ticking](./parallel-world-ticking) is enabled, since that mode lets another world's tick thread reach it through the Bukkit hide/show API |
| Async safety checks | `AsyncCatcher` calls removed from the tracker paths | Left in place, nothing that trips them moves off the tick thread |
| Entity-backed NPCs (Citizens) | Needed an opt-in compatibility mode | Works without one; player entities never leave the tick thread |
| Send phase | On the main thread | On the worker pool |

The practical result is that the read-only work, which is the expensive part, is the only work that leaves the tick thread, so plugins observe exactly the same event order and the same threading contract as on a stock server.

## Configuration

```yaml
async:
  parallel-entity-tracker:
    # Enabled by default.
    enable: true
    # Worker threads. 0 = a quarter of available cores; negative = all cores minus that many.
    # At least 1 thread is always used.
    threads: 0
    # Seconds an idle worker thread is kept alive before being released.
    keepalive: 60
```

The pool uses a caller-runs rejection policy and lets idle threads expire, so a mostly-empty server does not hold threads open.

::callout{type="info"}
  These options were previously named `async.multithreaded-tracker.*`. Existing configs are migrated automatically on first start: `max-threads` becomes `threads`, while `compat-mode` and `queue-size` are removed, since neither has a purpose in the current design.
::

## Compatibility Notes

- Below roughly 64 tracked entities in a world the phases run inline on the tick thread; the pool only pays off once there is enough work to batch.
- An exception in one batch is logged and does not abort the rest of the tracker tick.
- Plugins that call `Player#hideEntity`/`showEntity` are handled through the normal `wantsToSee` path, so a hidden entity is simply never paired.
- The feature composes with [Regionized Chunk Ticking](./regionized-chunk-ticking) and [Parallel World Ticking](./parallel-world-ticking); the tracker still runs once per world, at its normal point in the world tick.
