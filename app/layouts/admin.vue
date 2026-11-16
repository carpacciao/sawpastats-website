<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <span v-if="!collapsed" class="font-semibold">sawpastats</span>
        <UIcon v-else name="i-lucide-skull" class="size-5 mx-auto" />
      </template>

      <template #default="{ collapsed }">
        <UButton
          to="/admin/games/new"
          icon="i-lucide-plus"
          :label="collapsed ? undefined : 'Nouvelle partie'"
          :square="collapsed"
          block
        />
        <UNavigationMenu :items="items" :collapsed="collapsed" orientation="vertical" />
      </template>

      <template #footer="{ collapsed }">
        <UButton
          icon="i-lucide-log-out"
          :label="collapsed ? undefined : 'Se déconnecter'"
          color="neutral"
          variant="ghost"
          :square="collapsed"
          :loading="loggingOut"
          block
          @click="logout"
        />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[] = [
  { label: 'Tableau de bord', icon: 'i-lucide-layout-dashboard', to: '/admin', exact: true },
  { label: 'Parties', icon: 'i-lucide-list', to: '/admin/games', exact: true },
  { label: 'Tueurs', icon: 'i-lucide-skull', to: '/admin/killers' },
  { label: 'Cartes', icon: 'i-lucide-map', to: '/admin/maps' },
  { label: 'Mates', icon: 'i-lucide-users', to: '/admin/mates' },
  { label: 'Événements', icon: 'i-lucide-calendar', to: '/admin/events' },
]

// N opens the new game form from anywhere in the admin (ignored while typing).
defineShortcuts({ n: () => navigateTo('/admin/games/new') })

const loggingOut = ref(false)

async function logout() {
  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } finally {
    loggingOut.value = false
  }
  await navigateTo('/login')
}
</script>
