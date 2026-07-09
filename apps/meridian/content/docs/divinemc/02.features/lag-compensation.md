---
icon: Timer
title: Lag Compensation
description: How DivineMC keeps the player experience smooth when the server is below 20 TPS.
---

## About Lag Compensation

When the server falls below 20 TPS, everything driven by ticks slows down with it: crops grow slower, items take longer to pick up, potions last longer than their real duration, liquids spread slowly. Lag compensation counteracts this by tracking how many ticks each world has missed and re-applying them to selected game mechanics, so from the player's point of view these mechanics keep running at (close to) real-time speed even while the server is lagging.

Each world tracks its own TPS, so under [Parallel World Ticking](/docs/divinemc/features/parallel-world-ticking) a lagging world does not cause compensation in a healthy one.

Lag compensation is enabled by default (`misc.lag-compensation.enabled` in `divinemc.yml`) and each mechanic can be toggled individually:

| Setting | Default | What it accelerates |
|---|---|---|
| `block-entity-acceleration` | `false` | Block entities (hoppers, furnaces, spawners) run extra ticks to catch up |
| `block-breaking-acceleration` | `true` | Block breaking progress scales with real time |
| `eating-acceleration` | `true` | Food consumption finishes on real-time schedule |
| `potion-effect-acceleration` | `true` | Potion effects tick down at real-time speed |
| `fluid-acceleration` | `true` | Water and lava spread delays are shortened |
| `pickup-acceleration` | `true` | Item pickup delay counts down at real-time speed |
| `portal-acceleration` | `true` | Portal transition time counts down at real-time speed |
| `random-tick-speed-acceleration` | `true` | Random ticks (crop growth, etc.) are compensated |

::callout{type="warning"}
  `eating-acceleration` makes the server finish consuming items earlier than the client expects, which causes a purely visual desync of the eating animation at low TPS. This is a known trade-off, not a bug.
::

## Adaptive Lag Compensation

Classic lag compensation has an inherent flaw: it adds work to a server that is already struggling. The worst case is `block-entity-acceleration` — the server lags, so every block entity is ticked multiple times to catch up, which makes the tick even more expensive, which causes more lag. This positive feedback loop is why block entity acceleration is disabled by default.

Adaptive lag compensation breaks that loop with a **tick time budget**. Compensation for a category is only applied while the current tick's elapsed time is below its share of the budget:

| Category | Budget share | Rationale |
|---|---|---|
| Fluids | 100% | Cheap, ticks early in the tick |
| Item pickup | 100% | Just a counter decrement |
| Potion effects | 85% | Moderately expensive loops |
| Block entities | 70% | The expensive one — cut off first |

In practice this means cheap categories (which also run early in the tick, when almost no budget is spent) are almost always compensated, while expensive catch-up loops are the first to be skipped once the tick runs long. When the server is healthy, behavior is identical to plain lag compensation.

```yaml
misc:
  lag-compensation:
    adaptive:
      enabled: false          # opt-in
      tick-budget-ms: 45      # compensation stops once the current tick exceeds this
```

::callout{type="info"}
  Adaptive mode is disabled by default because it intentionally weakens compensation on an overloaded server — that is the point, but it changes low-TPS behavior compared to plain lag compensation, so it is left for the server owner to decide. If you want to enable `block-entity-acceleration`, enabling adaptive mode alongside it is strongly recommended.
::
