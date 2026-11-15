<template>
  <main class="min-h-screen flex flex-col items-center justify-center gap-6">
    <h1 class="text-4xl font-bold">Hello World, Sawpalin</h1>
    <UButton icon="i-lucide-skull" size="lg" @click="count++">
      Clicked {{ count }} times
    </UButton>
  </main>
</template>

<script setup lang="ts">
const count = ref(0)
</script>
