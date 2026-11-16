<template>
  <AdminPage title="Modifier la partie">
    <AdminGameForm v-if="game" :initial="draftFromGame(game)" :game-id="id" />
    <UEmpty v-else icon="i-lucide-search-x" title="Partie introuvable" />
  </AdminPage>
</template>

<script setup lang="ts">
const id = Number(useRoute().params.id)
const { data: game } = await useFetch(`/api/admin/games/${id}`)
</script>
