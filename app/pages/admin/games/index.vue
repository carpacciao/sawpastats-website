<template>
  <AdminPage title="Parties">
    <template #actions>
      <UButton
        :href="exportUrl"
        external
        download
        icon="i-lucide-download"
        label="Exporter en CSV"
        color="neutral"
        variant="outline"
      />
    </template>

    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <USelectMenu v-model="mode" :items="modeItems" value-key="value" placeholder="Mode" clear class="w-40" />
        <USelectMenu v-if="mode === '1v4'" v-model="eventId" :items="byName(reference?.events)" value-key="id" label-key="name" placeholder="Événement" clear class="w-48" />
        <USelectMenu v-model="killerId" :items="killerItems" value-key="id" label-key="name" :placeholder="killerLabels[0]" clear class="w-48" />
        <USelectMenu v-if="is2v8" v-model="killer2Id" :items="killerItems" value-key="id" label-key="name" :placeholder="killerLabels[1]" clear class="w-48" />
        <USelectMenu v-model="mapId" :items="mapItems" value-key="id" label-key="name" placeholder="Carte" clear class="w-48" />
        <USelectMenu v-if="mode === '2v8_killer'" v-model="mateId" :items="byName(reference?.mates)" value-key="id" label-key="name" placeholder="Mate" clear class="w-40" />
        <UInput v-model="from" type="date" aria-label="Du" :disabled="undated" class="w-40" />
        <span class="text-muted">→</span>
        <UInput v-model="to" type="date" aria-label="Au" :min="from" :disabled="undated" class="w-40" />
        <UCheckbox v-model="undated" label="Sans date" />
        <UButton v-if="hasFilters" label="Réinitialiser" icon="i-lucide-x" color="neutral" variant="ghost" @click="resetFilters" />
      </div>

      <p class="text-sm text-muted">{{ totalLabel }}</p>

      <UTable
        :data="data?.games ?? []"
        :columns="columns"
        :loading="status === 'pending'"
        empty="Aucune partie"
        class="cursor-pointer"
        @select="(_, row) => navigateTo(`/admin/games/${row.original.id}`)"
      >
        <template #date-cell="{ row }">
          <span v-if="row.original.playedAt" class="whitespace-nowrap">{{ formatDateTime(row.original.playedAt) }}</span>
          <span v-else class="text-muted">Sans date</span>
        </template>

        <template #mode-cell="{ row }">
          <div>{{ GAME_MODE_LABELS[row.original.mode] }}</div>
          <div class="text-muted text-xs">{{ context(row.original) }}</div>
        </template>

        <template #killers-cell="{ row }">
          {{ row.original.killer }}<template v-if="row.original.killer2"> + {{ row.original.killer2 }}</template>
        </template>

        <template #result-cell="{ row }">
          <div class="flex items-center gap-2 whitespace-nowrap">
            <template v-if="row.original.mode === '2v8_killer'">
              {{ survivorCount(row.original.mode) - row.original.escapes }} tués
            </template>
            <template v-else>
              <UBadge
                :label="row.original.sawEscaped ? (row.original.hatchEscape ? 'Sorti (trappe)' : 'Sorti') : 'Mort'"
                :color="row.original.sawEscaped ? 'success' : 'error'"
                variant="subtle"
              />
              <span class="text-muted text-xs">{{ row.original.escapes }}/{{ survivorCount(row.original.mode) }} sorties</span>
            </template>
          </div>
        </template>

        <template #fun-cell="{ row }">
          <UBadge v-if="row.original.fun" :label="FUN_LABELS[row.original.fun]" :color="FUN_COLORS[row.original.fun]" variant="subtle" />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1" @click.stop>
            <UTooltip text="Modifier">
              <UButton :to="`/admin/games/${row.original.id}`" icon="i-lucide-pencil" color="neutral" variant="ghost" aria-label="Modifier" />
            </UTooltip>
            <UTooltip text="Dupliquer">
              <UButton :to="`/admin/games/new?from=${row.original.id}`" icon="i-lucide-copy" color="neutral" variant="ghost" aria-label="Dupliquer" />
            </UTooltip>
            <UTooltip text="Supprimer">
              <UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Supprimer" @click="removing = row.original" />
            </UTooltip>
          </div>
        </template>
      </UTable>

      <div v-if="data && data.total > data.pageSize" class="flex justify-center">
        <UPagination v-model:page="page" :total="data.total" :items-per-page="data.pageSize" />
      </div>
    </div>

    <UModal
      :open="removing !== null"
      title="Supprimer cette partie ?"
      :description="removing ? `${removing.killer} · ${removing.map}` : undefined"
      @update:open="(open) => !open && (removing = null)"
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton label="Annuler" color="neutral" variant="ghost" @click="removing = null" />
          <UButton label="Supprimer" color="error" :loading="deleting" @click="remove" />
        </div>
      </template>
    </UModal>
  </AdminPage>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { formatDateTime } from '#shared/dates'
import { GAME_MODES, type Fun, type GameMode } from '#shared/enums'
import { survivorCount } from '#shared/game'
import { FUN_LABELS, GAME_MODE_LABELS, PARTY_SIZE_LABELS } from '#shared/labels'

const route = useRoute()
const router = useRouter()
const toast = useToast()

// Filters and page live in the URL, so coming back from a game keeps them.

