import { authClient } from '@/lib/auth-client'

export function useSession() {
	const headers = useRequestHeaders(['cookie'])

	return useAsyncData(
		'auth-session',
		() => authClient.getSession({ fetchOptions: { headers } }).then(r => r.data ?? null),
	)
}
