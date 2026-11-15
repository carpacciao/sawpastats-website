// Sends visitors who are already logged in straight to /admin.
export default defineNuxtRouteMiddleware(async () => {
  const loggedIn = await useRequestFetch()('/api/auth/me')
    .then(() => true)
    .catch(() => false)

  if (loggedIn) return navigateTo('/admin')
})
