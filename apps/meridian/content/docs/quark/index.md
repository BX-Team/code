---
icon: MessageCircleQuestion
title: About Quark
description: Basic information about Quark, its modules and requirements.
---

## What is Quark?

Quark is a small framework for Minecraft plugin developers. It downloads Maven dependencies when the plugin starts instead of shading them, keeps configs in annotated classes, checks for updates and runs a test server straight from Gradle.

Every module is optional: a plugin ships only the modules it uses, and Quark is relocated into the plugin's own package, so two plugins with different Quark versions never meet on one server.

## Key Features

- **Runtime dependencies** - Dependencies declared with `quark(...)` are downloaded, resolved transitively and loaded when the plugin starts, so the jar stays small
- **Relocation** - Quark and your libraries are moved into the plugin's package, in the shaded jar and at runtime. `relocate = true` on a dependency keeps the plugin on its own version even when the server ships another one
- **Configs** - Plain classes with `@Comment`, `@Header` and versioned migrations, saved as YAML in field order, with validation through `@Min`, `@Max`, `@Pattern` and friends
- **Bukkit serializers** - ItemStack, Location, Sound and Adventure components in configs out of the box
- **Update checks** - Modrinth, Hangar, GitHub Releases, SpigotMC, Reposilite or any JSON endpoint, with a console message and a join notification
- **Platform adapters** - One `Platform` and `Scheduler` API for Paper, Folia, Bukkit, Velocity and BungeeCord
- **Gradle plugin** - Picks the adapter and modules, writes the dependency manifest and `plugin.yml`, configures Shadow and starts a dev server with your plugin and plugins from Modrinth, Hangar, GitHub or Jenkins

## Modules

Quark is split into small artifacts under the `org.bxteam.quark` group. The Gradle plugin adds them for you; without it you pick them from the [BOM](/docs/quark/getting-started/installation#without-the-gradle-plugin).

| Module | What it does |
|--------|--------------|
| `quark-common` | `SemanticVersion` and the `QuarkLogger` contract. Comes with every other module |
| `quark-platform-api` | `Platform`, `Scheduler` and `PlatformVersion`. Comes with every adapter |
| `quark-paper`, `quark-bukkit`, `quark-velocity`, `quark-bungee` | Platform adapters, one per server |
| `quark-dependency` | `LibraryManager`: resolves, downloads, relocates and loads Maven dependencies |
| `quark-config` | `QuarkConfig`, serializers, migrations and the validation hook |
| `quark-config-yaml` | The YAML format for configs |
| `quark-config-validator` | `@NotNull`, `@Min`, `@Max`, `@Pattern` and `@Check` |
| `quark-config-serdes-bukkit` | ItemStack, Location, Sound, Component and other Bukkit types in configs |
| `quark-logger` | SLF4J and Log4j adapters for `QuarkLogger` and a global debug switch |
| `quark-update` | `UpdateChecker` and its providers |
| `quark-bom` | Pins every module to one version |

Library modules (`quark-dependency`, `quark-config`, `quark-update`, ...) never depend on a server API. They talk to the world through plain JDK types such as `Executor` and `Path`, so the same artifact works on every platform.

## Requirements

- **Java**: 17 or newer
- **Gradle**: 8.14 or newer, with the [Shadow](https://gradleup.com/shadow/) plugin
- **Server**: Paper, Folia, Spigot, Velocity or BungeeCord, see [Supported Platforms](/docs/quark/getting-started/supported-platforms)

::callout{type="info" title="Coming from Quark 1.x?"}
  Quark 2.0 changes the artifacts, the Gradle plugin and the way the library manager is created. Read [Migrating from 1.x](/docs/quark/migration/from-1x) before updating.
::

## Plugins that use Quark

- [NDailyRewards](https://github.com/BX-Team/NDailyRewards) - Bukkit
- [RediVelocity](https://github.com/byPixelTV/RediVelocity) - Velocity

::callout{type="idea"}
  Want to showcase your plugin, or have questions and suggestions? Join our [Discord server](https://discord.gg/qNyybSSPm5).
::
