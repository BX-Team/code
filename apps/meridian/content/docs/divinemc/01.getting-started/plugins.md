---
icon: Blocks
title: Adding Plugins
description: Extend your server with trusted plugins
---

## Introduction

Plugins are a great way to extend your server with new features. They allow you to customize game mechanics and add new commands or game modes. In this guide, we will go over the basics of plugins and how to install them.

## Trusted Sources

For security and reliability, only install plugins from reputable sources:

- [Modrinth](https://modrinth.com/plugins) (recommended)
- [Hangar](https://hangar.papermc.io) (recommended)
- [SpigotMC](https://www.spigotmc.org/resources)
- [BukkitDev](https://dev.bukkit.org/bukkit-plugins)
- Official GitHub repositories

## Installing Plugins

::steps
:::step
Obtain the plugin's `.jar` file from a trusted source. If the plugin is provided as a `.zip`, extract the `.jar` prior to installation.
:::

:::step
Place the downloaded `.jar` file into the `plugins` folder located in your server's root directory.
:::

:::step
Restart the server to load the new plugin.
:::

:::step
Execute the `/plugins` command in-game or via the console. A **green** listing indicates that the plugin loaded successfully, while a **red** listing signals an error.
:::
::

## Troubleshooting

Below are common issues you might encounter when installing plugins along with recommended solutions:

::callout{type="error" title="Missing Dependencies"}
Caused if the plugin requires other plugins to function.

```log
[00:00:00] [Server thread/WARN] Could not load 'plugins/SomePlugin.jar' in folder 'plugins'
[00:00:00] [Server thread/WARN] org.bukkit.plugin.UnknownDependencyException: Unknown/missing dependency plugins: [DependencyPlugin]. Please download and install these plugins to run 'SomePlugin'.
```

Install the required dependency plugins as specified in the plugin's documentation.
::

::callout{type="error" title="Invalid Plugin File"}
Caused if the plugin is either:

1. Intended for a different modding platform (such as Forge or Fabric).
2. Corrupted or incomplete due to network issues, transferring in ASCII mode instead of binary, or downloading an error page.

```log
[00:00:00] [Server thread/WARN] Could not load 'plugins/ExamplePlugin.jar' in folder 'plugins'
[00:00:00] [Server thread/WARN] org.bukkit.plugin.InvalidDescriptionException: Invalid plugin.yml
```

Re-download the plugin file and verify that it is compatible with your server version.
::

::callout{type="error" title="Duplicate Plugins"}
Caused if the plugin is installed in multiple versions.

```log
[00:00:00] [Server thread/WARN] Ambiguous plugin name `Essentials' for files 'plugins/EssentialsX-2.19.4.jar' and 'plugins/EssentialsX-2.20.0-dev.jar' in 'plugins'
```

Remove duplicate versions by keeping only one version of each plugin. Delete older or conflicting versions, then restart your server.
::

::callout{type="error" title="Incompatible Java Version"}
Caused if the plugin is compiled with a newer Java version than installed on the server.

```log
[00:00:00] [Server thread/WARN] Could not load 'plugins/ExamplePlugin.jar' in folder 'plugins'
[00:00:00] [Server thread/WARN] java.lang.UnsupportedClassVersionError: ExamplePlugin has been compiled by a more recent Java Runtime (class file version 67.0), this version only recognizes class file versions up to 66.0
```

Update your server's Java version or request a compatible build from the plugin developer.
::
