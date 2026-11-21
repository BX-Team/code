---
icon: Repeat
title: Parallel World Ticking
description: How DivineMC ticks worlds at the same time, what happens when a plugin works across worlds, and what it costs.
badge: Experimental
---

::callout{type="warning"}
  This feature is experimental and disabled by default. Test it on a staging server before enabling it in production.
::

::callout{type="info"}
  The idea of ticking worlds on separate threads comes from [SparklyPaper](https://github.com/SparklyPower/SparklyPaper). DivineMC's current implementation is its own design; only some of the original thread checks remain.
::

## About Parallel World Ticking

In vanilla, the server ticks its worlds one after another: the overworld, then the nether, then the end, then every other loaded world. With Parallel World Ticking, the worlds of one server tick run at the same time on separate threads, and the next tick starts only when all of them have finished.

The server still advances in whole ticks: every world ticks exactly once per server tick, in step with the others. The tick takes as long as the slowest world, instead of the sum of all worlds. It helps when players are spread over several worlds that each carry real load; a server where everyone stands in one world gains nothing.

### What happens in one tick

1. **Before the worlds tick**, on the server thread, as in vanilla: packets, schedulers, functions, clocks.
2. **The worlds tick**, each on its own thread named `<world> - ServerLevel Tick Worker` (visible in spark). Every world has its own thread, but at most `max-concurrent-worlds` of them tick at once; the others wait until one finishes. The worlds that took longest last tick start first, so a slow world does not end up last in the queue.
3. **After the worlds tick**, on the server thread: the cross-world operations vanilla started during the tick are carried out (see below), then connections and the player list, as in vanilla.

A crash in one world's tick stops the server with the same `Exception ticking world` crash report as without the feature.

## Working across worlds

### Vanilla's own cross-world operations

A few vanilla mechanics move things between worlds in the middle of a world's tick: entities going through nether or end portals, an ender pearl landing in a different world than its thrower, a villager releasing a bed or workstation in another dimension. With Parallel World Ticking these are queued and carried out on the server thread right after all worlds have ticked, in world order and then in the order they happened. The result does not depend on which world's thread got there first.

Compared to vanilla, such an entity arrives in the other world at the end of the same tick instead of in the middle of it.

### Plugins

A plugin that works with another world from an event of the world it runs in (reads or changes blocks, loads chunks, spawns or teleports entities and players) works as it does without the feature. The thread that needs the other world takes it over:

- if that world is not ticking at the moment (it has finished its tick or not started it yet), immediately;
- otherwise, as soon as that world's tick ends.

It keeps the world until its own tick ends, so those two worlds tick one after the other in that tick. A waiting world keeps its `max-concurrent-worlds` slot while it waits, so with frequent cross-world calls fewer worlds tick in parallel than the limit allows. Cross-world calls therefore cost time when they happen; a plugin that does this every tick for every player will make the worlds tick serially.

Waiting threads can lend worlds to each other: a world whose thread is itself waiting inside a plugin call can be used by the thread it waits for. Two worlds that need each other at the same time are resolved this way. A wait that no thread can resolve throws an `IllegalStateException` with the message `Cross-world wait that no level can resolve`, naming the threads involved, inside the plugin call that started it. This only happens when region workers of two worlds need each other's world at the same moment (see below).

Reading blocks from an asynchronous thread (for example in a packet listener) works as in Paper. Changing a world from an asynchronous thread fails, as before.

### Plugins that are not thread-safe

Event listeners of different worlds run at the same time. Most plugins keep their data in plain collections that are not safe for that, which can lose or corrupt data. The `serialize-plugin-listeners` option runs listeners of plugins that do not declare `folia-supported: true` one at a time across all threads. It is off by default because it makes the threads wait for each other whenever such listeners run.

A listener that waits for another world, or on a region worker for a chunk to load, lets other serialized listeners run while it waits, the same way other listeners can run during an API call on a single-threaded server (when the call fires events of its own).

Server-wide state that every world touches during its tick (commands, scoreboards, command storage, boss bars, loot random sequences, map ids) is protected by the server itself and needs no option.

## Regionized Chunk Ticking together with Parallel World Ticking

With [Regionized Chunk Ticking](/docs/divinemc/features/regionized-chunk-ticking) enabled as well, parts of every world are ticked by region workers from one shared pool. A region worker that needs another world takes it over like a world thread does and gives it back when it is done with its region. A world is never lent while its own region workers are running.

Two region workers of different worlds that need each other's world at the same moment cannot wait for each other; one of the calls throws the `Cross-world wait that no level can resolve` exception instead. In probe runs where entity-move listeners on every region worker read blocks of another world on every move, this happened to less than 1% of the calls.

## Performance

Measured on a Ryzen 5 5600 (6 cores, 12 threads) with three worlds, each with 20 simulated players spread 160 blocks apart and walking around. Every number is the median tick time over 180 seconds after a 90-second warm-up; each configuration was run three times, alternating with the previous build.

| Configuration | Median tick time |
|---|---|
| Parallel World Ticking off | 59.2 – 60.9 ms |
| On, `max-concurrent-worlds: 1` | 59.9 ms |
| On, `max-concurrent-worlds: 2` | 32.4 ms |
| On, `max-concurrent-worlds: 3` | 29.5 – 30.5 ms |

- With one world at a time the result equals the feature being off: the extra threads and the hand-over between them cost nothing measurable.
- Two worlds at a time already gets close to three here, because the worlds are not equally loaded and the slowest world starts first.
- With Parallel World Ticking off, the server is as fast as a build without the feature: its locks and thread-safe collections are only used when it, Regionized Chunk Ticking or the Parallel Sensor Phase is on.

Your gain depends on how the load is split between worlds. A server where one world carries almost everything gains almost nothing.

## Configuration

All options live in `divinemc.yml` under the `async` section. Parallel World Ticking is read at startup; changing it needs a restart.

```yaml
async:
  parallel-world-ticking:
    # Enable Parallel World Ticking. Disabled by default.
    enable: false
    # How many worlds may tick at the same time. Every world has its own tick thread;
    # this limits how many of them run at once. Called 'thread-count' before; the old
    # key is migrated on startup.
    max-concurrent-worlds: 4
    # Show the TPS of the world the player is in, via the /tpsbar command.
    use-per-world-tps-bar: true
    # Show the TPS of the whole server in the TPS bar instead of the world's own TPS.
    show-tps-of-server-instead-of-world: true
  # Run listeners of plugins that do not declare 'folia-supported: true' one at a time.
  # Also applies to Regionized Chunk Ticking.
  serialize-plugin-listeners: false
```

There is also a shortcut that configures the thread budget for you:

```yaml
async:
  # Enables both Parallel World Ticking and Regionized Chunk Ticking and
  # splits the available CPU threads between them, ignoring the manual thread counts.
  auto-thread-allocation: false
```

Auto allocation requires at least 6 CPU threads; on smaller machines it logs a warning and turns itself off.

The options `parallel-world-ticking.disable-hard-throw` and `parallel-world-ticking.log-container-creation-stacktraces` no longer exist and are removed from the file on startup: cross-world access no longer fails, and opening an inventory right after a world change no longer needs special handling.

## For plugin developers

- `Bukkit.getServer().isParallelWorldTickingEnabled()` tells whether the feature is on; `World#getTickTimes()` and `World#getAverageTickTime()` give per-world tick times. `Server#getCurrentTickingWorld()`, `Server#isOwnedByCurrentThread(World)` and `World#getTickStatistics()` tell which world the current thread ticks, what it may change and how often worlds wait for each other; see [Using DivineMC API](/docs/divinemc/development/using-api#parallel-world-ticking-and-regionized-chunk-ticking).
- With `folia-supported: true`, the tasks of your `RegionScheduler` and `EntityScheduler` run on the thread of their world, in parallel with the other worlds, instead of on the main thread.
- Code running in a world's event is on that world's thread. Prefer working in the world of the event; touching another world is supported but makes those two worlds tick one after the other.
- Keep your own data structures thread-safe, or declare nothing and let server owners enable `serialize-plugin-listeners`. Declare `folia-supported: true` only if your listeners really are safe to run concurrently.
