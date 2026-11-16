<!-- One reference list (killers, maps, mates or events): search, add, edit, merge, delete. -->
<template>
  <div class="flex flex-col gap-4">
    <div class="flex gap-2">
      <UInput v-model="search" icon="i-lucide-search" placeholder="Rechercher" class="flex-1" />
      <UButton icon="i-lucide-plus" :label="config.add" @click="openEditor()" />
    </div>

    <UTable :data="rows" :columns="columns" :loading="status === 'pending'" empty="Aucun résultat">
      <template #name-cell="{ row }">
        <span class="font-medium" :class="{ 'text-muted': row.original.archived }">{{ row.original.name }}</span>
        <UBadge v-if="isActive(row.original)" label="En cours" color="success" variant="subtle" class="ms-2" />
      </template>

      <!-- Read-only: the flag is changed from the edit window. -->
      <template #flag-cell="{ row }">
        <USwitch
          v-if="config.flag"
          :model-value="Boolean(row.original[config.flag.key])"
          :aria-label="config.flag.label"
          disabled
        />
      </template>

      <template #dates-cell="{ row }">
        <span class="text-muted">{{ formatDates(row.original) }}</span>
      </template>

      <template #games-cell="{ row }">
        {{ row.original.games.toLocaleString('fr-FR') }}
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UTooltip text="Modifier">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              aria-label="Modifier"
              @click="openEditor(row.original)"
            />
          </UTooltip>
          <UTooltip v-if="row.original.games > 0" text="Fusionner dans… (utilisé par des parties)">
            <UButton
              icon="i-lucide-merge"
              color="neutral"
              variant="ghost"
              aria-label="Fusionner dans…"
              @click="openMerge(row.original)"
            />
          </UTooltip>
          <UTooltip v-else text="Supprimer">
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              aria-label="Supprimer"
              @click="removing = row.original"
            />
          </UTooltip>
        </div>
      </template>
    </UTable>

    <!-- Add or edit -->
    <UModal v-model:open="editorOpen" :title="editing ? `Modifier ${editing.name}` : config.add">
      <template #body>
        <form id="reference-editor" class="flex flex-col gap-4" @submit.prevent="submitEditor">
          <UFormField label="Nom" required>
            <UInput v-model="draft.name" autofocus required class="w-full" />
          </UFormField>
          <USwitch v-if="config.flag" v-model="draft.flag" :label="config.flag.label" />
          <div v-if="list === 'events'" class="grid grid-cols-2 gap-4">
            <UFormField label="Début" hint="optionnel">
              <UInput v-model="draft.startsOn" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Fin" hint="optionnel">
              <UInput v-model="draft.endsOn" type="date" :min="draft.startsOn || undefined" class="w-full" />
            </UFormField>
          </div>
          <p v-if="list === 'events'" class="text-sm text-muted">
            Pendant ces dates, l'événement est présélectionné dans le formulaire de partie.
          </p>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton label="Annuler" color="neutral" variant="ghost" @click="editorOpen = false" />
          <UButton type="submit" form="reference-editor" label="Enregistrer" :loading="busy" />
        </div>
      </template>
    </UModal>

    <!-- Merge -->
    <UModal
      :open="merging !== null"
      :title="`Fusionner ${merging?.name}`"
      @update:open="(open) => !open && (merging = null)"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField label="Fusionner dans">
            <USelectMenu
              v-model="mergeInto"
              :items="mergeTargets"
              value-key="id"
              label-key="name"
              placeholder="Choisir…"
              class="w-full"
            />
          </UFormField>
          <p v-if="merging && mergeTarget" class="text-sm">
            {{ gamesLabel(merging.games) }} {{ merging.games > 1 ? 'passeront' : 'passera' }} à
            <strong>{{ mergeTarget.name }}</strong>, puis <strong>{{ merging.name }}</strong> sera supprimé.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton label="Annuler" color="neutral" variant="ghost" @click="merging = null" />
          <UButton label="Fusionner" color="error" :disabled="!mergeTarget" :loading="busy" @click="submitMerge" />
        </div>
      </template>
    </UModal>

    <!-- Delete (only rows no game uses) -->
    <UModal
      :open="removing !== null"
      :title="`Supprimer ${removing?.name} ?`"
      description="Aucune partie ne l'utilise."
      @update:open="(open) => !open && (removing = null)"
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton label="Annuler" color="neutral" variant="ghost" @click="removing = null" />
          <UButton label="Supprimer" color="error" :loading="busy" @click="submitRemove" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { formatDay, isEventActive } from '#shared/dates'

const props = defineProps<{ list: ReferenceListName }>()

interface Row {
  id: number
  name: string
  games: number
  in2v8?: boolean
  archived?: boolean
  startsOn?: string | null
  endsOn?: string | null
}

interface ListConfig {
  add: string
  flag?: { key: 'in2v8' | 'archived'; label: string }
}

const CONFIGS: Record<ReferenceListName, ListConfig> = {
  killers: { add: 'Ajouter un tueur', flag: { key: 'in2v8', label: 'Disponible en 2v8' } },
  maps: { add: 'Ajouter une carte', flag: { key: 'in2v8', label: 'Disponible en 2v8' } },
  mates: { add: 'Ajouter un mate', flag: { key: 'archived', label: 'Archivé' } },
  events: { add: 'Ajouter un événement' },
}

