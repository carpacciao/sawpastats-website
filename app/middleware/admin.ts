// Only lets logged-in visitors through, everyone else goes to /login.
export default defineNuxtRouteMiddleware(async () => {
  const loggedIn = await useRequestFetch()('/api/auth/me')
    .then(() => true)
    .catch(() => false)

  if (!loggedIn) return navigateTo('/login')
})
