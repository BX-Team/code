import type { Env } from './env';
import { formatMemMB } from './mem';
import { getPreset } from './presets';

export interface LaunchOptions {
  env: Env;
  presetId: string;
  xmsMB: number;
  /** Bare filename or a path; it lands next to the script. */
  jar: string;
  /** A proxy takes no `--nogui`. */
  proxy: boolean;
  extra: string[];
  /** Wrap the launch in a loop that restarts the server when it exits. */
  restartOnExit: boolean;
}

/** The full argument vector, in the order irori builds it. */
export function launchArgs(options: LaunchOptions): string[] {
  const { env, xmsMB } = options;
  const xms = Math.min(xmsMB, env.heapMB);
  return [
    `-Xms${formatMemMB(xms)}`,
    `-Xmx${formatMemMB(env.heapMB)}`,
    ...getPreset(options.presetId).flags(env),
    ...options.extra,
    '-jar',
    options.jar,
    ...(options.proxy ? [] : ['--nogui']),
  ];
}

export function oneLiner(options: LaunchOptions): string {
  return ['java', ...launchArgs(options)].map(quote).join(' ');
}

/** Just the JVM flags — what a hosting panel's "startup arguments" field wants. */
export function flagsOnly(options: LaunchOptions): string {
  const args = launchArgs(options);
  return args.slice(0, args.indexOf('-jar')).map(quote).join(' ');
}

export function shellScript(options: LaunchOptions): string {
  const indent = options.restartOnExit ? '    ' : '  ';
  const command = joinArgs(launchArgs(options), '\\', indent);
  const lines = ['#!/usr/bin/env bash', 'cd "$(dirname "$0")" || exit 1', ''];

  if (options.restartOnExit) {
    lines.push(
      'while true; do',
      `  ${command}`,
      '',
      '  echo "Server stopped. Restarting in 5s, press Ctrl+C to stop."',
      '  sleep 5',
      'done',
    );
  } else {
    lines.push(command);
  }
  return `${lines.join('\n')}\n`;
}

export function batchScript(options: LaunchOptions): string {
  const command = joinArgs(launchArgs(options), '^', '  ');
  const lines = ['@echo off', 'cd /d "%~dp0"', ''];

  if (options.restartOnExit) {
    lines.push(
      ':start',
      command,
      '',
      'echo Server stopped. Restarting in 5s - close this window to stop.',
      'timeout /t 5',
      'goto start',
    );
  } else {
    lines.push(command, '', 'pause');
  }
  return `${lines.join('\r\n')}\r\n`;
}

/** One flag per line — a 90-flag command on one line is unreadable and unpatchable —
 *  but `-jar <file> --nogui` stays together, because that part is read as one thing. */
function joinArgs(args: string[], continuation: string, indent: string): string {
  const split = args.indexOf('-jar');
  const flags = ['java', ...args.slice(0, split)].map(quote);
  const tail = args.slice(split).map(quote).join(' ');
  return [...flags, tail].join(` ${continuation}\n${indent}`);
}

function quote(argument: string): string {
  if (!argument) return '""';
  return /[\s"'$]/.test(argument) ? `"${argument.replace(/"/g, '\\"')}"` : argument;
}
