import { before, type Env, FlagBuilder, graalProp, isGraalEE, isLinux, isX86, since, vectorModule } from './env';

export interface Preset {
  id: string;
  name: string;
  /** Who published the set, for the credit line on the card. */
  author: string;
  url: string;
  summary: string;
  flags: (env: Env) => string[];
}

/** Ported from irori (`internal/launch/presets.go`), which stays the source of truth. */
export const PRESETS: Preset[] = [
  {
    id: 'aikar',
    name: "Aikar's Flags",
    author: 'Aikar',
    url: 'https://docs.papermc.io/paper/aikars-flags/',
    summary: 'G1GC tuning, the long-standing default for Paper and its forks',
    flags: aikarFlags,
  },
  {
    id: 'meowice',
    name: "MeowIce's Flags (G1GC)",
    author: 'MeowIce',
    url: 'https://github.com/MeowIce/meowice-flags',
    summary: "Aikar's G1GC plus modern JIT and intrinsic tuning; best on GraalVM",
    flags: meowiceG1Flags,
  },
  {
    id: 'meowice-zgc',
    name: "MeowIce's Flags (ZGC)",
    author: 'MeowIce',
    url: 'https://github.com/MeowIce/meowice-flags',
    summary: 'The same set on ZGC, for 32G+ heaps on 10+ cores only',
    flags: meowiceZGCFlags,
  },
  {
    id: 'bruce',
    name: "brucethemoose's Flags",
    author: 'brucethemoose',
    url: 'https://github.com/brucethemoose/Minecraft-Performance-Flags-Benchmarks',
    summary: 'Individually benchmarked base flags with the server G1GC set',
    flags: bruceFlags,
  },
  {
    id: 'hilltty',
    name: "hilltty's Flags",
    author: 'hilltty',
    url: 'https://github.com/hilltty/hilltty-flags',
    summary: 'Shenandoah GC, short pauses at the cost of CPU; a small set',
    flags: hillttyFlags,
  },
  {
    id: 'none',
    name: 'No flags',
    author: 'nobody',
    url: '',
    summary: 'Only -Xms/-Xmx, everything else left to the JVM',
    flags: () => [],
  },
];

export function getPreset(id: string): Preset {
  return PRESETS.find(preset => preset.id === id) ?? (PRESETS[PRESETS.length - 1] as Preset);
}

function aikarFlags(env: Env): string[] {
  const big = env.heapMB >= 12 * 1024;
  return new FlagBuilder(env)
    .add(
      '-XX:+UseG1GC',
      '-XX:+ParallelRefProcEnabled',
      '-XX:MaxGCPauseMillis=200',
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+DisableExplicitGC',
      '-XX:+AlwaysPreTouch',
      `-XX:G1NewSizePercent=${big ? 40 : 30}`,
      `-XX:G1MaxNewSizePercent=${big ? 50 : 40}`,
      `-XX:G1HeapRegionSize=${big ? '16M' : '8M'}`,
      `-XX:G1ReservePercent=${big ? 15 : 20}`,
      '-XX:G1HeapWastePercent=5',
      '-XX:G1MixedGCCountTarget=4',
      `-XX:InitiatingHeapOccupancyPercent=${big ? 20 : 15}`,
      '-XX:G1MixedGCLiveThresholdPercent=90',
      '-XX:G1RSetUpdatingPauseTimePercent=5',
      '-XX:SurvivorRatio=32',
      '-XX:+PerfDisableSharedMem',
      '-XX:MaxTenuringThreshold=1',
      '-Dusing.aikars.flags=https://mcflags.emc.gs',
      '-Daikars.new.flags=true',
    )
    .done();
}

function meowiceG1Flags(env: Env): string[] {
  const builder = new FlagBuilder(env).add(...vectorModule(env));
  unlock(builder);
  builder.add(
    '-XX:+UseG1GC',
    '-XX:MaxGCPauseMillis=200',
    '-XX:+DisableExplicitGC',
    '-XX:+AlwaysPreTouch',
    '-XX:G1NewSizePercent=28',
    '-XX:G1MaxNewSizePercent=50',
    '-XX:G1HeapRegionSize=16M',
    '-XX:G1ReservePercent=15',
    '-XX:G1MixedGCCountTarget=3',
    '-XX:InitiatingHeapOccupancyPercent=20',
    '-XX:G1MixedGCLiveThresholdPercent=90',
    '-XX:SurvivorRatio=32',
    '-XX:G1HeapWastePercent=5',
    '-XX:+PerfDisableSharedMem',
    '-XX:G1SATBBufferEnqueueingThresholdPercent=30',
    '-XX:G1ConcMarkStepDurationMillis=5',
    '-XX:G1RSetUpdatingPauseTimePercent=0',
    '-XX:AllocatePrefetchStyle=3',
  );
  return meowiceCommon(builder);
}

