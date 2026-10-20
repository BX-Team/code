---
icon: EyeOff
title: Raytrace Entity Culling
description: Untracking entities a player provably cannot see, to save bandwidth and blind entity ESP.
badge: Experimental
---

::callout{type="warning"}
  This feature is experimental and disabled by default. Test it on a staging server before enabling it in production.
::

::callout{type="info"}
  This is a server-side port of tr7zw's [EntityCulling](https://github.com/tr7zw/EntityCulling) mod, which does the same thing on the client.
::

## About Raytrace Entity Culling

Vanilla decides what a player is told about purely by distance: if an entity is within the tracking range, its spawn, movement and metadata packets are sent, regardless of whether a mountain, a base wall or half the Nether is between the two. The client then receives hundreds of entities it will never draw a pixel of, and renders the bounding boxes of all of them.

Raytrace Entity Culling adds a visibility test on top of the distance test. A background pass raytraces from each player's eye position to the entities around them; entities that are fully hidden behind opaque blocks are removed from that player's entity tracker, exactly as if they had walked out of range.

This has three effects:

- **Less bandwidth.** Entities behind walls stop generating movement and metadata packets for that player.
- **Better client FPS.** The client never learns about entities it cannot see, so it does not tick or attempt to render them.
- **Entity ESP stops working.** Freecam, tracers, mob/player ESP and similar cheats can only draw what the server sent. If the server never sent the entity, no client-side hack can reveal it.

::callout{type="warning"}
  This is not an anti-cheat. It blinds *entity* ESP through solid blocks and nothing else: ore x-ray, chest/block-entity ESP and tracers on entities that are genuinely visible are unaffected. Treat it as defence in depth, not as a replacement for an anti-cheat plugin.
::

## How It Works

Each real player gets a culling tracker, and all trackers run on one small shared scheduled pool with a *fixed delay*, so passes for a given player never overlap and the thread count does not grow with the player count.

A single pass:

1. Takes the player's current eye position as the camera.
2. Resets the occlusion cache if the player moved, the world changed, a block changed within trace distance, or the cache is older than 2.5 seconds.
3. Walks every entity in the world, discards the ones that are always visible (see below), too close, or too far, and raytraces the rest.
4. Publishes the set of hidden entity ids.

The tracker reads that set while deciding whether a player should see an entity, so a culled entity is untracked on the next tracker tick and re-tracked once a later pass proves it visible again.

The raytracer itself is a voxel DDA over the block grid: for every voxel of the entity's (expanded) bounding box that faces the camera it walks the line of blocks between camera and voxel, and the entity counts as visible as soon as **one** ray gets through. Only blocks that render as full opaque cubes stop a ray.

Block reads happen off the tick threads without locking. That is deliberate: the failure direction is always "visible", so a torn read during a concurrent block write can only ever produce a spurious *visible* result, never a wrongly hidden entity. Trace errors, a missing world and disabled states all publish an empty hidden set, which is plain vanilla behaviour.

### Entities That Are Never Culled

| Case | Reason |
|---|---|
| Within `force-visible-radius` of the eye | Too close to be worth tracing |
| Beyond `max-trace-distance` | Outside the traced volume |
| Bounding box larger than `bounding-box-limit` on any axis | Large entities are cheap to see and expensive to trace |
| Glowing entities, entities with an always-visible custom name | The client renders these through walls anyway |
| Display entities, fishing hooks | Holograms and rod lines misbehave when untracked |
| Passengers and vehicles | Untracking one half of the pair desyncs the other half |
| Invisible armor stands | Usually plugin markers/holograms, controlled by `skip-marker-armor-stands` |
| Players | Controlled by `cull-players`; spectators are never culled |
| Anything listed in `skipped-entity-types` | Explicit opt-out |

Spectators also never have anything culled *from* them, since they are freecam by design.

## Configuration

```yaml
network:
  raytrace-entity-culling:
    # Disabled by default.
    enabled: false
    # Raytracing threads shared by all players. 0 = automatic (cores / 8, clamped to 1-4).
    threads: 0
    # Delay between visibility passes for each player. Values below 10 are clamped to 10.
    check-interval-ms: 50
    # Maximum distance in blocks at which entities are raytraced. Clamped to 16-160.
    max-trace-distance: 64
    # Entities closer than this to the eye are always visible, no raytracing done.
    force-visible-radius: 4.0
    # Once proven visible, an entity stays visible for at least this long.
    visibility-timeout-ms: 1000
    # How much the entity bounding box is expanded before raytracing.
    aabb-expansion: 0.5
    # Entities with a bounding box larger than this on any axis are never culled.
    bounding-box-limit: 20
    # Whether player entities may be culled. This is the anti-ESP part.
    cull-players: true
    # Whether invisible armor stands are always visible.
    skip-marker-armor-stands: true
    # Entity types that are never culled.
    skipped-entity-types: []
```

