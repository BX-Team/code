import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

describe('lobby', () => {
  it('keeps a kicked friend out of an open world until invited again', async () => {
    const lobby = env.LOBBY.get(env.LOBBY.newUniqueId());
    await lobby.create('host', { name: 'World', game: { minecraft: '1.21.1' }, open: true });
    expect((await lobby.join('guest', true, 16)).ok).toBe(true);

    const kicked = await lobby.kick('host', 'guest');
    expect(kicked.ok && kicked.value.members).toEqual(['host']);
    expect((await lobby.join('guest', true, 16)).ok).toBe(false);

    await lobby.invite('host', 'guest');
    expect((await lobby.join('guest', true, 16)).ok).toBe(true);
  });
});
