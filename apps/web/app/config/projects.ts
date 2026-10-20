import { findProject as findRegistered } from '@bx-team/projects';
import {
  Bell,
  Blocks,
  Cpu,
  Database,
  Download,
  Eye,
  FileCode2,
  Gamepad2,
  HardDrive,
  KeyRound,
  Layers,
  type LucideIcon,
  MonitorSmartphone,
  Network,
  Package,
  Palette,
  Plug,
  Route,
  ScrollText,
  Server,
  ShieldCheck,
  Snowflake,
  Timer,
  Workflow,
  Zap,
} from '@lucide/vue';
import type { CodeLang } from '~/lib/highlight';

export interface ProjectFeature {
  icon: LucideIcon;
  title: string;
  body: string;
  href?: string;
}

export interface ProjectPreview {
  src: string;
  alt: string;
  caption?: string;
}

export interface ProjectStart {
  label: string;
  title: string;
  body: string;
  code?: string;
  lang?: CodeLang;
  action?: { label: string; href: string };
}

export interface Project {
  slug: string;
  name: string;
  tag: string;
  summary: string;
  tagline: string;
  lede: string;
  repo: string;
  archived?: boolean;
  docs?: string;
  downloads?: string;
  channels?: { label: string; href: string }[];
  features: ProjectFeature[];
  previews: ProjectPreview[];
  start: ProjectStart[];
  benchmarks?: 'pending' | { docs: string };
}

/** Identity comes from the shared registry, so the site, the bot and the API agree on it. */
function site(key: string): Pick<Project, 'slug' | 'name' | 'repo' | 'docs'> {
  const project = findRegistered(key);
  if (!project) throw new Error(`'${key}' is not in @bx-team/projects`);
  return {
    slug: project.key,
    name: project.name,
    repo: project.repo,
    docs: project.docs ? `/docs/${project.key}` : undefined,
  };
}

