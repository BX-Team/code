import type { Notice } from '../notice';
import { type Env, isGraalEE, isLinux, isX86, since } from './env';
import type { Preset } from './presets';

export type { Notice, NoticeLevel } from '../notice';

const GB = 1024;

/** Explains what the environment did to the flag list — both what was dropped and
 *  what the set silently assumes about the host. */
export function diagnose(env: Env, preset: Preset, flags: string[]): Notice[] {
  const notices: Notice[] = [];
  const has = (needle: string) => flags.some(flag => flag.startsWith(needle));

  if (env.heapMB < 2 * GB) {
    notices.push({
      level: 'warning',
      title: 'Heap under 2 GB',
      body: 'A modern server barely boots in this much. These sets assume 4 GB and up; below that the GC tuning is noise.',
    });
  }

  if (env.heapMB >= 31 * GB && has('-XX:+UseCompressedOops')) {
    notices.push({
      level: 'warning',
      title: 'Compressed references stop working near 32 GB',
      body: 'Above roughly 32 GB the JVM drops compressed object pointers, so every reference doubles in size. A 31 GB heap often holds more objects than a 33 GB one.',
    });
  }

  if (preset.id === 'meowice-zgc') {
    if (env.heapMB < 32 * GB) {
      notices.push({
        level: 'warning',
        title: 'ZGC below its intended heap',
        body: 'This set is meant for 32 GB or more on 10+ cores. On a smaller host G1 collects less often and leaves more CPU for ticks.',
      });
    }
    notices.push({
      level: 'info',
      title: 'ZGC needs spare cores',
      body: 'ZGC collects concurrently, so it competes with the server threads for CPU. On a busy box that shows up as lower TPS, not as pauses.',
    });
  }

  if (env.graal !== 'none' && !['meowice', 'meowice-zgc', 'bruce'].includes(preset.id)) {
    notices.push({
      level: 'info',
      title: 'Nothing here uses GraalVM',
      body: `${preset.name} has no Graal-specific options. Pick MeowIce or brucethemoose to get them.`,
    });
  }

  if (isGraalEE(env) && since(env, 23)) {
    notices.push({
      level: 'info',
      title: 'Graal properties use the new prefix',
      body: 'From Java 23 the compiler reads -Djdk.graal.*; the old -Dgraal.* names are ignored without an error.',
    });
  }

  if (!isX86(env)) {
    notices.push({
      level: 'info',
      title: 'x86-only options were left out',
      body: 'An aarch64 JVM rejects -XX:+UseXmm*, -XX:UseAVX and the other x86 intrinsics outright and refuses to start, so they are not in this list.',
    });
  }

  if (since(env, 18) && preset.id === 'hilltty') {
    notices.push({
      level: 'info',
      title: '-XX:-UseBiasedLocking was left out',
      body: 'Biased locking was removed in Java 18 and the option is now rejected. It is only emitted for Java 17.',
    });
  }

  if (preset.id === 'hilltty' && since(env, 24)) {
    notices.push({
      level: 'info',
      title: 'Shenandoah iu mode was left out',
      body: 'The incremental-update mode is gone in Java 24; the default (SATB) mode is used instead.',
    });
  }

  if (since(env, 24) && has('-XX:+UseCompactObjectHeaders')) {
    notices.push({
      level: 'info',
      title: 'Compact object headers are on',
      body: 'Java 24 can store an object header in 8 bytes instead of 12. Expect a few percent less heap for the same world.',
    });
  }

  if (has('-XX:+UseLargePages')) {
    notices.push({
      level: 'warning',
      title: 'Large pages need the host configured',
      body: isLinux(env)
        ? 'Without transparent huge pages enabled (or vm.nr_hugepages reserved) the JVM prints a warning at startup and falls back to normal pages.'
        : 'Outside Linux large pages need an OS privilege (SeLockMemoryPrivilege on Windows). Without it the JVM warns at startup and carries on with normal pages.',
    });
  }

  if (has('--add-modules=jdk.incubator.vector')) {
    notices.push({
      level: 'info',
      title: 'The Vector API is still incubating',
      body: 'Java prints a warning about an incubator module on every start. That line is expected, not a misconfiguration.',
    });
  }

  if (env.java < 21) {
    notices.push({
      level: 'warning',
      title: 'Java 21 is the floor for current builds',
      body: 'DivineMC and every recent Paper fork need Java 21; the virtual-thread options in divinemc.yml need it too.',
    });
  }

  return notices;
}
