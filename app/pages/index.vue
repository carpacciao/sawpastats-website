<template>
  <main class="min-h-screen flex flex-col items-center justify-center gap-6">
    <h1 class="text-4xl font-bold">Bonjour, Sawpalin</h1>
    <UBadge :color="health?.ok ? 'success' : 'error'" variant="subtle" size="lg">
      Base de données : {{ health?.ok ? `en ligne · ${formatTime(health.time)}` : 'hors ligne' }}
    </UBadge>
  </main>
</template>

<script setup lang="ts">
const { data: health } = await useFetch('/api/health')

// Fixed time zone so the server and the browser render the same text.
function formatTime(time: string | null) {
  return new Date(time ?? 0).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })
}
</script>
