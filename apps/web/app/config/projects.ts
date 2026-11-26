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

/** A project's words live in the locale files under `projects.<slug>`; features and start tabs by their `id`. */
export interface ProjectFeature {
  id: string;
  icon: LucideIcon;
  href?: string;
}

/** Alt text and caption are `projects.<slug>.previews.<id>.alt` and `.caption`. */
export interface ProjectPreview {
  id: string;
  src: string;
  caption?: boolean;
}

/** A line of the terminal a showcase card draws in place of a screenshot. */
export interface TerminalLine {
  text: string;
  kind?: 'command' | 'comment' | 'add' | 'remove' | 'ok' | 'dim';
}

export interface ProjectDemo {
  /** The wasm-bindgen module; it finds its `_bg.wasm` next to itself. */
  script: string;
  /** What the window shows, for the frame before it starts. */
  title: string;
  /** The size the interface is laid out at; narrower screens get it scaled down. */
  width: number;
  height: number;
}

/** A "Get started" tab: `label`, `title`, `body` and the button's `action` are in the locale files. */
export interface ProjectStart {
  id: string;
  code?: string;
  lang?: CodeLang;
  href?: string;
}

export interface Project {
  slug: string;
  name: string;
  repo: string;
  archived?: boolean;
  /** Where the home page shows it: the wide flagship card, a half card with its first preview, or a small tile. */
  home: 'flagship' | 'showcase' | 'tile';
  docs?: string;
  downloads?: string;
  /** Published only as GitHub releases; `/downloads/<slug>` reads them from GitHub. */
  githubReleases?: boolean;
  channels?: { label: string; href: string }[];
  features: ProjectFeature[];
  previews: ProjectPreview[];
  /** Shown by the home showcase card when there is no screenshot to show. */
  terminal?: TerminalLine[];
  /** A raster logo, for a project whose mark is not one of the pixel logos in `lib/marks.ts`. */
  logo?: string;
  /** A build of the app's interface for the browser, in `public/`, started on the project page by a click. */
  demo?: ProjectDemo;
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
    home: 'flagship',
    downloads: '/downloads/divinemc',
    logo: '/projects/divinemc/logo.png',
    channels: [{ label: 'MCJars', href: 'https://mcjars.app/DIVINEMC/versions' }],
    features: [
      {
        icon: Layers,
        id: 'regionized-chunk-ticking',
        href: '/docs/divinemc/features/regionized-chunk-ticking',
      },
      {
        icon: Cpu,
        id: 'parallel-world-ticking',
        href: '/docs/divinemc/features/parallel-world-ticking',
      },
      {
        icon: Workflow,
        id: 'parallel-sensor-phase',
        href: '/docs/divinemc/features/parallel-sensor-phase',
      },
      {
        icon: Eye,
        id: 'raytrace-entity-culling',
        href: '/docs/divinemc/features/raytrace-entity-culling',
      },
      {
        icon: Route,
        id: 'async-operations',
        href: '/docs/divinemc/features/parallel-entity-tracker',
      },
      {
        icon: KeyRound,
        id: 'secure-seed',
      },
      {
        icon: HardDrive,
        id: 'linear-region-format',
      },
      {
        icon: Gamepad2,
        id: 'mod-protocols',
      },
      {
        icon: ShieldCheck,
        id: 'sentry-integration',
        href: '/docs/divinemc/guides/setting-up-sentry',
      },
    ],
    previews: [],
    start: [
      {
        id: 'run-a-server',
        code: 'java -Xms4096M -Xmx4096M --add-modules=jdk.incubator.vector -jar server.jar --nogui',
        lang: 'bash',
        href: '/downloads/divinemc',
      },
      {
        id: 'build-a-plugin',
        code: 'repositories {\n    maven("https://repo.bxteam.org/snapshots")\n}\n\ndependencies {\n    compileOnly("org.bxteam.divinemc:divinemc-api:26.3.build.+")\n}',
        lang: 'kotlin',
        href: '/docs/divinemc/development/using-api',
      },
    ],
    benchmarks: { docs: '/docs/divinemc/benchmarks' },
  },
  {
    ...site('quark'),
    home: 'tile',
    channels: [{ label: 'Gradle Plugin Portal', href: 'https://plugins.gradle.org/plugin/org.bxteam.quark' }],
    features: [
      {
        icon: Download,
        id: 'runtime-dependencies',
        href: '/docs/quark/dependencies/loading-dependencies',
      },
      {
        icon: Package,
        id: 'relocation',
        href: '/docs/quark/dependencies/relocation',
      },
      {
        icon: FileCode2,
        id: 'annotated-configs',
        href: '/docs/quark/configs/creating-configs',
      },
      {
        icon: Bell,
        id: 'update-checks',
        href: '/docs/quark/utilities/update-checker',
      },
      {
        icon: Server,
        id: 'platform-adapters',
        href: '/docs/quark/getting-started/supported-platforms',
      },
      {
        icon: Blocks,
        id: 'gradle-plugin',
        href: '/docs/quark/gradle-plugin/configuration',
      },
    ],
    previews: [],
    start: [
      {
        id: 'gradle',
        code: 'plugins {\n    id("com.gradleup.shadow") version "9.1.0"\n    id("org.bxteam.quark") version "2.0.0"\n}\n\nquark {\n    platform = ServerPlatform.PAPER\n    modules(QuarkModule.DEPENDENCY, QuarkModule.CONFIG)\n}\n\ndependencies {\n    quark("com.zaxxer:HikariCP:7.1.0")\n}',
        lang: 'kotlin',
        href: '/docs/quark/getting-started/installation',
      },
      {
        id: 'dev-server',
        code: './gradlew runServer',
        lang: 'bash',
        href: '/docs/quark/gradle-plugin/dev-servers',
      },
    ],
  },
  {
    ...site('ndailyrewards'),
    home: 'tile',
    channels: [
      { label: 'Modrinth', href: 'https://modrinth.com/plugin/ndailyrewards' },
      { label: 'Hangar', href: 'https://hangar.papermc.io/BX-Team/NDailyRewards' },
    ],
    features: [
      {
        icon: Database,
        id: 'mariadb-and-sqlite',
        href: '/docs/ndailyrewards/configuration/config',
      },
      {
        icon: Palette,
        id: 'custom-gui',
      },
      {
        icon: Zap,
        id: 'reward-actions',
      },
      {
        icon: Plug,
        id: 'placeholderapi',
        href: '/docs/ndailyrewards/configuration/placeholders',
      },
      {
        icon: Bell,
        id: 'join-notifications',
      },
      {
        icon: Timer,
        id: 'time-management',
      },
    ],
    previews: [],
    start: [
      {
        id: 'install',
        href: '/docs/ndailyrewards/configuration/config',
      },
      {
        id: 'developer-api',
        code: 'repositories {\n    maven("https://repo.bxteam.org/releases")\n}\n\ndependencies {\n    compileOnly("org.bxteam:ndailyrewards:3.4.1")\n}',
        lang: 'kotlin',
        href: '/docs/ndailyrewards/development/events',
      },
    ],
  },
  {
    ...site('riven'),
    home: 'showcase',
    downloads: '/downloads/riven',
    githubReleases: true,
    features: [
      {
        icon: Gamepad2,
        id: 'full-launcher',
      },
      {
        icon: Download,
        id: 'packs-from-a-link',
        href: '/docs/riven/cli/installing',
      },
      {
        icon: FileCode2,
        id: 'developer-mode',
        href: '/docs/riven/getting-started/first-pack',
      },
      {
        icon: ShieldCheck,
        id: 'signed-fast-updates',
        href: '/docs/riven/guides/signatures',
      },
      {
        icon: Server,
        id: 'servers',
        href: '/docs/riven/guides/servers',
      },
      {
        icon: Snowflake,
        id: 'nix-without-packhash',
        href: '/docs/riven/guides/servers',
      },
    ],
    previews: [],
    logo: '/projects/riven/logo.png',
    demo: {
      script: '/demo/riven/riven_demo.js',
      title: 'Riven Launcher',
      // The project page's container, so a desktop sees the window at its own size.
      width: 1176,
      height: 740,
    },
    // What `riven install` prints for an update (Riven's src/cli/sync.rs): the changes, the plan, the result.
    terminal: [
      { kind: 'command', text: 'riven install gh:owner/pack -y' },
      { text: '1.4.0 → 1.5.0' },
      { kind: 'add', text: '  + create-aeronautics, sable' },
      { kind: 'dim', text: '  ~ sodium, iris, jei' },
      { kind: 'remove', text: '  - rubidium' },
      { kind: 'dim', text: '  3 other files' },
      { text: 'Create Skies 1.5.0: 8 to install, 1 to remove, 344 up to date' },
      { kind: 'remove', text: '  - mods/rubidium-0.7.1.jar' },
      { kind: 'ok', text: '✓ Create Skies 1.5.0 installed in /home/steve/mc (8 files changed, 1 removed)' },
    ],
    start: [
      {
        id: 'download',
        href: '/downloads/riven',
      },
      {
        id: 'cli',
        code: 'riven init --mc 1.21.1 --loader neoforge\nriven add sodium\nriven build && riven deploy',
        lang: 'bash',
        href: '/docs/riven/cli/overview',
      },
    ],
  },
  {
    ...site('nyx'),
    home: 'showcase',
    downloads: '/downloads/nyx',
    githubReleases: true,
    features: [
      {
        icon: Network,
        id: 'system-proxy-and-tun',
      },
      {
        icon: ScrollText,
        id: 'connection-inspector',
      },
      {
        icon: FileCode2,
        id: 'profile-editor',
      },
      {
        icon: MonitorSmartphone,
        id: 'installer-or-portable',
      },
      {
        icon: Snowflake,
        id: 'nix-flake',
      },
      {
        icon: Zap,
        id: 'lightweight',
      },
    ],
    previews: [],
    terminal: [
      { kind: 'comment', text: '# Any Linux with Nix' },
      { kind: 'command', text: 'nix run github:BX-Team/Nyx' },
      { kind: 'comment', text: '# Debian, Ubuntu' },
      { kind: 'command', text: 'sudo apt install ./Nyx_<version>_amd64.deb' },
      { kind: 'comment', text: '# Fedora' },
      { kind: 'command', text: 'sudo dnf install ./Nyx-<version>.x86_64.rpm' },
      { kind: 'comment', text: '# Arch' },
      { kind: 'command', text: 'sudo pacman -U ./Nyx-<version>-x86_64.pkg.tar.xz' },
    ],
    start: [
      {
        id: 'download',
        href: '/downloads/nyx',
      },
    ],
  },
  {
    ...site('vanilla-reimagined'),
    home: 'tile',
    channels: [{ label: 'Modrinth', href: 'https://modrinth.com/modpack/vred' }],
    features: [
      {
        icon: Zap,
        id: 'performance',
      },
      {
        icon: Palette,
        id: 'visual-features',
      },
      {
        icon: Eye,
        id: 'optifine-like-features',
      },
      {
        icon: Blocks,
        id: 'quality-of-life',
      },
    ],
    previews: [],
    start: [
      {
        id: 'install',
        href: 'https://modrinth.com/modpack/vred',
      },
      {
        id: 'contribute',
        href: 'https://github.com/BX-Team/Vanilla-Reimagined/blob/master/CONTRIBUTING.md',
      },
    ],
  },
];

export function findProject(slug: string): Project | undefined {
  return PROJECTS.find(p => p.slug === slug);
}
