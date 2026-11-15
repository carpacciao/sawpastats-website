<template>
  <main class="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
    <h1 class="text-2xl font-semibold">Admin</h1>
    <UButton icon="i-lucide-log-out" color="neutral" variant="outline" :loading="loading" @click="logout">
      Log out
    </UButton>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeoMeta({ title: 'Admin · sawpastats', robots: 'noindex' })

const loading = ref(false)

async function logout() {
  loading.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } finally {
    loading.value = false
  }
  await navigateTo('/login')
}
</script>
