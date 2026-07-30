---
icon: FolderDot
title: System Properties
description: A comprehensive list of system properties available in DivineMC, including their descriptions and default values.
---

## Command Line Arguments

These arguments should be specified after the `-jar` file in your startup command.

| Argument | Description | Default Value |
|----------|-------------|---------------|
| `-help-location="<path-to-file>"` | Location of the help file | `help.yml` |
| `-banned-players="<path-to-file>"` | Location of banned players file | `banned-players.json` |
| `-banned-ips="<path-to-file>"` | Location of banned IPs file | `banned-ips.json` |
| `-whitelist="<path-to-file>"` | Location of whitelist file | `whitelist.json` |
| `-ops="<path-to-file>"` | Location of operators file | `ops.json` |
| `-console-history="<path-to-file>"` | Location of console history file | `.console_history` |

### Examples

```bash
# Configure custom file locations
java -jar divinemc.jar -banned-players="/path/to/banned.json" -whitelist="/path/to/whitelist.json"
```
