import {
  type FriendAdded,
  FriendAddedSchema,
  type Friends,
  FriendsSchema,
  type PlayUser,
} from '@bx-team/types/schema/play';
import { AUTH_BASE } from '~/lib/auth';
import { apiError } from '~/lib/errors';

async function call(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${AUTH_BASE}/v1/play${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw await apiError(response);
  if (response.status === 204) return null;
  return response.json();
}

export async function fetchFriends(): Promise<Friends> {
  return FriendsSchema.parse(await call('/friends'));
}

export async function addFriend(code: string): Promise<FriendAdded> {
  return FriendAddedSchema.parse(await call('/friends', { method: 'POST', body: JSON.stringify({ code }) }));
}

export async function acceptFriend(id: string) {
  await call(`/friends/${encodeURIComponent(id)}/accept`, { method: 'POST' });
}

export async function removeFriend(id: string) {
  await call(`/friends/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** The name a player picked, else their username. */
export function playerName(user: PlayUser): string {
  return user.name || user.username || 'Unnamed';
}
