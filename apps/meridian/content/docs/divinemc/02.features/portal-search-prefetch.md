---
icon: Torus
title: Portal Search Prefetch
description: Eliminating the teleport lag spike by pre-loading the exit portal search area.
---

## About Portal Search Prefetch

When an entity travels through a nether portal, the server has to find (or decide to create) the exit portal on the other side. That search is a POI scan with a radius of up to 128 blocks in the target dimension, and it synchronously loads chunk and POI data from disk — a visible tick spike at the moment of teleportation.

The destination, however, is already known the moment the entity *steps into* the portal, and players wait out the portal transition time (80 ticks by default) before the teleport actually happens. DivineMC uses that window: as soon as an entity starts standing in a nether portal, the chunks of the exit search area in the target dimension are scheduled for asynchronous loading (read-only — no chunk generation is triggered). By the time the real portal search runs, the chunk and POI data is already in memory and the scan is fast.

This does not change gameplay in any way — the destination search itself still runs on the regular teleport path with all its events (`EntityPortalReadyEvent`, Bukkit portal events), and produces exactly the same result. Instant teleports (e.g. creative players with no portal delay) skip the prefetch since there is no waiting window to use.

## Configuration

```yaml
async:
  portal-search-prefetch:
    enable: true
```

::callout{type="info"}
  This feature pairs well with `misc.lag-compensation.portal-acceleration` (see [Lag Compensation](/docs/divinemc/features/lag-compensation)): acceleration shortens the wait inside the portal on a lagging server, while the prefetch makes sure the teleport itself does not spike the tick.
::