const config = computed(() => CONFIGS[props.list])
const { data, status, refresh } = useAdminReference()
const toast = useToast()

// Search ignores case and accents ("epidemie" finds "L'Épidémie").
function simplify(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

const search = ref('')

const allRows = computed<Row[]>(() => {
  const rows = [...((data.value?.[props.list] ?? []) as Row[])]
  if (props.list === 'events') {
    // Most recent events first, events with no dates (modes like Chaos Shuffle) last.
    return rows.sort(
      (a, b) => (b.startsOn ?? '').localeCompare(a.startsOn ?? '') || a.name.localeCompare(b.name, 'fr'),
    )
  }
  // Archived mates last.
  return rows.sort((a, b) => Number(a.archived ?? false) - Number(b.archived ?? false) || a.name.localeCompare(b.name, 'fr'))
})

const rows = computed(() => {
  const query = simplify(search.value.trim())
  return query ? allRows.value.filter((row) => simplify(row.name).includes(query)) : allRows.value
})

const columns = computed<TableColumn<Row>[]>(() => [
  { accessorKey: 'name', header: 'Nom' },
  ...(config.value.flag ? [{ id: 'flag', header: config.value.flag.label }] : []),
  ...(props.list === 'events' ? [{ id: 'dates', header: 'Dates' }] : []),
  { accessorKey: 'games', header: 'Parties' },
  { id: 'actions', header: '' },
])

function isActive(row: Row) {
  return props.list === 'events' && isEventActive({ startsOn: row.startsOn ?? null, endsOn: row.endsOn ?? null })
}

function formatDates(row: Row) {
  if (row.startsOn && row.endsOn) return `${formatDay(row.startsOn)} → ${formatDay(row.endsOn)}`
  if (row.startsOn) return `Depuis le ${formatDay(row.startsOn)}`
  if (row.endsOn) return `Jusqu'au ${formatDay(row.endsOn)}`
  return '—'
}

function gamesLabel(games: number) {
  return `${games.toLocaleString('fr-FR')} partie${games > 1 ? 's' : ''}`
}

// Requests

const busy = ref(false)

const ERRORS: Record<string, string> = {
  'Name already used': 'Ce nom existe déjà.',
  'Still used by games': 'Des parties l\'utilisent encore : fusionne-le plutôt.',
  'End date before start date': 'La fin doit être après le début.',
}

async function request(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: object) {
  busy.value = true
  try {
    // A plain string: Nitro can't infer the route (and its methods) from this template.
    const url: string = `/api/admin/${props.list}${path}`
    await $fetch(url, { method, body })
    return true
  } catch (error) {
    const message = (error as { statusMessage?: string }).statusMessage ?? ''
    toast.add({ title: ERRORS[message] ?? 'Une erreur est survenue.', color: 'error', icon: 'i-lucide-circle-alert' })
    return false
  } finally {
    busy.value = false
    await refresh()
  }
}

// Add or edit

const editorOpen = ref(false)
const editing = ref<Row | null>(null)
const draft = reactive({ name: '', flag: false, startsOn: '', endsOn: '' })

function openEditor(row?: Row) {
  editing.value = row ?? null
  draft.name = row?.name ?? ''
  draft.flag = Boolean(config.value.flag && row?.[config.value.flag.key])
  draft.startsOn = row?.startsOn ?? ''
  draft.endsOn = row?.endsOn ?? ''
  editorOpen.value = true
}

async function submitEditor() {
  const fields: Record<string, unknown> = { name: draft.name }
  if (config.value.flag) fields[config.value.flag.key] = draft.flag
  if (props.list === 'events') {
    fields.startsOn = draft.startsOn || null
    fields.endsOn = draft.endsOn || null
  }

  const ok = editing.value ? await request(`/${editing.value.id}`, 'PATCH', fields) : await request('', 'POST', fields)
  if (ok) {
    editorOpen.value = false
    toast.add({ title: editing.value ? 'Modifié' : 'Ajouté', color: 'success', icon: 'i-lucide-check' })
  }
}

// Merge

const merging = ref<Row | null>(null)
const mergeInto = ref<number>()
const mergeTargets = computed(() => allRows.value.filter((row) => row.id !== merging.value?.id))
const mergeTarget = computed(() => mergeTargets.value.find((row) => row.id === mergeInto.value))

function openMerge(row: Row) {
  merging.value = row
  mergeInto.value = undefined
}

async function submitMerge() {
  if (!merging.value || !mergeTarget.value) return
  const { name } = merging.value
  if (await request(`/${merging.value.id}/merge`, 'POST', { into: mergeTarget.value.id })) {
    toast.add({ title: `${name} fusionné dans ${mergeTarget.value.name}`, color: 'success', icon: 'i-lucide-check' })
    merging.value = null
  }
}

// Delete

const removing = ref<Row | null>(null)

async function submitRemove() {
  if (!removing.value) return
  const { name } = removing.value
  if (await request(`/${removing.value.id}`, 'DELETE')) {
    toast.add({ title: `${name} supprimé`, color: 'success', icon: 'i-lucide-check' })
    removing.value = null
  }
}
</script>
