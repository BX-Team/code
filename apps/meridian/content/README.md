# Meridian Content

Source content for the [BX Team website](https://bxteam.org) — documentation, legal pages, and product roadmaps. Pages are written in Markdown with [MDC](https://content.nuxt.com/docs/files/markdown) (Markdown Components) and rendered by the `meridian` Nuxt 4 app via [Nuxt Content](https://content.nuxt.com).

## Collections

Content is split into three collections, declared in [`apps/meridian/content.config.ts`](../content.config.ts):

| Collection | Source           | Rendered at        |
|------------|------------------|--------------------|
| `docs`     | `docs/**/*.md`   | `/docs/…`          |
| `legal`    | `legal/**/*.md`  | `/legal/…`         |
| `roadmap`  | `roadmap/*.md`   | `/roadmap` cards   |

## Structure

```
docs/
├── divinemc/
│   ├── index.md                  ← project landing page
│   ├── 01.getting-started/
│   ├── 02.features/
│   └── ...
├── ndailyrewards/
└── quark/
legal/
├── privacy-policy.md
└── terms-of-use.md
roadmap/
└── pulsify.md
```

Under `docs/`, folders and files are ordered by their numeric prefix (`01.`, `02.`, …). The prefix is stripped from URLs — `01.getting-started/installation.md` becomes `/docs/divinemc/getting-started/installation`.

## Frontmatter

Frontmatter is validated per collection by the Zod schemas in `content.config.ts`. Fields other than `title` are optional unless noted.

**`docs`**

```yaml
---
title: Installation          # required — shown as the page heading
description: How to install  # shown below the heading and in SEO meta
icon: Download               # Lucide icon name — shown in the sidebar
badge: WIP                   # short label shown next to the sidebar item
---
```

**`legal`**

```yaml
---
title: Privacy Policy
description: How we handle your data
lastUpdated: 2026-07-09      # ISO date shown on the page
---
```

**`roadmap`** — data-driven; renders as roadmap cards rather than a prose page:

```yaml
---
title: Pulsify
slug: pulsify
icon: Activity               # Lucide icon
accent: "#6366f1"            # optional accent colour
order: 1                     # sort order among roadmaps
blurb: Server analytics, reimagined
items:
  - id: ingest
    title: Ingest gateway
    status: shipped          # planned | progress | review | shipped
    progress: 100            # optional, 0–100
    description: Optional details
---
```

Doc/roadmap icons come from [Lucide](https://lucide.dev/icons/). Use the PascalCase name as-is (e.g. `Keyboard`, `GitBranch`, `MonitorCog`) — values are case-sensitive.

## MDC Components

All components use the `::ComponentName` / `::` block syntax. **Do not use the HTML-like `<Component />` self-closing syntax** — the MDC parser may swallow content that follows it.

Component implementations live in [`apps/meridian/app/components/content/`](../app/components/content/).

---

### Callout

Highlighted notice box. Supports four visual styles.

```md
::callout{type="info"}
This is an informational note.
::

::callout{type="warn" title="Watch out"}
This might break things.
::

::callout{type="ok"}
Everything looks good.
::

::callout{type="error" title="Incompatible Java Version"}
You need Java 21 or newer.
::
```

**`type` aliases**

| Style   | Accepted values                                   |
|---------|---------------------------------------------------|
| `info`  | `info` *(default)*                                |
| `warn`  | `warn`, `warning`, `caution`                      |
| `ok`    | `ok`, `success`, `tip`, `check`, `idea`           |
| `error` | `error`, `danger`, `destructive`                  |

---

### Steps

Numbered step list for guides and tutorials.

```md
::steps
:::step{title="Download the jar"}
Visit the [Downloads page](/downloads/divinemc) and grab the latest build.
:::

:::step{title="Place it in your server folder"}
Move the jar into a fresh directory.
:::

:::step{title="Start the server"}
Run your startup script and accept the EULA.
:::
::
```

The outer `::steps` block uses two colons; each inner `:::step` block uses three. Steps are numbered automatically. You can also pass `n` manually: `:::step{n="4"}`.

---

### Code Group

Tabbed code block — one tab per fenced code block. The tab label comes from the `[Label]` after the language tag.

````md
::code-group
```kotlin [Gradle Kotlin]
implementation("org.bxteam:ndailyrewards:3.4.0")
```
```groovy [Gradle Groovy]
implementation "org.bxteam:ndailyrewards:3.4.0"
```
```xml [Maven]
<dependency>
  <groupId>org.bxteam</groupId>
  <artifactId>ndailyrewards</artifactId>
  <version>3.4.0</version>
</dependency>
```
::
````

---

### Config viewers

Interactive, searchable views of a project's full configuration reference. They take no arguments — the data is bundled with the component.

```md
::DivineMcConfig
::

::NdailyRewardsConfig
::
```

---

## Code Blocks

Standard fenced code blocks work as usual. Nuxt Content uses [Shiki](https://shiki.style) for syntax highlighting — use any language identifier Shiki supports.

````md
```yaml
async:
  parallel-world-ticking:
    enable: false
```
````

You can also use Shiki [transformers](https://shiki.style/packages/transformers) for inline annotations:

````md
```yaml
eula: false # [!code --]
eula: true  # [!code ++]
port: 25565 # [!code highlight]
server-name: MyServer # [!code word:MyServer]
```
````

| Annotation              | Effect                        |
|-------------------------|-------------------------------|
| `# [!code --]`          | Red diff line (removed)       |
| `# [!code ++]`          | Green diff line (added)       |
| `# [!code highlight]`   | Highlighted line              |
| `# [!code word:text]`   | Highlighted word(s)           |
| `# [!code focus]`       | Focus this line, dim the rest |

> **Language note:** `[!code word:]` and other `#`-prefixed annotations only work in languages where `#` is a real comment character — `sh`, `bash`, `yaml`, `python`, etc. They are **silently ignored** in `bat`, `cmd`, `java`, `kotlin`, and similar languages where `#` carries no syntax meaning. Use `//` annotations in those languages instead (or omit the annotation entirely).

## Tips

- Keep one blank line before and after every `::block::` component.
- Nest components correctly: two-colon outer (`::steps`), three-colon inner (`:::step`).
- `icon` values are case-sensitive and must match the Lucide PascalCase name exactly.
- The `badge` field accepts short strings only — keep it to 3–4 characters (`WIP`, `New`, `v2`).
- Frontmatter is schema-validated at build time — a missing `title` or an unexpected field will fail `nuxt generate`.
