<template>
  <AdminPage title="Nouvelle partie">
    <AdminGameForm :initial="initial" />
  </AdminPage>
</template>

<script setup lang="ts">
import { isEventActive } from '#shared/dates'

// ?from=<id>: "Dupliquer" in the game list, a copy of that game dated now.
const from = Number(useRoute().query.from) || undefined

const [{ data: last }, { data: reference }, { data: source }] = await Promise.all([
  useFetch('/api/admin/games/defaults'),
  useAdminReference(),
  useFetch(`/api/admin/games/${from}`, { immediate: from !== undefined }),
])

// Starts from the last game's context, with the running event if there is one.
const activeEvent = reference.value?.events
  .filter((event) => isEventActive(event))
  .sort((a, b) => (b.startsOn ?? '').localeCompare(a.startsOn ?? ''))[0]

const initial = source.value ? { ...draftFromGame(source.value), playedAt: '' } : newDraft({
  mode: last.value?.mode,
  party: last.value?.party ?? undefined,
  mateId: last.value?.mateId,
  killerId: last.value?.killerId,
  killer2Id: last.value?.killer2Id ?? undefined,
  eventId: activeEvent?.id ?? null,
})
</script>
