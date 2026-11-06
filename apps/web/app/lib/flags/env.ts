export type Os = 'linux' | 'windows' | 'macos';
export type Arch = 'x86_64' | 'aarch64';
export type Graal = 'none' | 'oracle';

/** Everything a flag can branch on. A preset is a pure function of it. */
export interface Env {
  heapMB: number;
  /** Java feature release: 17, 21, 25. */
  java: number;
  graal: Graal;
  os: Os;
  arch: Arch;
}

export const since = (env: Env, major: number): boolean => env.java >= major;
export const before = (env: Env, major: number): boolean => env.java > 0 && env.java < major;

export const isX86 = (env: Env): boolean => env.arch === 'x86_64';
export const isLinux = (env: Env): boolean => env.os === 'linux';
export const isUnix = (env: Env): boolean => env.os !== 'windows';
export const isGraalEE = (env: Env): boolean => env.graal === 'oracle';

/** The `graal.` prefix was renamed in Java 23; the old one is ignored silently. */
export function graalProp(env: Env, name: string, value: string): string {
  return since(env, 23) ? `-Djdk.graal.${name}=${value}` : `-Dgraal.${name}=${value}`;
}

export function vectorModule(env: Env): string[] {
  return since(env, 17) ? ['--add-modules=jdk.incubator.vector'] : [];
}

export class FlagBuilder {
  private readonly args: string[] = [];

  constructor(readonly env: Env) {}

  add(...args: string[]): this {
    this.args.push(...args);
    return this;
  }

  when(condition: boolean, ...args: string[]): this {
    if (condition) this.args.push(...args);
    return this;
  }

  mb(flag: string, value: number): this {
    return this.add(`${flag}${value}M`);
  }

  done(): string[] {
    return this.args;
  }
}
