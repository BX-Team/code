export type FlagGroup = 'gc' | 'heap' | 'jit' | 'intrinsics' | 'platform' | 'system';

export interface ExplainedFlag {
  /** The flag as it goes on the command line. */
  raw: string;
  /** Lookup key: no `-XX:`, no `+`/`-`, no `=value`. */
  key: string;
  value: string | null;
  /** `-XX:-Foo` turns a switch off; the description reads backwards without it. */
  disabled: boolean;
  group: FlagGroup;
  description: string | null;
}

/** `-XX:+UseG1GC` → `UseG1GC`, `-XX:MaxGCPauseMillis=200` → `MaxGCPauseMillis`. */
export function flagKey(flag: string): string {
  if (flag.startsWith('-Xms')) return 'Xms';
  if (flag.startsWith('-Xmx')) return 'Xmx';
  const [name] = flag.split('=');
  return (name as string).replace(/^-XX:[+-]?/, '');
}

export function explainFlag(raw: string): ExplainedFlag {
  const eq = raw.indexOf('=');
  const key = flagKey(raw);
  return {
    raw,
    key,
    value: eq === -1 ? (key === 'Xms' || key === 'Xmx' ? raw.slice(4) : null) : raw.slice(eq + 1),
    disabled: raw.startsWith('-XX:-'),
    group: GROUPS[key] ?? 'system',
    description: DESCRIPTIONS[key] ?? null,
  };
}

const GROUPS: Record<string, FlagGroup> = {
  UseG1GC: 'gc',
  UseZGC: 'gc',
  UseShenandoahGC: 'gc',
  ShenandoahGCMode: 'gc',
  ZProactive: 'gc',
  SoftMaxHeapSize: 'gc',
  ParallelRefProcEnabled: 'gc',
  MaxGCPauseMillis: 'gc',
  DisableExplicitGC: 'gc',
  G1NewSizePercent: 'gc',
  G1MaxNewSizePercent: 'gc',
  G1HeapRegionSize: 'gc',
  G1ReservePercent: 'gc',
  G1HeapWastePercent: 'gc',
  G1MixedGCCountTarget: 'gc',
  InitiatingHeapOccupancyPercent: 'gc',
  G1MixedGCLiveThresholdPercent: 'gc',
  G1RSetUpdatingPauseTimePercent: 'gc',
  G1SATBBufferEnqueueingThresholdPercent: 'gc',
  G1ConcMarkStepDurationMillis: 'gc',
  G1ConcRSHotCardLimit: 'gc',
  G1ConcRefinementServiceIntervalMillis: 'gc',
  SurvivorRatio: 'gc',
  MaxTenuringThreshold: 'gc',
  UseStringDeduplication: 'gc',
  Xms: 'heap',
  Xmx: 'heap',
  AlwaysPreTouch: 'heap',
  UseCompressedOops: 'heap',
  UseCompactObjectHeaders: 'heap',
  UseLargePages: 'heap',
  UseTransparentHugePages: 'heap',
  LargePageSizeInBytes: 'heap',
  AllocatePrefetchStyle: 'heap',
  UseNUMA: 'heap',
  ReservedCodeCacheSize: 'jit',
  NonNMethodCodeHeapSize: 'jit',
  ProfiledCodeHeapSize: 'jit',
  NonProfiledCodeHeapSize: 'jit',
  SegmentedCodeCache: 'jit',
  UseCodeCacheFlushing: 'jit',
  NmethodSweepActivity: 'jit',
  DontCompileHugeMethods: 'jit',
  MaxNodeLimit: 'jit',
  NodeLimitFudgeFactor: 'jit',
  AlwaysActAsServerClassMachine: 'jit',
  EagerJVMCI: 'jit',
  UseLoopPredicate: 'jit',
  RangeCheckElimination: 'jit',
  OptimizeStringConcat: 'jit',
  EliminateLocks: 'jit',
  DoEscapeAnalysis: 'jit',
  OptimizeFill: 'jit',
  AlignVector: 'jit',
  UseInlineCaches: 'jit',
  RewriteBytecodes: 'jit',
  RewriteFrequentPairs: 'jit',
  TrustFinalNonStaticFields: 'jit',
  OmitStackTraceInFastThrow: 'jit',
  UseAES: 'intrinsics',
  UseAESIntrinsics: 'intrinsics',
  UseFMA: 'intrinsics',
  EnableVectorSupport: 'intrinsics',
  UseVectorStubs: 'intrinsics',
  UseCharacterCompareIntrinsics: 'intrinsics',
  UseCopySignIntrinsic: 'intrinsics',
  UseFastJNIAccessors: 'intrinsics',
  UseVectorCmov: 'intrinsics',
  UseFPUForSpilling: 'intrinsics',
  UseFastStosb: 'intrinsics',
  UseNewLongLShift: 'intrinsics',
  UseXMMForArrayCopy: 'intrinsics',
  UseXmmI2D: 'intrinsics',
  UseXmmI2F: 'intrinsics',
  UseXmmLoadAndClearUpper: 'intrinsics',
  UseXmmRegToRegMoveAll: 'intrinsics',
  UseAVX: 'intrinsics',
  UseSSE: 'intrinsics',
  UseThreadPriorities: 'platform',
  UseCriticalJavaThreadPriority: 'platform',
  ThreadPriorityPolicy: 'platform',
  UseFastUnorderedTimeStamps: 'platform',
  PerfDisableSharedMem: 'platform',
  UseBiasedLocking: 'platform',
  UnlockExperimentalVMOptions: 'system',
  UnlockDiagnosticVMOptions: 'system',
};

