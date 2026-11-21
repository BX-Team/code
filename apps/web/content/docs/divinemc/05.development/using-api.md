---
icon: Wrench
title: Using DivineMC API
description: A basic guide to using the DivineMC API.
---

## API

DivineMC have some updates to default Paper API, including API changes from Purpur, so you can use DivineMC API to access some features that are not available in Paper API.

::code-group
```kotlin [build.gradle.kts]
repositories {
    maven {
        url = uri("https://repo.bxteam.org/snapshots")
    }
}

dependencies {
    compileOnly("org.bxteam.divinemc:divinemc-api:26.3.build.+")
}

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(25))
}
```
```xml [pom.xml]
<repository>
    <id>bx-team-snapshots</id>
    <name>BX Team Repository</name>
    <url>https://repo.bxteam.org/snapshots</url>
</repository>

<dependencies>
    <dependency>
        <groupId>org.bxteam.divinemc</groupId>
        <artifactId>divinemc-api</artifactId>
        <version>[26.3.build,)</version>
        <scope>provided</scope>
    </dependency>
</dependencies>
```
::

## Parallel World Ticking and Regionized Chunk Ticking

With [Parallel World Ticking](/docs/divinemc/features/parallel-world-ticking) and [Regionized Chunk Ticking](/docs/divinemc/features/regionized-chunk-ticking), plugin code runs on more threads than the main thread. The API below lets a plugin find out where it runs, what it may change from there, and how the worlds tick. All methods are on the regular Bukkit `Server` and `World` interfaces.

### Features

| Method | Returns |
|--------|---------|
| `Server#isParallelWorldTickingEnabled()` | Whether worlds tick on their own threads |
| `Server#isRegionizedChunkTickingEnabled()` | Whether parts of a world tick on region workers |
| `Server#isPluginListenerSerializationEnabled()` | Whether listeners of plugins without `folia-supported: true` currently run one at a time. Only in effect while one of the two features is on; changes with a config reload |

### Threads and ownership

| Method | Returns |
|--------|---------|
| `Server#getCurrentTickingWorld()` | The world whose tick the current thread runs: the world's own thread, a region worker of that world, or the main thread while it ticks the world. `null` outside of a world tick, for example in a global or asynchronous task |
| `Server#isOwnedByCurrentThread(World)` | Whether the current thread may change anything in the whole world right now |
| `Server#isOwnedByCurrentRegion(...)` | Paper's Folia API: whether the current thread may change the given chunks or entity |

How the ownership checks answer on each kind of thread:

- **A world's own thread** (Parallel World Ticking) owns its whole world. It also owns another world once it has taken that world over, which happens the first time it uses it.
- **A region worker** (Regionized Chunk Ticking) owns only the chunks of the group it is ticking: its tile, or the tiles of its player region. It never owns its world as a whole, so `isOwnedByCurrentThread` returns `false` for it. An entity that has just moved over the border of the group is not owned either. With Parallel World Ticking also on, a region worker owns another world once it has taken that world over.
- **The main thread** owns every world, as in Paper.
- **Asynchronous threads** own nothing.

When a check returns `false`, schedule the work with the `RegionScheduler` or the entity's `EntityScheduler` instead of doing it right away.

### Folia schedulers

With Parallel World Ticking on, DivineMC runs the tasks of plugins that declare `folia-supported: true` in their `plugin.yml` or `paper-plugin.yml` on the thread of the world they belong to:

- `RegionScheduler` tasks run at the start of their world's tick, on that world's thread. Delays count the ticks of that world.
- `EntityScheduler` tasks run at the start of the tick of the world the entity is in, and follow the entity when it changes worlds. A task runs once per server tick: if the entity changed worlds in a way that no world thread picked it up, the task runs on the main thread right after all worlds have ticked.
- `GlobalRegionScheduler` and `AsyncScheduler` work as in Paper. Global tasks run on the main thread before the worlds tick, while no world is ticking.

Region and entity tasks of other plugins, and everything with Parallel World Ticking off, run on the main thread as in Paper.

```java
// With folia-supported: true this runs on the overworld's thread, in parallel with the other worlds.
Bukkit.getRegionScheduler().runAtFixedRate(plugin, overworld, 0, 0, task -> {
    // getCurrentTickingWorld() == overworld here
}, 1, 20);
```

### Tick statistics

`World#getTickStatistics()` returns a `WorldTickStatistics` snapshot (package `org.bxteam.divinemc.world`). Times are in nanoseconds; the time and count values add up from the moment the world was loaded, so compare two snapshots to get a rate. Every value is zero while the feature it describes is off.

| Value | Meaning |
|-------|---------|
| `crossWorldWaitNanos()` | Time this world's tick spent waiting to take over another world that was ticking (a plugin or a command in this world used the other world) |
| `tickStartDelayNanos()` | Time the start of this world's tick waited because another world's thread was still working in it |
| `takeOverCount()` | How many times a thread of another world took over or borrowed this world |
| `serverStateLockWaitNanos()` | Time this world's threads waited for the lock that protects server-wide state: commands, scoreboards, and plugin listeners when listener serialization is on |
| `regionizedUnitCount()` | Number of tiles or player regions ticked in parallel in the last tick; zero when the last tick ran serially |
| `regionizedTickNanos()` | Duration of the regionized part (blocks and entities) of the last tick; zero when the last tick ran serially |

A world whose `crossWorldWaitNanos` or `takeOverCount` keeps growing ticks one after the other with other worlds instead of in parallel. That usually comes from a plugin or a command that works in another world during the tick.

```java
import org.bxteam.divinemc.world.WorldTickStatistics;

WorldTickStatistics before = world.getTickStatistics();
// ... one second later
WorldTickStatistics after = world.getTickStatistics();
double waitedMsPerSecond = (after.crossWorldWaitNanos() - before.crossWorldWaitNanos()) / 1_000_000.0;
```

## Dev Bundle

Dev bundle is a tool provided by paperweight, which can easily access Minecraft NMS code during plugin development, See how to setup it and more details in [paperweight-userdev](https://docs.papermc.io/paper/dev/userdev).

To be able to use the dev bundle provided by DivineMC, you need to make following changes to the dependency that provides in the tutorial above.

```kotlin
repositories {
  maven {
    url = uri("https://repo.bxteam.org/snapshots")
  }
}

dependencies {
    paperweight.paperDevBundle("26.3.build.+") // [!code --]
    paperweight.devBundle("org.bxteam.divinemc", "26.3.build.+") // [!code ++]
}
```
