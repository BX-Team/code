import { Gamepad2, Globe, Monitor, Smartphone, Terminal } from '@lucide/vue';
import type { Component } from 'vue';
import { fromRiven } from '~/lib/auth';

export type AgentKind = 'riven' | 'cli' | 'phone' | 'computer' | 'unknown';

export const AGENT_ICONS: Record<AgentKind, Component> = {
  riven: Gamepad2,
  cli: Terminal,
  phone: Smartphone,
  computer: Monitor,
  unknown: Globe,
};

/** A readable name for a session's User-Agent; the launcher sends its own, everything else is a browser. */
export function describeAgent(ua?: string | null): { kind: AgentKind; name: string } {
  const agent = ua ?? '';
  if (!agent) return { kind: 'unknown', name: 'Unknown device' };
  if (fromRiven(agent)) return { kind: 'riven', name: 'Riven Launcher' };
  if (/curl|wget|httpie/i.test(agent)) return { kind: 'cli', name: 'Command line' };
  const browser = /Edg\//.test(agent)
    ? 'Edge'
    : /OPR\//.test(agent)
      ? 'Opera'
      : /Firefox\//.test(agent)
        ? 'Firefox'
        : /Chrome\//.test(agent)
          ? 'Chrome'
          : /Safari\//.test(agent)
            ? 'Safari'
            : 'Browser';
  const os = /Android/.test(agent)
    ? 'Android'
    : /iPhone|iPad/.test(agent)
      ? 'iOS'
      : /Windows/.test(agent)
        ? 'Windows'
        : /Mac OS X/.test(agent)
          ? 'macOS'
          : /Linux/.test(agent)
            ? 'Linux'
            : '';
  const phone = /Android|iPhone|iPad|Mobile/.test(agent);
  return { kind: phone ? 'phone' : 'computer', name: os ? `${browser} on ${os}` : browser };
}