const DESCRIPTIONS: Record<string, string> = {
  Xms: 'Initial heap size. Set equal to -Xmx so the JVM never has to grow the heap while the server runs.',
  Xmx: 'Maximum heap size. Leave 1–2 GB of host RAM outside it for the JVM itself, off-heap buffers and the OS.',

  UseG1GC: 'Selects G1, the collector every Minecraft flag set is tuned around.',
  UseZGC: 'Selects ZGC: sub-millisecond pauses, but it needs a large heap and spare cores to keep up.',
  UseShenandoahGC: 'Selects Shenandoah: short pauses, concurrent compaction, more CPU spent on GC.',
  ShenandoahGCMode:
    'Shenandoah barrier mode. `iu` (incremental update) trades safety margin for throughput; removed in Java 24.',
  ZProactive: 'Proactive ZGC cycles that run when the heap is quiet. Turned off so GC never competes with a tick.',
  SoftMaxHeapSize: 'The heap size ZGC aims to stay under, leaving the rest as headroom for allocation spikes.',
  ParallelRefProcEnabled:
    'Processes weak/soft references with multiple threads instead of one, a common pause spike on servers.',
  MaxGCPauseMillis: 'Pause target G1 sizes its work against. Lower means more frequent, shorter collections.',
  DisableExplicitGC: 'Ignores System.gc() calls, so a plugin cannot force a full stop-the-world collection.',
  G1NewSizePercent:
    'Floor for the young generation. Minecraft allocates hard and fast, so the default floor is far too low.',
  G1MaxNewSizePercent: 'Ceiling for the young generation.',
  G1HeapRegionSize: 'Size of one G1 region. Bigger regions reduce bookkeeping on large heaps.',
  G1ReservePercent: 'Heap kept in reserve so a spike does not turn into a full GC.',
  G1HeapWastePercent: 'How much garbage G1 tolerates before bothering with a mixed collection.',
  G1MixedGCCountTarget: 'How many mixed collections G1 spreads the old-generation cleanup over.',
  InitiatingHeapOccupancyPercent:
    'Occupancy at which concurrent marking starts. Lower starts earlier and avoids full GCs.',
  G1MixedGCLiveThresholdPercent: 'A region above this much live data is not worth collecting.',
  G1RSetUpdatingPauseTimePercent:
    'Share of the pause spent updating remembered sets; 0 pushes that work to concurrent threads.',
  G1SATBBufferEnqueueingThresholdPercent:
    'When SATB buffers get handed over during marking. Lower keeps marking smooth.',
  G1ConcMarkStepDurationMillis: 'Length of one concurrent marking step.',
  G1ConcRSHotCardLimit: 'When a card counts as hot and gets special handling. Removed in Java 24.',
  G1ConcRefinementServiceIntervalMillis: 'How often the refinement service wakes up. Removed in Java 24.',
  SurvivorRatio: 'Eden-to-survivor ratio. High values suit an allocation pattern where almost nothing survives.',
  MaxTenuringThreshold: 'How many collections an object survives before being promoted. 1 promotes early on purpose.',
  UseStringDeduplication: 'Deduplicates identical String contents during GC, worthwhile with many chunks and NBT.',

  AlwaysPreTouch: 'Touches every heap page at startup. Slower boot, no page-fault stalls mid-tick afterwards.',
  UseCompressedOops: 'Packs object references into 32 bits. Stops working above a ~32 GB heap.',
  UseCompactObjectHeaders:
    'Shrinks the object header from 12 to 8 bytes (Java 24+). Less memory, better cache behaviour.',
  UseLargePages: 'Backs the heap with large pages, cutting TLB misses. The host has to have them configured.',
  UseTransparentHugePages: 'Linux THP as the large-page source, no manual hugepage reservation needed.',
  LargePageSizeInBytes: 'Large page size to request.',
  AllocatePrefetchStyle: 'How the allocator prefetches memory ahead of new objects.',
  UseNUMA: 'Places heap memory near the core using it. Matters on multi-socket hosts, harmless elsewhere.',

  ReservedCodeCacheSize:
    'Room for JIT-compiled code. Minecraft plus plugins overflows the default and gets deoptimised.',
  NonNMethodCodeHeapSize: 'Part of the code cache for VM-internal code.',
  ProfiledCodeHeapSize: 'Part of the code cache for profiled (C1) code.',
  NonProfiledCodeHeapSize: 'Part of the code cache for fully optimised (C2) code.',
  SegmentedCodeCache: 'Splits the code cache into the three heaps above instead of one shared region.',
  UseCodeCacheFlushing: 'Flushes cold compiled methods rather than shutting the JIT down when the cache fills.',
  NmethodSweepActivity: 'How aggressively cold compiled methods are swept out.',
  DontCompileHugeMethods:
    'Off: lets the JIT compile the oversized methods Minecraft is full of instead of interpreting them.',
  MaxNodeLimit: 'Raises the C2 compilation size limit so those huge methods actually compile.',
  NodeLimitFudgeFactor: 'Slack for the node limit above.',
  AlwaysActAsServerClassMachine: 'Forces the server JIT even when the JVM decides the machine looks small.',
  EagerJVMCI: 'Initialises the JVMCI compiler at startup instead of on first use, for GraalVM builds.',
  UseLoopPredicate: 'Hoists loop-invariant range checks out of loops.',
  RangeCheckElimination: 'Removes array bounds checks the JIT can prove redundant.',
  OptimizeStringConcat: 'Compiles string concatenation into a single buffer pass.',
  EliminateLocks: 'Removes locks that provably cannot be contended.',
  DoEscapeAnalysis: 'Lets objects that never escape a method be stack-allocated.',
  OptimizeFill: 'Turns simple fill loops into intrinsic memory fills.',
  AlignVector: 'Aligns vectorised memory access.',
  UseInlineCaches: 'Inline caches for virtual call sites.',
  RewriteBytecodes: 'Rewrites bytecode into faster internal forms at class load.',
  RewriteFrequentPairs: 'Fuses common bytecode pairs into single operations.',
  TrustFinalNonStaticFields:
    'Treats final instance fields as constants: faster, and unsafe with reflection that rewrites them.',
  OmitStackTraceInFastThrow: 'Drops stack traces for hot repeated exceptions. Cheap, but it hides them from your logs.',

  UseAES: 'Enables the AES intrinsics.',
  UseAESIntrinsics: 'Hardware AES instructions, used by encrypted connections.',
  UseFMA: 'Fused multiply-add instructions, used across worldgen math.',
  EnableVectorSupport: 'Turns on the Vector API machinery.',
  UseVectorStubs: 'Vectorised stubs for common operations (x86 only).',
  UseCharacterCompareIntrinsics: 'Intrinsic character comparison.',
  UseCopySignIntrinsic: 'Intrinsic Math.copySign.',
  UseFastJNIAccessors: 'Faster JNI field access, used by native libraries.',
  UseVectorCmov: 'Vectorised conditional moves (x86 only).',
  UseFPUForSpilling: 'Spills registers through the FPU (x86 only).',
  UseFastStosb: 'Fast block memory stores (x86 only).',
  UseNewLongLShift: 'Faster 64-bit shifts (x86 only).',
  UseXMMForArrayCopy: 'XMM registers for array copies (x86 only).',
  UseXmmI2D: 'XMM int-to-double conversion (x86 only).',
  UseXmmI2F: 'XMM int-to-float conversion (x86 only).',
  UseXmmLoadAndClearUpper: 'XMM load clearing the upper half (x86 only).',
  UseXmmRegToRegMoveAll: 'XMM register-to-register moves (x86 only).',
  UseAVX: 'Highest AVX level the JIT may emit (x86 only).',
  UseSSE: 'Highest SSE level the JIT may emit (x86 only).',

  UseThreadPriorities: 'Lets the JVM pass thread priorities to the OS.',
  UseCriticalJavaThreadPriority: 'Gives the critical JVM threads real-time priority.',
  ThreadPriorityPolicy: 'Policy for mapping Java priorities onto OS priorities.',
  UseFastUnorderedTimeStamps: 'Reads the raw CPU timestamp counter instead of a synchronised clock.',
  PerfDisableSharedMem: 'Stops the JVM writing perf data to /tmp, a known source of stalls when the disk is busy.',
  UseBiasedLocking: 'Off: biased locking hurts under the contention a server generates. Obsolete from Java 18.',

  UnlockExperimentalVMOptions: 'Required before any experimental option below is accepted.',
  UnlockDiagnosticVMOptions: 'Required before any diagnostic option below is accepted.',

  '-Dusing.aikars.flags': 'Marker Aikar asks for so support channels can tell the set is in use.',
  '-Daikars.new.flags': 'Marker for the current revision of the set.',
  '-Djdk.nio.maxCachedBufferSize': 'Caps cached NIO direct buffers so networking does not hold memory forever.',
  '-Dfile.encoding': 'Forces UTF-8 so plugin messages and configs are not mangled by the platform default.',
  '-Djava.security.egd': 'Reads randomness from /dev/urandom; the default can block at startup on a headless host.',
  '-Xlog:async': 'Writes JVM logging off the tick thread.',
  '--add-modules': 'Adds the incubating Vector API module; several optimisations refuse to load without it.',
};

/** Graal properties are generated, so they are described by prefix rather than by key. */
export function describeGraalProp(raw: string): string | null {
  if (!raw.startsWith('-Dgraal.') && !raw.startsWith('-Djdk.graal.')) return null;
  return 'GraalVM compiler option; only Oracle GraalVM accepts it, other JVMs ignore the property.';
}