export const PROJECTS: Project[] = [
  {
    ...site('divinemc'),
    tag: 'Server software',
    summary: 'Multi-functional fork of Purpur, which focuses on the flexibility of your server and its optimization.',
    tagline: 'A Purpur fork that puts every core to work',
    lede: 'Regionized chunk ticking, parallel worlds and async everything, on top of the full Purpur configuration surface. Your Bukkit, Spigot and Paper plugins keep working.',
    downloads: '/downloads/divinemc',
    channels: [{ label: 'MCJars', href: 'https://mcjars.app/DIVINEMC/versions' }],
    features: [
      {
        icon: Layers,
        title: 'Regionized chunk ticking',
        body: 'Chunks tick in parallel across regions, similar to how Folia does it, without giving up plugin compatibility.',
        href: '/docs/divinemc/features/regionized-chunk-ticking',
      },
      {
        icon: Cpu,
        title: 'Parallel world ticking',
        body: 'Each world ticks on its own thread, so the Nether and the End stop queueing behind the overworld.',
        href: '/docs/divinemc/features/parallel-world-ticking',
      },
      {
        icon: Workflow,
        title: 'Parallel sensor phase',
        body: 'The expensive read-only part of mob AI — entity scans, line-of-sight checks — runs on a thread pool.',
        href: '/docs/divinemc/features/parallel-sensor-phase',
      },
      {
        icon: Eye,
        title: 'Raytrace entity culling',
        body: 'Entities a player provably cannot see are never sent, saving bandwidth and blinding entity-ESP cheats.',
        href: '/docs/divinemc/features/raytrace-entity-culling',
      },
      {
        icon: Route,
        title: 'Async operations',
        body: 'Pathfinding, the entity tracker, mob spawning, joining, chunk sending and portal pre-loading move off the main thread.',
        href: '/docs/divinemc/features/parallel-entity-tracker',
      },
      {
        icon: KeyRound,
        title: 'Secure seed',
        body: 'A 1024-bit seed in place of the standard 64-bit one, so structures and ores cannot be cracked from the world.',
      },
      {
        icon: HardDrive,
        title: 'Linear region format',
        body: 'Store worlds in the V1/V2 linear format or the new buffered one instead of Anvil.',
      },
      {
        icon: Gamepad2,
        title: 'Mod protocols',
        body: "Server-side support for Syncmatica, AppleSkin, Jade and Xaero's Map.",
      },
      {
        icon: ShieldCheck,
        title: 'Sentry integration',
        body: 'Detailed error tracking and monitoring, originally from Pufferfish.',
        href: '/docs/divinemc/guides/setting-up-sentry',
      },
    ],
    previews: [],
    start: [
      {
        label: 'Run a server',
        title: 'Download the jar',
        body: 'Grab the latest build and start it with the command below. DivineMC needs Java 25 or newer.',
        code: 'java -Xms4096M -Xmx4096M --add-modules=jdk.incubator.vector -jar server.jar --nogui',
        lang: 'bash',
        action: { label: 'Download DivineMC', href: '/downloads/divinemc' },
      },
      {
        label: 'Build a plugin',
        title: 'Compile against the API',
        body: 'The DivineMC API is a superset of Paper’s, published to the BX Team snapshots repository.',
        code: 'repositories {\n    maven("https://repo.bxteam.org/snapshots")\n}\n\ndependencies {\n    compileOnly("org.bxteam.divinemc:divinemc-api:26.2.build.+")\n}',
        lang: 'kotlin',
        action: { label: 'Using the API', href: '/docs/divinemc/development/using-api' },
      },
    ],
    benchmarks: { docs: '/docs/divinemc/benchmarks' },
  },
  {
    ...site('quark'),
    tag: 'Framework',
    summary:
      'Small modular framework for Minecraft plugins: runtime dependencies, annotated configs, update checks and dev servers.',
    tagline: 'The parts every plugin needs, as modules you pick',
    lede: 'Download dependencies when the plugin starts, keep configs in annotated classes, check for updates and run a test server straight from Gradle. Every module is optional and relocated into your own package.',
    channels: [{ label: 'Gradle Plugin Portal', href: 'https://plugins.gradle.org/plugin/org.bxteam.quark' }],
    features: [
      {
        icon: Download,
        title: 'Runtime dependencies',
        body: 'Libraries are downloaded, resolved transitively and loaded when the plugin starts, so the jar stays small.',
        href: '/docs/quark/dependencies/loading-dependencies',
      },
      {
        icon: Package,
        title: 'Relocation',
        body: 'Quark and your libraries move into the plugin’s package, so the server’s own copy of Gson or Guava never wins.',
        href: '/docs/quark/dependencies/relocation',
      },
      {
        icon: FileCode2,
        title: 'Annotated configs',
        body: 'Plain classes saved as YAML in field order, with comments, validation, migrations and Bukkit types.',
        href: '/docs/quark/configs/creating-configs',
      },
      {
        icon: Bell,
        title: 'Update checks',
        body: 'Modrinth, Hangar, GitHub, SpigotMC or any JSON endpoint, with a console message and a join notification.',
        href: '/docs/quark/utilities/update-checker',
      },
      {
        icon: Server,
        title: 'Platform adapters',
        body: 'One Platform and Scheduler API for Paper, Folia, Bukkit, Velocity and BungeeCord.',
        href: '/docs/quark/getting-started/supported-platforms',
      },
      {
        icon: Blocks,
        title: 'Gradle plugin',
        body: 'Picks the adapter and modules, configures Shadow and starts a dev server with your plugin and others.',
        href: '/docs/quark/gradle-plugin/configuration',
      },
    ],
    previews: [],
    start: [
      {
        label: 'Gradle',
        title: 'Apply the plugin',
        body: 'Pick the platform and the modules you need, then declare runtime dependencies in the quark configuration.',
        code: 'plugins {\n    id("com.gradleup.shadow") version "9.1.0"\n    id("org.bxteam.quark") version "2.0.0"\n}\n\nquark {\n    platform = ServerPlatform.PAPER\n    modules(QuarkModule.DEPENDENCY, QuarkModule.CONFIG)\n}\n\ndependencies {\n    quark("com.zaxxer:HikariCP:7.1.0")\n}',
        lang: 'kotlin',
        action: { label: 'Installation guide', href: '/docs/quark/getting-started/installation' },
      },
      {
        label: 'Dev server',
        title: 'Run a test server',
        body: 'Quark downloads the server, installs your plugin and the plugins you list, and starts it in your terminal.',
        code: './gradlew runServer',
        lang: 'bash',
        action: { label: 'Dev servers', href: '/docs/quark/gradle-plugin/dev-servers' },
      },
    ],
  },
  {
    ...site('ndailyrewards'),
    tag: 'Plugin',
    summary:
      'Simple and lightweight plugin that allows you to reward your players for playing on your server every day.',
    tagline: 'Reward players for coming back every day',
    lede: 'A daily reward streak with a GUI you can reshape completely, MariaDB or SQLite storage, and actions for anything a reward should do.',
    channels: [
      { label: 'Modrinth', href: 'https://modrinth.com/plugin/ndailyrewards' },
      { label: 'Hangar', href: 'https://hangar.papermc.io/BX-Team/NDailyRewards' },
    ],
    features: [
      {
        icon: Database,
        title: 'MariaDB and SQLite',
        body: 'Keep streaks in a local SQLite file or share them across a network through MariaDB.',
        href: '/docs/ndailyrewards/configuration/config',
      },
      {
        icon: Palette,
        title: 'Custom GUI',
        body: 'Every slot of the reward menu is configurable, including custom model data, item models and player heads.',
      },
      {
        icon: Zap,
        title: 'Reward actions',
        body: 'Commands, messages, sounds and more — a reward is a list of actions, not a fixed item.',
      },
      {
        icon: Plug,
        title: 'PlaceholderAPI',
        body: 'Streaks, cooldowns and claim state exposed as placeholders for scoreboards and menus.',
        href: '/docs/ndailyrewards/configuration/placeholders',
      },
      {
        icon: Bell,
        title: 'Join notifications',
        body: 'Remind players on join, or open the reward menu for them automatically, and claim on their behalf if you prefer.',
      },
      {
        icon: Timer,
        title: 'Time management',
        body: 'Flexible cooldowns and reset times, with MiniMessage and ampersand colour codes in every message.',
      },
    ],
    previews: [],
    start: [
      {
        label: 'Install',
        title: 'Drop it into plugins/',
        body: 'Download from Modrinth or Hangar, put the jar in your plugins folder and restart. Spigot, Paper and Paper-based forks are supported.',
        action: { label: 'Configuration', href: '/docs/ndailyrewards/configuration/config' },
      },
      {
        label: 'Developer API',
        title: 'Listen to its events',
        body: 'NDailyRewards is published to the BX Team releases repository.',
        code: 'repositories {\n    maven("https://repo.bxteam.org/releases")\n}\n\ndependencies {\n    compileOnly("org.bxteam:ndailyrewards:3.4.1")\n}',
        lang: 'kotlin',
        action: { label: 'Events', href: '/docs/ndailyrewards/development/events' },
      },
    ],
  },
  {
    ...site('riven'),
    tag: 'Desktop app',
    summary: 'Native Minecraft launcher and modpack toolkit in pure Rust.',
    tagline: 'A Minecraft launcher that builds packs too',
    lede: 'Install a modpack from a link and get its updates on every launch — or build your own in the app or the CLI, publish it to GitHub Pages and run it headless on a server.',
    features: [
      {
        icon: Gamepad2,
        title: 'Full launcher',
        body: 'Instances, Microsoft and offline accounts, automatic Java, Vanilla, Fabric, Quilt, NeoForge and Forge.',
      },
      {
        icon: Download,
        title: 'Packs from a link',
        body: 'Modrinth modpacks, .mrpack, Prism exports and Riven packs; a pack updates itself before every launch.',
        href: '/docs/riven/cli/installing',
      },
      {
        icon: FileCode2,
        title: 'Developer mode',
        body: 'Content table, dependency tree, config editor, releases, git and a test instance in one window.',
        href: '/docs/riven/getting-started/first-pack',
      },
      {
        icon: ShieldCheck,
        title: 'Signed, fast updates',
        body: 'Release channels, a tiny pointer checked with ETag, content-addressed downloads and ed25519 signatures pinned on first install — no keys in links.',
        href: '/docs/riven/guides/signatures',
      },
      {
        icon: Server,
        title: 'Servers',
        body: 'riven install --side server --headless keeps a dedicated server on the latest release.',
        href: '/docs/riven/guides/servers',
      },
      {
        icon: Snowflake,
        title: 'Nix without packHash',
        body: 'lib.mkModpack fetches every file by the hash in riven.json — no fixed-output hash to bump.',
        href: '/docs/riven/guides/servers',
      },
    ],
    previews: [
      {
        src: '/projects/riven/instance.webp',
        alt: 'A modpack instance with its mods, kept up to date by the pack.',
        caption: 'Instances and their mods',
      },
      {
        src: '/projects/riven/developer.webp',
        alt: "Developer mode listing a pack's mods with sources, sides, groups and available updates.",
        caption: 'Developer mode',
      },
      {
        src: '/projects/riven/editor.webp',
        alt: 'A pack config open in the built-in editor next to the overrides tree.',
        caption: 'Config editor',
      },
      {
        src: '/projects/riven/releases.webp',
        alt: 'The releases page: version bump, signed build into a channel and the built releases.',
        caption: 'Releases',
      },
    ],
    start: [
      {
        label: 'Download',
        title: 'Grab a release',
        body: 'Installers for Windows, a DMG for macOS, AppImage, deb, rpm and Arch packages for Linux.',
        action: { label: 'Latest release', href: 'https://github.com/BX-Team/Riven/releases/latest' },
      },
      {
        label: 'CLI',
        title: 'Build a pack',
        body: 'The same binary works in the terminal.',
        code: 'riven init --mc 1.21.1 --loader neoforge\nriven add sodium\nriven build && riven deploy',
        lang: 'bash',
        action: { label: 'CLI reference', href: '/docs/riven/cli/overview' },
      },
    ],
  },
  {
    ...site('nyx'),
    tag: 'Desktop app',
    summary: 'Modern, lightweight desktop GUI for the Mihomo proxy core.',
    tagline: 'A desktop client for Mihomo, in pure Rust',
    lede: 'Manage profiles, proxy groups, rules and connections from a clean interface — with system proxy and TUN mode, a connection inspector and a built-in profile editor.',
    features: [
      {
        icon: Network,
        title: 'System proxy and TUN',
        body: 'Route one app or the whole machine; a helper service handles TUN mode after a one-time elevation.',
      },
      {
        icon: ScrollText,
        title: 'Connection inspector',
        body: 'Live connections grouped per process, with app icons, so you can see what is going where.',
      },
      {
        icon: FileCode2,
        title: 'Profile editor',
        body: 'Edit profiles, proxy groups and rules in the app instead of hand-editing YAML.',
      },
      {
        icon: MonitorSmartphone,
        title: 'Installer or portable',
        body: 'Windows installer or zip; deb, rpm, Arch package or a tarball on Linux.',
      },
      {
        icon: Snowflake,
        title: 'Nix flake',
        body: 'Run it with nix run, or use the NixOS module, which declares the service so TUN works without a password prompt.',
      },
      {
        icon: Zap,
        title: 'Lightweight',
        body: 'A single native gpui application — no Electron, no bundled browser.',
      },
    ],
    previews: [
      { src: '/projects/nyx/preview.webp', alt: 'Nyx connected over TUN, with the traffic statistics panel open.' },
    ],
    start: [
      {
        label: 'Download',
        title: 'Grab a release',
        body: 'Installers and portable builds for Windows and Linux are attached to every GitHub release.',
        action: { label: 'Latest release', href: 'https://github.com/BX-Team/Nyx/releases/latest' },
      },
      {
        label: 'Nix',
        title: 'Run it without installing',
        body: 'Prebuilt binaries are pushed to the bx-team Cachix.',
        code: 'nix run github:BX-Team/Nyx',
        lang: 'bash',
      },
    ],
  },
];

export function findProject(slug: string): Project | undefined {
  return PROJECTS.find(p => p.slug === slug);
}
