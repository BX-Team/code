import { authClient } from '@/lib/auth-client'

export default defineNuxtRouteMiddleware(async () => {
  const headers = useRequestHeaders(['cookie'])
  const { data: session } = await authClient.getSession({ fetchOptions: { headers } })
  if (!session) {
    return navigateTo('/login')
  }
})
