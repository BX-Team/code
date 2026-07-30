---
icon: Files
title: Configuration
description: This page details the various configuration settings exposed by NDailyRewards plugin.
---

::callout{type="warning"}
  Configuration values may change with plugin updates. If you cannot find what you're looking for or think something may be wrong, contact us through our [Discord](https://discord.gg/qNyybSSPm5) server.
::

## Configuration Viewer

::NdailyRewardsConfig
::

## Config modifications

You can use some new features in the config file, like HEX colors, custom model data, and more.

### HEX Colors

In addition to the standard colors defined using the `&` symbols, more detailed colors can be utilized through HEX coding. You can employ the following format within any text: **#ffffff** - representing the color white.

::callout{type="idea"}
  You can use [this](https://colorpicker.me) website to pick HEX colors.
::

### Gradient

To apply a gradient effect, you can use this simple format:

`<#00FF00>Text with gradient</#FFFF00>`

::callout{type="idea"}
  You can use alternative method to create gradient text by using [this](https://www.birdflop.com/resources/rgb/) website.
::

### Custom Model Data

You can use custom model data in the GUI configuration. This feature allows you to use custom textures for items in the GUI. To use this feature, you need to change `material` field.

```yaml
gui:
  reward:
    title: "&6Daily Rewards"
    size: 27
    display:
      available:
        material: "CustomModel[<MATERIAL>:<QUANTITY>]{INT}" // [!code highlight]
        name: "&aDay <dayNum>"
        lore:
          - "&7Your Reward Awaits"
          - "&7Click Me to claim your prize!"
          - ""
          - "<reward-lore>"
```

### Custom player head textures

You can use custom head textures in the GUI configuration. This feature allows you to set custom head for items in the GUI. To use this feature, you need to change `material` field. Plugin have some other types of custom player heads:

- **URL** - Link to head texture
- **UUID** - UUID of player
- **BASE64** - Base64 texture string

```yaml
gui:
  reward:
    title: "&6Daily Rewards"
    size: 27
    display:
      available:
        material: "CustomSkull[PLAYER_HEAD:1]{URL:https://textures.minecraft.net/texture/dba489a53d9465f33836355ad09c22d5d2593e61bfab45fc19062a751c4005a2}" // [!code highlight]
        name: "&aDay <dayNum>"
        lore:
          - "&7Your Reward Awaits"
          - "&7Click Me to claim your prize!"
          - ""
          - "<reward-lore>"
```

### Custom GUI Buttons

You can use custom GUI buttons in the GUI configuration and add actions to it as in rewards. To use this feature, you need to change `custom` field.

```yaml
gui:
  reward:
    ...

    # Custom GUI items
    custom:
      example:
        position: 26
        material: "DIAMOND:1"
        name: "&6Example"
        lore:
          - "&7This is an example button"
        actions:
          - "[message] &6You clicked the example button!"
          - "[sound] ENTITY_EXPERIENCE_ORB_PICKUP:1:1"
```

In material field you can use all modifications that was written above.
