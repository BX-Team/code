import type { ConnectedApp } from '@bx-team/types/schema/bxid';
import { auth, fetchConnectedApps } from '~/lib/auth';

export interface AccountSession {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountLink {
  id: string;
  providerId: string;
  createdAt: Date;
}

/** What the account pages share: linked sign-in accounts, sessions and apps, loaded once and refreshed after changes. */
export function useAccountData() {
  const links = useState<AccountLink[] | null>('bxid-links', () => null);
  const sessions = useState<AccountSession[] | null>('bxid-sessions', () => null);
  const apps = useState<ConnectedApp[] | null>('bxid-apps', () => null);
  const appsFailed = useState('bxid-apps-failed', () => false);

  async function refresh() {
    const [accounts, list] = await Promise.all([
      auth.listAccounts(),
      auth.listSessions(),
      fetchConnectedApps()
        .then(found => {
          apps.value = found;
          appsFailed.value = false;
        })
        .catch(() => {
          appsFailed.value = true;
        }),
    ]);
    links.value = (accounts.data ?? []).map(a => ({
      id: a.id,
      providerId: a.providerId,
      createdAt: new Date(a.createdAt),
    }));
    sessions.value = (list.data ?? []).map(s => ({
      id: s.id,
      token: s.token,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
    }));
  }

  return { links, sessions, apps, appsFailed, refresh };
}
