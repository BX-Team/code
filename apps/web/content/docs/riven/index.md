---
icon: MessageCircleQuestion
title: About Riven
description: What Riven is, what it does and who it is for.
---

## What is Riven?

Riven is a native Minecraft launcher and modpack toolkit written in pure Rust. One binary, `riven`, is both: started without arguments it opens the launcher, started with a subcommand it works in the terminal.

Packs are described by a single `riven.json` with pinned versions and hashes. You never edit it by hand — the launcher's developer mode and the CLI do it for you, and both call the same code.

## Key Features

- **Launcher** - Instances, Microsoft and offline accounts, automatic Java, Vanilla / Fabric / Quilt / NeoForge / Forge
- **Modpacks from a link** - Modrinth modpacks, `.mrpack`, Prism exports and Riven packs; a pack updates itself before every launch
- **Sources** - Modrinth, GitHub Releases, direct URLs and local files, with dependency resolution and conflict checks
- **Fast updates** - Release channels and a tiny pointer file checked with ETag, so an unchanged pack costs one small request
- **Signed releases** - ed25519 signatures, pinned on first install
- **Static hosting** - A built pack is plain files; `riven deploy` puts it on GitHub Pages
- **Servers** - Headless `riven install --side server`, or a Nix library that builds the pack without a fixed-output hash
- **Export** - `.mrpack`, Prism instance archives and `.riven` files

## Who is Riven for?

- **Players** install a pack from a link or a file and get its updates on every launch.
- **Pack authors** build packs in the launcher's developer mode or with the CLI, keep `riven.json` in git and publish releases without a server.
- **Server owners** install and update the same pack headless, or declare it in Nix.

::callout{type="idea"}
  If you have any questions, suggestions or issues, feel free to join our [Discord server](https://discord.gg/qNyybSSPm5) and ask for help.
::
