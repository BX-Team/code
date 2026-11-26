import type { Notice } from '../notice';
import { type Env, isGraalEE, isLinux, isX86, since } from './env';
import type { Preset } from './presets';

export type { Notice, NoticeLevel } from '../notice';

const GB = 1024;

/** What was dropped from the flag list, and what the set silently assumes about the host. */
export function diagnose(env: Env, preset: Preset, flags: string[]): Notice[] {
  const notices: Notice[] = [];
  const has = (needle: string) => flags.some(flag => flag.startsWith(needle));

  if (env.heapMB < 2 * GB) {
    notices.push({
      level: 'warning',
      id: 'flags.smallHeap',
    });
  }

  if (env.heapMB >= 31 * GB && has('-XX:+UseCompressedOops')) {
    notices.push({
      level: 'warning',
      id: 'flags.compressedOops',
    });
  }

  if (preset.id === 'meowice-zgc') {
    if (env.heapMB < 32 * GB) {
      notices.push({
        level: 'warning',
        id: 'flags.zgcSmallHeap',
      });
    }
    notices.push({
      level: 'info',
      id: 'flags.zgcCores',
    });
  }

  if (env.graal !== 'none' && !['meowice', 'meowice-zgc', 'bruce'].includes(preset.id)) {
    notices.push({
      level: 'info',
      id: 'flags.noGraal',
      params: { preset: preset.name },
    });
  }

  if (isGraalEE(env) && since(env, 23)) {
    notices.push({
      level: 'info',
      id: 'flags.graalPrefix',
    });
  }

  if (!isX86(env)) {
    notices.push({
      level: 'info',
      id: 'flags.x86Dropped',
    });
  }

  if (since(env, 18) && preset.id === 'hilltty') {
    notices.push({
      level: 'info',
      id: 'flags.biasedLocking',
    });
  }

  if (preset.id === 'hilltty' && since(env, 24)) {
    notices.push({
      level: 'info',
      id: 'flags.shenandoahIu',
    });
  }

  if (since(env, 24) && has('-XX:+UseCompactObjectHeaders')) {
    notices.push({
      level: 'info',
      id: 'flags.compactHeaders',
    });
  }

  if (has('-XX:+UseLargePages')) {
    notices.push({
      level: 'warning',
      id: isLinux(env) ? 'flags.largePagesLinux' : 'flags.largePages',
    });
  }

  if (has('--add-modules=jdk.incubator.vector')) {
    notices.push({
      level: 'info',
      id: 'flags.vectorIncubator',
    });
  }

  if (env.java < 21) {
    notices.push({
      level: 'warning',
      id: 'flags.javaTooOld',
    });
  } else if (env.java < 25) {
    notices.push({
      level: 'info',
      id: 'flags.divinemcJava',
    });
  }

  return notices;
}