function queryParam<T>(key: string, parse: (value: string) => T) {
  return computed<T | undefined>({
    get: () => {
      const value = route.query[key]
      return typeof value === 'string' && value !== '' ? parse(value) : undefined
    },
    // The selects' clear button sets null: like undefined, it removes the filter.
    set: (value: T | null | undefined) => {
      // A new filter starts again from the first page.
      const query = { ...route.query, page: key === 'page' ? route.query.page : undefined }
      router.replace({ query: { ...query, [key]: value === null || value === undefined ? undefined : String(value) } })
    },
  })
}

const asText = (value: string) => value
const modeParam = queryParam('mode', (value) => value as GameMode)
const eventId = queryParam('eventId', Number)
const killerId = queryParam('killerId', Number)
const killer2Id = queryParam('killer2Id', Number)
const mapId = queryParam('mapId', Number)
const mateId = queryParam('mateId', Number)
const from = queryParam('from', asText)
const to = queryParam('to', asText)
// Games with no date can't be in a date range: checking it clears the range.
const undated = computed({
  get: () => route.query.undated === 'true',
  set: (value) => {
    router.replace({
      query: { ...route.query, page: undefined, from: undefined, to: undefined, undated: value ? 'true' : undefined },
    })
  },
})
const pageParam = queryParam('page', Number)
const page = computed({ get: () => pageParam.value ?? 1, set: (value) => (pageParam.value = value > 1 ? value : undefined) })

const FILTER_KEYS = ['mode', 'eventId', 'killerId', 'killer2Id', 'mapId', 'mateId', 'from', 'to', 'undated']
const filterQuery = computed(() => Object.fromEntries(FILTER_KEYS.filter((key) => route.query[key]).map((key) => [key, String(route.query[key])])))
const hasFilters = computed(() => Object.keys(filterQuery.value).length > 0)

function resetFilters() {
  router.replace({ query: {} })
}

const exportUrl = computed(() => `/api/admin/games/export?${new URLSearchParams(filterQuery.value)}`)

// Data

const { data: reference } = useAdminReference()
const { data, status, refresh } = await useFetch('/api/admin/games', {
  query: computed(() => ({ ...filterQuery.value, page: page.value })),
})

type Game = NonNullable<typeof data.value>['games'][number]

const totalLabel = computed(() => {
  const total = data.value?.total ?? 0
  return `${total.toLocaleString('fr-FR')} partie${total > 1 ? 's' : ''}`
})

const modeItems = GAME_MODES.map((value) => ({ value, label: GAME_MODE_LABELS[value] }))

function byName<T extends { name: string }>(rows: T[] | undefined) {
  return [...(rows ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

// The filters follow the mode, like the game form: event in 1v4, mate in 2v8 as killer,
// two killers in 2v8, and only the killers and maps that exist there.

const is2v8 = computed(() => mode.value === '2v8_survivor' || mode.value === '2v8_killer')

function in2v8<T extends { id: number; in2v8: boolean }>(rows: T[] | undefined, id?: number) {
  return id === undefined || (rows ?? []).some((row) => row.id === id && row.in2v8)
}

// A new mode drops the filters it doesn't have.
const mode = computed({
  get: () => modeParam.value,
  set: (value: GameMode | null | undefined) => {
    const next = value ?? undefined
    const next2v8 = next === '2v8_survivor' || next === '2v8_killer'
    const { query } = route
    router.replace({
      query: {
        ...query,
        page: undefined,
        mode: next,
        eventId: next === '1v4' ? query.eventId : undefined,
        mateId: next === '2v8_killer' ? query.mateId : undefined,
        killer2Id: next2v8 ? query.killer2Id : undefined,
        killerId: !next2v8 || in2v8(reference.value?.killers, killerId.value) ? query.killerId : undefined,
        mapId: !next2v8 || in2v8(reference.value?.maps, mapId.value) ? query.mapId : undefined,
      },
    })
  },
})

const killerItems = computed(() => byName(reference.value?.killers).filter((killer) => !is2v8.value || killer.in2v8))
const mapItems = computed(() => byName(reference.value?.maps).filter((map) => !is2v8.value || map.in2v8))

const killerLabels = computed(() => {
  if (mode.value === '2v8_killer') return ['Tueur de Saw', 'Tueur du mate']
  return ['Tueur', 'Autre tueur']
})

const FUN_COLORS: Record<Fun, 'success' | 'neutral' | 'error'> = { yes: 'success', normal: 'neutral', no: 'error' }

// Party size, event or mate, under the mode.
function context(game: Game) {
  if (game.mode === '2v8_killer') return `avec ${game.mate ?? 'Random'}`
  return [game.party && PARTY_SIZE_LABELS[game.party], game.event].filter(Boolean).join(' · ')
}

const columns: TableColumn<Game>[] = [
  { id: 'date', header: 'Date' },
  { id: 'mode', header: 'Mode' },
  { id: 'killers', header: 'Tueur' },
  { accessorKey: 'map', header: 'Carte' },
  { id: 'result', header: 'Résultat' },
  { id: 'fun', header: 'Fun' },
  { id: 'actions', header: '' },
]

// Delete

const removing = ref<Game | null>(null)
const deleting = ref(false)

async function remove() {
  if (!removing.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/games/${removing.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Partie supprimée', color: 'success', icon: 'i-lucide-check' })
    removing.value = null
    await refresh()
  } catch {
    toast.add({ title: 'Une erreur est survenue.', color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    deleting.value = false
  }
}
</script>
