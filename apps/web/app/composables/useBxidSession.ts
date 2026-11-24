import { watch } from 'vue';
import { auth } from '~/lib/auth';

/** The BX ID session for a page that needs one: without it the visitor goes to `/login` and comes back here. */
export function useBxidSession() {
  const session = auth.useSession();
  const route = useRoute();
  watch(
    () => session.value,
    ({ isPending, data }) => {
      if (!isPending && !data) navigateTo(`/login?next=${encodeURIComponent(route.fullPath)}`, { replace: true });
    },
    { immediate: true },
  );
  return session;
}
