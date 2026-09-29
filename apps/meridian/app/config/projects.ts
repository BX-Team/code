import {
  Bell,
  Blocks,
  Boxes,
  Cpu,
  Database,
  Download,
  Eye,
  FileCode2,
  Gamepad2,
  GitBranch,
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

export const PROJECTS: Project[] = [
  {
    slug: 'divinemc',
    name: 'DivineMC',
    tag: 'Server software',
    summary: 'Multi-functional fork of Purpur, which focuses on the flexibility of your server and its optimization.',
    tagline: 'A Purpur fork that puts every core to work',
    lede: 'Regionized chunk ticking, parallel worlds and async everything, on top of the full Purpur configuration surface. Your Bukkit, Spigot and Paper plugins keep working.',
    repo: 'BX-Team/DivineMC',
    docs: '/docs/divinemc',
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
    slug: 'quark',
    name: 'Quark',
    tag: 'Library',
    summary: 'Lightweight, runtime dependency management system for plugins running on Minecraft server platforms.',
    tagline: 'Load dependencies at startup, not at build time',
    lede: 'Quark downloads Maven dependencies when your plugin starts, resolves them transitively and loads them in isolation — no shading, no fat jars.',
    repo: 'BX-Team/Quark',
    docs: '/docs/quark',
    features: [
      {
        icon: Download,
        title: 'Runtime loading',
        body: 'Download and load Maven dependencies at runtime, without build-time configuration.',
      },
      {
        icon: GitBranch,
        title: 'Transitive resolution',
        body: 'Every dependency a dependency needs is resolved and loaded along with it.',
        href: '/docs/quark/advanced-usage/dependency-management',
      },
      {
        icon: Package,
        title: 'Package relocation',
        body: 'Relocate packages to avoid conflicts with other plugins or with the server’s own libraries.',
        href: '/docs/quark/advanced-usage/package-relocation',
      },
      {
        icon: Boxes,
        title: 'Isolated class loading',
        body: 'Load dependencies into their own class loaders, so two plugins can use two versions of one library.',
        href: '/docs/quark/advanced-usage/isolated-classloaders',
      },
      {
        icon: Blocks,
        title: 'Gradle plugin',
        body: 'A quark configuration next to implementation, with ShadowJar support built in.',
        href: '/docs/quark/getting-started/installation',
      },
      {
        icon: Server,
        title: 'Every platform',
        body: 'Dedicated implementations for Bukkit, BungeeCord, Fabric, Paper, Sponge and Velocity.',
        href: '/docs/quark/getting-started/supported-platforms',
      },
    ],
    previews: [],
    start: [
      {
        label: 'Gradle',
        title: 'Apply the plugin',
        body: 'Add the Gradle plugin, then declare runtime dependencies in the quark configuration.',
        code: 'plugins {\n    id("org.bxteam.quark") version "1.3.0"\n}\n\ndependencies {\n    quark("com.google.code.gson:gson:2.10.1")\n}',
        lang: 'kotlin',
        action: { label: 'Installation guide', href: '/docs/quark/getting-started/installation' },
      },
    ],
  },
  {
    slug: 'ndailyrewards',
    name: 'NDailyRewards',
    tag: 'Plugin',
    summary:
      'Simple and lightweight plugin that allows you to reward your players for playing on your server every day.',
    tagline: 'Reward players for coming back every day',
    lede: 'A daily reward streak with a GUI you can reshape completely, MariaDB or SQLite storage, and actions for anything a reward should do.',
    repo: 'BX-Team/NDailyRewards',
    docs: '/docs/ndailyrewards',
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
    slug: 'nyx',
    name: 'Nyx',
    tag: 'Desktop app',
    summary: 'Modern, lightweight desktop GUI for the Mihomo proxy core.',
    tagline: 'A desktop client for Mihomo, in pure Rust',
    lede: 'Manage profiles, proxy groups, rules and connections from a clean interface — with system proxy and TUN mode, a connection inspector and a built-in profile editor.',
    repo: 'BX-Team/Nyx',
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