function meowiceZGCFlags(env: Env): string[] {
  const builder = new FlagBuilder(env).add(...vectorModule(env));
  unlock(builder);
  builder.add(
    '-XX:+UseZGC',
    '-XX:-ZProactive',
    '-XX:+DisableExplicitGC',
    '-XX:+AlwaysPreTouch',
    '-XX:+PerfDisableSharedMem',
  );
  if (env.heapMB > 2048) builder.mb('-XX:SoftMaxHeapSize=', env.heapMB - 2048);
  builder.add('-XX:AllocatePrefetchStyle=1');
  return meowiceCommon(builder);
}

function meowiceCommon(builder: FlagBuilder): string[] {
  const env = builder.env;
  builder.add(
    '-XX:+UseNUMA',
    '-XX:-DontCompileHugeMethods',
    '-XX:MaxNodeLimit=240000',
    '-XX:NodeLimitFudgeFactor=8000',
    '-XX:ReservedCodeCacheSize=400M',
    '-XX:NonNMethodCodeHeapSize=12M',
    '-XX:ProfiledCodeHeapSize=194M',
    '-XX:NonProfiledCodeHeapSize=194M',
    '-XX:NmethodSweepActivity=1',
    '-XX:+UseCriticalJavaThreadPriority',
    '-XX:+AlwaysActAsServerClassMachine',
  );
  largePages(builder);
  builder.add(
    '-XX:+EagerJVMCI',
    '-XX:+UseStringDeduplication',
    '-XX:+UseAES',
    '-XX:+UseAESIntrinsics',
    '-XX:+UseFMA',
    '-XX:+UseLoopPredicate',
    '-XX:+RangeCheckElimination',
    '-XX:+OptimizeStringConcat',
    '-XX:+UseCompressedOops',
    '-XX:+UseThreadPriorities',
    '-XX:+OmitStackTraceInFastThrow',
    '-XX:+RewriteBytecodes',
    '-XX:+RewriteFrequentPairs',
    '-XX:+EliminateLocks',
    '-XX:+DoEscapeAnalysis',
    '-XX:+AlignVector',
    '-XX:+OptimizeFill',
    '-XX:+EnableVectorSupport',
    '-XX:+UseCharacterCompareIntrinsics',
    '-XX:+UseCopySignIntrinsic',
    '-XX:+UseFastJNIAccessors',
    '-XX:+UseInlineCaches',
    '-XX:+SegmentedCodeCache',
  );
  x86Intrinsics(builder);
  builder.when(isX86(env), '-XX:+UseVectorStubs');
  // Compact object headers only exist from Java 24 on.
  builder.when(since(env, 24), '-XX:+UseCompactObjectHeaders');
  builder.add('-Djdk.nio.maxCachedBufferSize=262144');
  builder.when(
    isGraalEE(env),
    graalProp(env, 'UsePriorityInlining', 'true'),
    graalProp(env, 'Vectorization', 'true'),
    graalProp(env, 'OptDuplication', 'true'),
    graalProp(env, 'DetectInvertedLoopsAsCounted', 'true'),
    graalProp(env, 'LoopInversion', 'true'),
    graalProp(env, 'VectorizeHashes', 'true'),
    graalProp(env, 'EnterprisePartialUnroll', 'true'),
    graalProp(env, 'VectorizeSIMD', 'true'),
    graalProp(env, 'StripMineNonCountedLoops', 'true'),
    graalProp(env, 'SpeculativeGuardMovement', 'true'),
    graalProp(env, 'TuneInlinerExploration', '1'),
    graalProp(env, 'LoopRotation', 'true'),
    graalProp(env, 'CompilerConfiguration', 'enterprise'),
  );
  return builder.done();
}

