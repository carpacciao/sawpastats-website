<!-- Parent route of every /admin page: the middleware and layout apply to all of them. -->
<template>
  <NuxtPage />
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'admin', layout: 'admin' })
useHead({ titleTemplate: (title) => (title ? `${title} · sawpastats` : 'sawpastats') })
useSeoMeta({ robots: 'noindex' })
</script>
