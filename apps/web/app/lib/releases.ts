import { type RestRelease, RestReleaseListSchema } from '@bx-team/types/schema/github';

export type { RestRelease };

/** In dev the Nitro proxy adds `GITHUB_TOKEN`; in production each visitor spends their own anonymous quota. */
export const GITHUB_API = import.meta.dev ? '/gh' : 'https://api.github.com';

/** Desktop apps publish on GitHub only; the browser reads their releases straight from the REST API. */
export async function fetchGithubReleases(repo: string, perPage = 20): Promise<RestRelease[]> {
  const raw = await $fetch(`${GITHUB_API}/repos/${repo}/releases`, {
    query: { per_page: perPage },
    headers: { Accept: 'application/vnd.github+json' },
  });
  return RestReleaseListSchema.parse(raw).filter(release => !release.draft);
}

export type Platform = 'windows' | 'macos' | 'linux' | 'cli';

export const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'windows', label: 'Windows' },
  { id: 'macos', label: 'macOS' },
  { id: 'linux', label: 'Linux' },
  { id: 'cli', label: 'Command line' },
];

export interface ReleaseFile {
  name: string;
  url: string;
  size: number;
  platform: Platform;
  /** What the file is, in words a user picks by: "Installer", "Debian / Ubuntu". */
  kind: string;
  /** The extension the kind is recognised by, shown beside it. */
  ext: string;
  arch: 'x64' | 'arm64' | null;
  /** Ranks files inside a platform: the one most people want comes first. */
  rank: number;
}

const FORMATS: { test: RegExp; platform: Exclude<Platform, 'cli'>; kind: string; ext: string; rank: number }[] = [
  { test: /setup.*\.exe$|\.exe$/i, platform: 'windows', kind: 'Installer', ext: '.exe', rank: 0 },
  { test: /\.msi$/i, platform: 'windows', kind: 'Installer', ext: '.msi', rank: 1 },
  { test: /windows.*\.zip$/i, platform: 'windows', kind: 'Portable', ext: '.zip', rank: 2 },
  { test: /\.dmg$/i, platform: 'macos', kind: 'Disk image', ext: '.dmg', rank: 0 },
  { test: /\.app\.tar\.gz$/i, platform: 'macos', kind: 'App bundle', ext: '.app.tar.gz', rank: 1 },
  { test: /\.appimage$/i, platform: 'linux', kind: 'AppImage', ext: '.AppImage', rank: 0 },
  { test: /\.deb$/i, platform: 'linux', kind: 'Debian / Ubuntu', ext: '.deb', rank: 1 },
  { test: /\.rpm$/i, platform: 'linux', kind: 'Fedora / openSUSE', ext: '.rpm', rank: 2 },
  { test: /\.pkg\.tar\.(zst|xz)$/i, platform: 'linux', kind: 'Arch Linux', ext: '.pkg.tar', rank: 3 },
  { test: /linux.*\.tar\.gz$/i, platform: 'linux', kind: 'Tarball', ext: '.tar.gz', rank: 4 },
];

function archOf(name: string): ReleaseFile['arch'] {
  if (/aarch64|arm64/i.test(name)) return 'arm64';
  if (/x86_64|amd64|x64/i.test(name)) return 'x64';
  return null;
}

/** Sorts a release's assets by what a person downloads them for; anything unrecognised is left out. */
export function classify(release: RestRelease): ReleaseFile[] {
  const files: ReleaseFile[] = [];
  for (const asset of release.assets) {
    const base = { name: asset.name, url: asset.browser_download_url, size: asset.size, arch: archOf(asset.name) };
    if (/-cli-/i.test(asset.name)) {
      const os = /windows/i.test(asset.name) ? 'Windows' : /macos|darwin/i.test(asset.name) ? 'macOS' : 'Linux';
      files.push({
        ...base,
        platform: 'cli',
        kind: os,
        ext: asset.name.endsWith('.zip') ? '.zip' : '.tar.gz',
        rank: 0,
      });
      continue;
    }
    const format = FORMATS.find(f => f.test.test(asset.name));
    if (format)
      files.push({ ...base, platform: format.platform, kind: format.kind, ext: format.ext, rank: format.rank });
  }
  return files.sort((a, b) => a.rank - b.rank || (a.arch === 'arm64' ? 1 : 0) - (b.arch === 'arm64' ? 1 : 0));
}

/** The visitor's own OS, so the page can lead with it; `null` on a phone or anything unknown. */
export function detectPlatform(): Exclude<Platform, 'cli'> | null {
  if (!import.meta.client) return null;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad/i.test(ua)) return null;
  if (/Windows/i.test(ua)) return 'windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macos';
  if (/Linux|X11/i.test(ua)) return 'linux';
  return null;
}
