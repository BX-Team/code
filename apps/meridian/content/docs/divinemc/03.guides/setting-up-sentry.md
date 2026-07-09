---
icon: MonitorCog
title: Setting up Sentry
description: A basic guide to setting up Sentry integration with DivineMC.
---

## Setting up Sentry Integration

::steps
:::step{title="Prerequisites"}
1. **Sentry Account:** You need an account on [sentry.io](https://sentry.io/). They offer free tiers suitable for many servers.
2. **Sentry Project:** Create a new project within your Sentry organization. When asked for the platform, choose **Java**. If Java isn't immediately visible, select "Other" or search for it.
3. **DSN (Data Source Name):** Once your project is created, navigate to its settings. Under **Client Keys (DSN)** copy the DSN string, which looks like:

```
https://xxxxxxxxxxxxxxxxxxxxxxxx@o######.ingest.sentry.io/#######
```
:::

:::step{title="Configuration"}
Open `divinemc.yml` in the root of your server directory and locate the `sentry:` block:

```yaml
sentry:
  dsn: ''
  log-level: WARN
  only-log-thrown: true
```

Configure the settings:

- **`dsn`:** Replace the empty quotes with your DSN string.
- **`log-level`:** Choose severity threshold — `ERROR`, `WARN`, `INFO`, or `DEBUG`. Default is `WARN`.
- **`only-log-thrown`:** Set to `true` to only send logs with a Java `Throwable` (recommended). Set to `false` to send any log at or above the threshold.
:::

:::step{title="Save & Restart"}
Save `divinemc.yml` and restart your server. Sentry is now integrated and will capture errors and logs based on your configuration.
:::
::

## Troubleshooting

- **Errors not appearing?** Confirm the DSN is correct and in quotes. Ensure your firewall allows outbound connections to `ingest.sentry.io:443`.
- **Too much noise?** Raise `log-level` to `ERROR` and ensure `only-log-thrown` is `true`.
