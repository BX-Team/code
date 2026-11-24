import { type Friends, ServerEventSchema } from '@bx-team/types/schema/play';
import { onMounted, onUnmounted, type Ref } from 'vue';
import { AUTH_BASE } from '~/lib/auth';

const PING_MS = 30_000;

/** Keeps `friends` current while mounted, over a listen-only socket that never shows this player online. */
export function useLiveFriends(friends: Ref<Friends | null>, reload: () => Promise<unknown>) {
  let socket: WebSocket | null = null;
  let ping: ReturnType<typeof setInterval> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let delay = 1000;
  let stopped = false;
  let reconnecting = false;

  function connect() {
    const url = `${AUTH_BASE.replace(/^http/, 'ws')}/v1/play/connect?watch=1`;
    const ws = new WebSocket(url);
    socket = ws;
    ws.onopen = () => {
      delay = 1000;
      ping = setInterval(() => ws.send('{"type":"ping"}'), PING_MS);
      // Whatever changed while the socket was down; the first time the caller has just loaded.
      if (reconnecting) reload();
    };
    ws.onmessage = message => {
      let raw: unknown;
      try {
        raw = JSON.parse(String(message.data));
      } catch {
        return;
      }
      const event = ServerEventSchema.safeParse(raw);
      if (!event.success) return;
      const data = event.data;
      if (data.type === 'presence') {
        const friend = friends.value?.friends.find(f => f.user.id === data.userId);
        if (friend) friend.presence = data.presence;
      } else if (data.type === 'friend_request' || data.type === 'friend_added' || data.type === 'friend_removed') {
        reload();
      }
    };
    ws.onclose = () => {
      clearInterval(ping);
      if (stopped) return;
      reconnecting = true;
      retry = setTimeout(connect, delay);
      delay = Math.min(delay * 2, 30_000);
    };
  }

  onMounted(connect);
  onUnmounted(() => {
    stopped = true;
    clearInterval(ping);
    clearTimeout(retry);
    socket?.close();
  });
}
