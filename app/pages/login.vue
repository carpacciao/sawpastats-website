<template>
  <main class="min-h-screen flex items-center justify-center p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-xl font-semibold">Connexion</h1>
      </template>

      <form class="flex flex-col gap-4" @submit.prevent="login">
        <!-- Lets password managers save the shared password under "admin" -->
        <input type="text" name="username" autocomplete="username" value="admin" class="hidden" aria-hidden="true" tabindex="-1">

        <UFormField label="Mot de passe" name="password">
          <UInput
            v-model="password"
            type="password"
            autocomplete="current-password"
            autofocus
            required
            class="w-full"
          />
        </UFormField>

        <UAlert v-if="error" color="error" variant="subtle" :title="error" />

        <UButton type="submit" block :loading="loading">Se connecter</UButton>
      </form>
    </UCard>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'guest' })
useSeoMeta({ title: 'Connexion · sawpastats', robots: 'noindex' })

const password = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  if (loading.value) return
  loading.value = true
  error.value = ''

  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { password: password.value } })
    await navigateTo('/admin')
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    error.value = status === 401 ? 'Mot de passe incorrect' : 'Une erreur est survenue'
    password.value = ''
  } finally {
    loading.value = false
  }
}
</script>
