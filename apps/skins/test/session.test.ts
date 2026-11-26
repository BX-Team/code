import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

const ALICE = 'Bearer alice';

function call(path: string, init: RequestInit = {}) {
  return exports.default.fetch(new Request(`https://api.example.test${path}`, init));
}

function post(path: string, body: unknown, authorization?: string) {
  return call(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
    body: JSON.stringify(body),
  });
}

async function claim(name: string, authorization = ALICE) {
  return post('/v1/skins/profiles', { name }, authorization);
}

async function token(name: string) {
  return ((await (await post('/v1/skins/session/token', { name }, ALICE)).json()) as { token: string }).token;
}

async function verify(value: string, signature: string) {
  const { key } = (await (await call('/v1/skins/session/publickey')).json()) as { key: string };
  const der = Uint8Array.from(atob(key), ch => ch.charCodeAt(0));
  const pub = await crypto.subtle.importKey('spki', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-1' }, false, [
    'verify',
  ]);
  const sig = Uint8Array.from(atob(signature), ch => ch.charCodeAt(0));
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', pub, sig, new TextEncoder().encode(value));
}

describe('game session', () => {
  it('lets a nick join only with its own token, signed so the agent trusts it', async () => {
    const { id } = (await (await claim('AliceNick')).json()) as { id: string };
    const game = await token('AliceNick');

    const forged = await post('/v1/skins/session/minecraft/join', {
      accessToken: `${game}x`,
      selectedProfile: id,
      serverId: 'a',
    });
    expect(forged.status).toBe(403);
    const otherProfile = await post('/v1/skins/session/minecraft/join', {
      accessToken: game,
      selectedProfile: '069a79f444e94726a5befca90e38aaf5',
      serverId: 'a',
    });
    expect(otherProfile.status).toBe(403);

    expect(
      (await post('/v1/skins/session/minecraft/join', { accessToken: game, selectedProfile: id, serverId: 'a' }))
        .status,
    ).toBe(204);
    const joined = await call('/v1/skins/session/minecraft/hasJoined?username=alicenick&serverId=a');
    const profile = (await joined.json()) as { id: string; properties: { value: string; signature: string }[] };
    expect(profile.id).toBe(id);
    const [textures] = profile.properties;
    expect(await verify(textures!.value, textures!.signature)).toBe(true);
  });

  it('stops a released nick from joining, token or not', async () => {
    const { id } = (await (await claim('Leaving')).json()) as { id: string };
    const game = await token('Leaving');
    await call('/v1/skins/profiles/Leaving', { method: 'DELETE', headers: { authorization: ALICE } });
    expect(
      (await post('/v1/skins/session/minecraft/join', { accessToken: game, selectedProfile: id, serverId: 'b' }))
        .status,
    ).toBe(403);
  });

  it('answers servers in the authlib-injector layout without asking Mojang again', async () => {
    const answer = await call('/v1/skins/sessionserver/session/minecraft/hasJoined?username=Notch&serverId=c');
    expect(answer.status).toBe(204);
  });
});

describe('nicks', () => {
  it('refuses a name a Microsoft account has, so servers can tell players apart by name', async () => {
    const answer = await claim('Notch');
    expect(answer.status).toBe(409);
    expect(((await answer.json()) as { message: string }).message).toContain('Minecraft account');
  });
});
