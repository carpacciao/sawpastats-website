<template>
  <main class="min-h-screen flex flex-col items-center justify-center gap-6">
    <h1 class="text-4xl font-bold">Hello World, Sawpalin</h1>
    <UBadge :color="health?.ok ? 'success' : 'error'" variant="subtle" size="lg">
      DB: {{ health?.ok ? `up · ${new Date(health.time ?? 0).toLocaleTimeString()}` : 'down' }}
    </UBadge>
  </main>
</template>

<script setup lang="ts">
const { data: health } = await useFetch('/api/health')
</script>
