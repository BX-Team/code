export type BenchBuild = 'divinemc' | 'paper' | 'purpur';
export type BenchProfile = 'stock' | 'max' | 'rct' | 'parity';

export interface TickRow {
  build: BenchBuild;
  profile: BenchProfile;
  p50: number;
  p99: number;
  max: number;
  cores: number;
  cpuVsPaper: number;
  p50VsPaper: number;
  p99VsPaper: number;
  spread: number;
}

export interface GenRow {
  build: BenchBuild;
  profile: BenchProfile;
  seconds: number;
  chunksPerSecond: number;
  cpuSeconds: number;
  cores: number;
  vsPaper: number;
  cpuVsPaper: number;
  spread: number;
}

const tick = (
  cell: string,
  p50: number,
  p99: number,
  max: number,
  cores: number,
  cpuVsPaper: number,
  p50VsPaper: number,
  p99VsPaper: number,
  spread: number,
): TickRow => {
  const [build, profile] = cell.split('__') as [BenchBuild, BenchProfile];
  return { build, profile, p50, p99, max, cores, cpuVsPaper, p50VsPaper, p99VsPaper, spread };
};

const gen = (
  cell: string,
  seconds: number,
  chunksPerSecond: number,
  cpuSeconds: number,
  cores: number,
  vsPaper: number,
  cpuVsPaper: number,
  spread: number,
): GenRow => {
  const [build, profile] = cell.split('__') as [BenchBuild, BenchProfile];
  return { build, profile, seconds, chunksPerSecond, cpuSeconds, cores, vsPaper, cpuVsPaper, spread };
};

const rctBaseline = [
  tick('paper__stock', 21.66, 29.99, 40.0, 0.9, 0.0, 0.0, 0.0, 9.3),
  tick('purpur__stock', 21.87, 32.72, 49.3, 0.95, 4.8, -1.0, -9.1, 10.9),
];

export const BENCHMARKS = {
  date: '2026-09-28',
  minecraft: '26.2',
  cpu: 'AMD Ryzen 9 9950X3D',
  botswarm: [
    tick('divinemc__rct', 15.41, 21.72, 33.4, 1.78, 31.1, 58.9, 60.3, 7.1),
    tick('divinemc__max', 17.17, 24.72, 40.8, 1.6, 15.9, 54.2, 54.9, 4.0),
    tick('divinemc__stock', 33.07, 43.12, 58.6, 1.47, 7.1, 11.8, 21.3, 3.5),
    tick('paper__stock', 37.49, 54.77, 68.9, 1.37, 0.0, 0.0, 0.0, 3.6),
    tick('purpur__stock', 38.48, 55.61, 69.5, 1.4, 2.1, -2.6, -1.5, 3.0),
    tick('divinemc__parity', 40.61, 59.77, 74.2, 1.46, 6.4, -8.3, -9.1, 4.4),
  ],
  rctclusters: {
    4: [tick('divinemc__rct', 8.4, 12.3, 25.3, 0.97, 5.9, 61.2, 59.0, 17.3), ...rctBaseline],
    8: [tick('divinemc__rct', 8.96, 13.25, 25.2, 1.04, 16.8, 58.6, 55.8, 9.4), ...rctBaseline],
    12: [tick('divinemc__rct', 9.32, 13.75, 23.3, 1.08, 21.4, 57.0, 54.2, 8.8), ...rctBaseline],
  } as Record<4 | 8 | 12, TickRow[]>,
  chunkgen: [
    gen('divinemc__max', 87.2, 757, 782, 9.2, 7.0, -15.3, 2.8),
    gen('divinemc__stock', 93.8, 704, 914, 9.8, 0.0, -1.0, 1.7),
    gen('paper__stock', 93.8, 704, 923, 9.9, 0.0, 0.0, 1.1),
    gen('purpur__stock', 94.0, 703, 924, 9.9, -0.2, 0.1, 1.2),
    gen('divinemc__parity', 94.6, 698, 910, 9.8, -0.9, -1.5, 1.1),
  ],
};

const BUILD_NAMES: Record<BenchBuild, string> = { divinemc: 'DivineMC', paper: 'Paper', purpur: 'Purpur' };

export function benchLabel(row: { build: BenchBuild; profile: BenchProfile }): string {
  const name = BUILD_NAMES[row.build];
  return row.build === 'divinemc' ? `${name} ${row.profile}` : name;
}

export function signedPct(value: number, digits = 1): string {
  const text = Math.abs(value).toFixed(digits);
  if (Number(text) === 0) return `${text}%`;
  return `${value > 0 ? '+' : '−'}${text}%`;
}