### Tuning

`max-trace-distance` is the setting to be careful with. Each player allocates an occlusion cache sized `(2 × (distance + 8))³ / 4` bytes, which is about **730 KB per player** at the default of 64, roughly 2.2 MB at 96 and 4.8 MB at 128. On a 200-slot server the default already costs around 140 MB of steady-state memory.

The pass itself is linear in *entities × players*: every player's pass walks the world's entity list. On servers with tens of thousands of entities, raising `check-interval-ms` is a much better lever than adding threads.

If you want the culling to be as strict as possible (at the cost of more CPU and more visible pop-in):

```yaml
network:
  raytrace-entity-culling:
    check-interval-ms: 25
    force-visible-radius: 0.5
    visibility-timeout-ms: 250
    aabb-expansion: 0.0
```

## Known Limitations

Some of these are inherent to how the algorithm works and are worth knowing before you enable it.

### Entities right behind a single-block wall can stay visible

This is the most commonly reported one, and it is the product of two settings.

First, **anything within `force-visible-radius` (4 blocks by default) of your eye is never traced at all**. At that range the check is skipped entirely, wall or no wall.

Second, and independently of distance: `aabb-expansion` grows the traced volume by half a block in every direction, and the raytracer deliberately never tests the *target* voxel itself, only the blocks in front of it. When an entity stands flush against a wall, the wall's own block falls inside that expanded volume, so the ray aimed at it crosses nothing but air and reports the entity visible. A wall two or more blocks thick, or an entity standing a block away from the wall, culls correctly.

Setting `aabb-expansion: 0.0` and lowering `force-visible-radius` removes both effects. The trade-off is what the expansion is there for: it makes entities appear slightly *earlier* when you peek around a corner, hiding the latency of the periodic pass. With expansion at zero, entities pop in a fraction of a second later.

### Only full opaque cubes occlude

Glass, slabs, stairs, fences, walls, trapdoors, doors, carpets, leaves and every other non-full or non-opaque block are transparent to the raytracer. A base built from slabs or glass gets no culling at all. This matches the client-side mod and is intentional: a block that lets you see through it must not hide entities.

### Visibility is sticky, and re-appearing is not instant

Once an entity is proven visible it is pinned visible for `visibility-timeout-ms` (1 second by default), so an entity that ducks behind a wall keeps being tracked for up to that long. This exists to stop track/untrack packet flicker for entities sitting exactly on the edge of visibility, but it does mean the anti-ESP guarantee has a one-second tail.

In the other direction, an entity that becomes visible is re-tracked within one `check-interval-ms` plus one tracker tick, roughly 100 ms at the defaults. Players with high ping may notice entities arriving slightly late when peeking around corners, and on PvP servers that is the main reason to consider `cull-players: false`.

### The camera-inside-the-box shortcut

If the player's eye block falls inside the entity's expanded, block-aligned bounding box on all three axes, the entity is reported visible without any tracing. In practice this covers entities you are standing in, on top of or directly underneath.

### Untracking is not invisibility

A culled entity is *removed* from the client, not hidden. That means:

- It re-appears without client-side interpolation: it pops in at its current position instead of sliding there.
- Sounds and particles the client would attach to that entity can be missed while it is untracked.
- Client mods that read the entity list (minimaps showing mobs, HUD counters) only see what the server sent.

### Chunk loading

If a chunk between the player and an entity is not loaded on the server at the moment of the pass, the ray is treated as blocked. In practice everything within tracking range is loaded, so this only shows up at the very edge of `max-trace-distance` on a server under chunk-loading pressure.

### Vehicles and passengers

Anything riding or being ridden is skipped entirely. A player on a horse in a walled-off stable is fully visible to entity ESP, as is the horse.

## Compatibility Notes

- The block-change hook fires on whatever thread changed the block and only flips a per-player dirty flag, so it is safe under [Parallel World Ticking](./parallel-world-ticking) and [Regionized Chunk Ticking](./regionized-chunk-ticking).
- Culling is evaluated inside the same visibility predicate as vanish and tracking range, which means it composes with the [Parallel Entity Tracker](./parallel-entity-tracker) and with plugins using `Player#hideEntity`.
- Trackers are registered lazily per player and rebuilt after respawns and world changes, so nothing is left stale after a teleport.
