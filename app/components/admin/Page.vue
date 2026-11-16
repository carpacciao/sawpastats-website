<!-- One admin screen: a dashboard panel with a title bar. -->
<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="title">
        <template #right>
          <slot name="actions" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <slot />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
const props = defineProps<{ title: string }>()

useSeoMeta({ title: () => props.title })
</script>