function bruceFlags(env: Env): string[] {
  const builder = new FlagBuilder(env);
  unlock(builder);
  builder.add(
    '-XX:+AlwaysActAsServerClassMachine',
    '-XX:+AlwaysPreTouch',
    '-XX:+DisableExplicitGC',
    '-XX:+UseNUMA',
    '-XX:NmethodSweepActivity=1',
    '-XX:ReservedCodeCacheSize=400M',
    '-XX:NonNMethodCodeHeapSize=12M',
    '-XX:ProfiledCodeHeapSize=194M',
    '-XX:NonProfiledCodeHeapSize=194M',
    '-XX:-DontCompileHugeMethods',
    '-XX:MaxNodeLimit=240000',
    '-XX:NodeLimitFudgeFactor=8000',
    '-XX:+PerfDisableSharedMem',
    '-XX:+UseFastUnorderedTimeStamps',
    '-XX:+UseCriticalJavaThreadPriority',
    '-XX:ThreadPriorityPolicy=1',
    '-XX:AllocatePrefetchStyle=3',
  );
  builder.when(isX86(env), '-XX:+UseVectorCmov');
  builder.add(
    '-XX:+UseG1GC',
    '-XX:MaxGCPauseMillis=130',
    '-XX:G1NewSizePercent=28',
    '-XX:G1HeapRegionSize=16M',
    '-XX:G1ReservePercent=20',
    '-XX:G1MixedGCCountTarget=3',
    '-XX:InitiatingHeapOccupancyPercent=10',
    '-XX:G1MixedGCLiveThresholdPercent=90',
    '-XX:G1RSetUpdatingPauseTimePercent=0',
    '-XX:SurvivorRatio=32',
    '-XX:MaxTenuringThreshold=1',
    '-XX:G1SATBBufferEnqueueingThresholdPercent=30',
    '-XX:G1ConcMarkStepDurationMillis=5',
  );
  g1Refinement(builder);
  largePages(builder);
  builder.when(
    isGraalEE(env),
    '-XX:+EagerJVMCI',
    graalProp(env, 'TuneInlinerExploration', '1'),
    graalProp(env, 'CompilerConfiguration', 'enterprise'),
  );
  return builder.done();
}

function hillttyFlags(env: Env): string[] {
  const builder = new FlagBuilder(env).add('-XX:+UnlockExperimentalVMOptions');
  largePages(builder);
  builder.add('-XX:+UseShenandoahGC');
  // Shenandoah's incremental-update mode was removed in Java 24.
  builder.when(before(env, 24), '-XX:ShenandoahGCMode=iu');
  builder.add('-XX:+UseNUMA', '-XX:+AlwaysPreTouch', '-XX:+DisableExplicitGC');
  biasedLocking(builder);
  return builder.add('-Dfile.encoding=UTF-8').done();
}

function unlock(builder: FlagBuilder): void {
  builder.add('-XX:+UnlockExperimentalVMOptions', '-XX:+UnlockDiagnosticVMOptions');
}

function largePages(builder: FlagBuilder): void {
  builder.when(isLinux(builder.env), '-XX:+UseTransparentHugePages');
  builder.add('-XX:LargePageSizeInBytes=2M', '-XX:+UseLargePages');
}

function g1Refinement(builder: FlagBuilder): void {
  builder.when(before(builder.env, 24), '-XX:G1ConcRSHotCardLimit=16', '-XX:G1ConcRefinementServiceIntervalMillis=150');
}

/** Obsoleted in Java 18 and rejected outright from then on. */
function biasedLocking(builder: FlagBuilder): void {
  builder.when(before(builder.env, 18), '-XX:-UseBiasedLocking');
}

/** Defined only in the x86 half of HotSpot; an aarch64 JVM exits on each of them. */
function x86Intrinsics(builder: FlagBuilder): void {
  builder.when(
    isX86(builder.env),
    '-XX:+UseFPUForSpilling',
    '-XX:+UseFastStosb',
    '-XX:+UseNewLongLShift',
    '-XX:+UseVectorCmov',
    '-XX:+UseXMMForArrayCopy',
    '-XX:+UseXmmI2D',
    '-XX:+UseXmmI2F',
    '-XX:+UseXmmLoadAndClearUpper',
    '-XX:+UseXmmRegToRegMoveAll',
  );
}
