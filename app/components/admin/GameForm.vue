<!-- Adds a game, or edits one when `gameId` is set. Only the fields of the chosen mode show. -->
<template>
  <form class="flex flex-col gap-8 max-w-3xl" @submit.prevent="submit(isNew)">
    <AdminChoice v-model="draft.mode" :items="modeItems" label="Mode" size="lg" />

    <section class="grid gap-5 sm:grid-cols-2">
      <UFormField v-if="draft.mode !== '2v8_killer'" label="Groupe" class="sm:col-span-2">
        <AdminChoice v-model="draft.party" :items="partyItems" label="Groupe" />
      </UFormField>
      <UFormField v-if="draft.mode === '2v8_killer'" label="Mate" class="sm:col-span-2">
        <AdminChoice v-model="draft.mateId" :items="mateItems" label="Mate" />
      </UFormField>
      <UFormField v-if="draft.mode === '1v4'" label="Événement">
        <USelectMenu
          v-model="eventId"
          :items="eventItems"
          value-key="id"
          label-key="name"
          placeholder="Aucun"
          :search-input="{ placeholder: 'Rechercher…' }"
          clear
          class="w-full"
        />
      </UFormField>
    </section>

    <section class="grid gap-5 sm:grid-cols-2">
      <UFormField :label="labels.killer" :error="errors.killerId" required>
        <USelectMenu
          v-model="draft.killerId"
          :items="killerItems"
          value-key="id"
          label-key="name"
          placeholder="Choisir…"
          :search-input="{ placeholder: 'Rechercher…' }"
          class="w-full"
        />
      </UFormField>
      <UFormField v-if="draft.mode !== '1v4'" :label="labels.killer2" :error="errors.killer2Id" required>
        <USelectMenu
          v-model="draft.killer2Id"
          :items="killerItems"
          value-key="id"
          label-key="name"
          placeholder="Choisir…"
          :search-input="{ placeholder: 'Rechercher…' }"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Carte" :error="errors.mapId" required>
        <USelectMenu
          v-model="draft.mapId"
          :items="mapItems"
          value-key="id"
          label-key="name"
          placeholder="Choisir…"
          :search-input="{ placeholder: 'Rechercher…' }"
          class="w-full"
        />
      </UFormField>
    </section>

    <section class="grid gap-5 sm:grid-cols-2">
      <UFormField :label="labels.gameplay" :error="errors.gameplay">
        <AdminTags v-model="draft.gameplay" :items="gameplayItems" :exclusive="['cheater']" :none="NORMAL_GAMEPLAY_LABEL" :label="labels.gameplay" />
      </UFormField>
      <UFormField v-if="draft.mode === '1v4'" label="Survivants ignorés">
        <AdminChoice v-model="draft.ignoredSurvivors" :items="ignoredItems" label="Survivants ignorés" />
      </UFormField>
      <UFormField v-if="draft.mode === '2v8_killer'" label="Gameplay du mate" :error="errors.mateGameplay">
        <AdminTags v-model="draft.mateGameplay" :items="gameplayItems" :exclusive="['cheater']" :none="NORMAL_GAMEPLAY_LABEL" label="Gameplay du mate" />
      </UFormField>
      <UFormField v-if="draft.mode !== '2v8_killer'" label="Comportement du tueur" class="sm:col-span-2">
        <AdminChoice v-model="draft.killerBehavior" :items="behaviorItems" label="Comportement du tueur" />
      </UFormField>
    </section>

    <section class="grid gap-5 sm:grid-cols-2">
      <UFormField class="sm:col-span-2">
        <template #label>
          {{ labels.deaths }} <span class="font-normal text-muted">{{ escapesHint }}</span>
        </template>
        <AdminChoice v-model="draft.deaths" :items="range(survivors)" :label="labels.deaths" />
      </UFormField>
      <UFormField label="Abandons (survivants)" class="sm:col-span-2">
        <AdminChoice v-model="draft.survivorAbandons" :items="range(survivors)" label="Abandons" />
      </UFormField>
      <template v-if="draft.mode !== '2v8_killer'">
        <UFormField label="Saw est sorti">
          <AdminChoice v-model="draft.sawEscaped" :items="yesNo" label="Saw est sorti" />
        </UFormField>
        <UFormField label="Par la trappe">
          <AdminChoice v-model="draft.hatchEscape" :items="yesNo" label="Par la trappe" :disabled="!draft.sawEscaped" />
        </UFormField>
        <UFormField label="Phases de hook sautées" class="sm:col-span-2">
          <AdminChoice v-model="draft.hookSkip" :items="hookSkipItems" label="Phases de hook sautées" />
        </UFormField>
      </template>
      <UFormField v-if="draft.mode !== '1v4'" label="Bots" class="sm:col-span-2">
        <AdminChoice v-model="draft.bots" :items="range(8)" label="Bots" />
      </UFormField>
      <UFormField label="Générateurs restants" class="sm:col-span-2">
        <AdminChoice v-model="draft.generatorsLeft" :items="range(generators)" label="Générateurs restants" />
      </UFormField>
      <UFormField label="Fun ?" class="sm:col-span-2">
        <AdminChoice v-model="draft.fun" :items="funItems" label="Fun" size="lg" />
      </UFormField>
    </section>

    <UFormField label="Date" :hint="isNew ? 'vide = maintenant' : 'vide = sans date'" class="sm:max-w-xs">
      <UInput v-model="draft.playedAt" type="datetime-local" class="w-full" />
    </UFormField>

    <UFormField label="Notes" :error="errors.notes">
      <UTextarea v-model="draft.notes" :rows="2" autoresize placeholder="Optionnel" class="w-full" />
    </UFormField>

    <UAlert
      v-if="warnings.length"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="À vérifier"
      :description="warnings.join(' ')"
    />

    <div class="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-default border-t border-default flex flex-wrap gap-2">
      <template v-if="isNew">
        <UButton type="submit" icon="i-lucide-plus" label="Enregistrer et nouvelle" :loading="saving" />
        <UButton label="Enregistrer" color="neutral" variant="outline" :disabled="saving" @click="submit(false)" />
        <UKbd value="meta" class="hidden sm:inline-flex self-center ms-auto" /><UKbd value="enter" class="hidden sm:inline-flex self-center" />
      </template>
      <template v-else>
        <UButton type="submit" icon="i-lucide-check" label="Enregistrer" :loading="saving" />
        <UButton label="Supprimer" icon="i-lucide-trash-2" color="error" variant="ghost" class="ms-auto" @click="confirmDelete = true" />
      </template>
    </div>

    <UModal v-model:open="confirmDelete" title="Supprimer cette partie ?" description="Elle disparaîtra des stats.">
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton label="Annuler" color="neutral" variant="ghost" @click="confirmDelete = false" />
          <UButton label="Supprimer" color="error" :loading="saving" @click="remove" />
        </div>
      </template>
    </UModal>
  </form>
</template>

<script setup lang="ts">
import { FUN, GAME_MODES, HOOK_SKIPS, KILLER_BEHAVIORS, PARTY_SIZES } from '#shared/enums'
import { gameSchema, gameWarnings, generatorCount, survivorCount } from '#shared/game'
import {
  FUN_LABELS,
  GAME_MODE_LABELS,
  GAMEPLAY_TAG_LABELS,
  HOOK_SKIP_LABELS,
  IGNORED_SURVIVORS_LABELS,
  KILLER_BEHAVIOR_LABELS,
  NO_KILLER_BEHAVIOR_LABEL,
  NORMAL_GAMEPLAY_LABEL,
  PARTY_SIZE_LABELS,
} from '#shared/labels'
import { isEventActive } from '#shared/dates'

const props = defineProps<{ initial: GameDraft; gameId?: number }>()

const isNew = props.gameId === undefined
const draft = reactive<GameDraft>({ ...props.initial })
const { data: reference } = useAdminReference()
const toast = useToast()

const survivors = computed(() => survivorCount(draft.mode))
const generators = computed(() => generatorCount(draft.mode))

const LABELS = {
  '1v4': { killer: 'Tueur', killer2: '', gameplay: 'Gameplay du tueur', deaths: 'Morts' },
  '2v8_survivor': { killer: 'Tueur 1', killer2: 'Tueur 2', gameplay: 'Gameplay des tueurs', deaths: 'Morts' },
  '2v8_killer': { killer: 'Tueur de Saw', killer2: 'Tueur du mate', gameplay: 'Gameplay de Saw', deaths: 'Tués' },
}
const labels = computed(() => LABELS[draft.mode])

const escapesHint = computed(() => {
  const escapes = survivors.value - draft.deaths
  return `${escapes} sortie${escapes > 1 ? 's' : ''}`
})

// Choices

function range(max: number) {
  return Array.from({ length: max + 1 }, (_, value) => ({ value, label: String(value) }))
}

const yesNo = [
  { value: true, label: 'Oui' },
  { value: false, label: 'Non' },
]
const modeItems = GAME_MODES.map((value) => ({ value, label: GAME_MODE_LABELS[value] }))
const hookSkipItems = HOOK_SKIPS.map((value) => ({ value, label: HOOK_SKIP_LABELS[value] }))
const funItems = FUN.map((value) => ({ value, label: FUN_LABELS[value] }))
const ignoredItems = [0, 1, 2].map((value) => ({ value, label: IGNORED_SURVIVORS_LABELS[value]! }))

const PARTIES_1V4 = ['solo', 'duo', 'trio', 'quatuor', 'viewers'] as const
const partyItems = computed(() =>
  (draft.mode === '1v4' ? PARTIES_1V4 : PARTY_SIZES).map((value) => ({ value, label: PARTY_SIZE_LABELS[value] })),
)

const gameplayItems = computed(() =>
  (draft.mode === '2v8_killer'
    ? (['fairplay', 'tunnel', 'slug', 'camp', 'cheater'] as const)
    : (['tunnel', 'slug', 'camp', 'cheater'] as const)
  ).map((value) => ({ value, label: GAMEPLAY_TAG_LABELS[value] })),
)

const behaviorItems = computed(() => [
  { value: null, label: NO_KILLER_BEHAVIOR_LABEL },
  ...KILLER_BEHAVIORS.filter((value) => value !== 'ragequit_abandon' || draft.mode === '2v8_survivor').map((value) => ({
    value,
    label: KILLER_BEHAVIOR_LABELS[value],
  })),
])

// Most used first. In 2v8, only what exists there (plus the current value of an old game).
function byUsage<T extends { id: number; games: number }>(rows: T[], keep: (row: T) => boolean) {
  return rows.filter(keep).sort((a, b) => b.games - a.games)
}

const killerItems = computed(() =>
  byUsage(reference.value?.killers ?? [], (killer) =>
    draft.mode === '1v4' || killer.in2v8 || [draft.killerId, draft.killer2Id].includes(killer.id),
  ),
)
const mapItems = computed(() =>
  byUsage(reference.value?.maps ?? [], (map) => draft.mode === '1v4' || map.in2v8 || map.id === draft.mapId),
)
const mateItems = computed(() => [
  { value: null, label: 'Random' },
  ...byUsage(reference.value?.mates ?? [], (mate) => !mate.archived || mate.id === draft.mateId).map((mate) => ({
    value: mate.id as number | null,
    label: mate.name,
  })),
])

// Running events first, then the most recent ones.
const eventItems = computed(() =>
  [...(reference.value?.events ?? [])].sort(
    (a, b) =>
      Number(isEventActive(b)) - Number(isEventActive(a)) || (b.startsOn ?? '').localeCompare(a.startsOn ?? ''),
  ),
)

// The select works with undefined for "nothing selected" (its clear button sets null);
// the draft always uses null for "no event".
const eventId = computed({
  get: () => draft.eventId ?? undefined,
  set: (value) => (draft.eventId = value ?? null),
})

// Keeping the draft valid

// A new mode keeps what still applies and resets the rest.
watch(
  () => draft.mode,
  (mode) => {
    if (mode === '1v4' && !(PARTIES_1V4 as readonly string[]).includes(draft.party)) draft.party = 'solo'
    if (mode !== '1v4') {
      const in2v8 = (rows: { id: number; in2v8: boolean }[] = [], id?: number) =>
        rows.some((row) => row.id === id && row.in2v8)
      if (!in2v8(reference.value?.killers, draft.killerId)) draft.killerId = undefined
      if (!in2v8(reference.value?.killers, draft.killer2Id)) draft.killer2Id = undefined
      if (!in2v8(reference.value?.maps, draft.mapId)) draft.mapId = undefined
    }
    if (mode !== '2v8_killer') draft.gameplay = draft.gameplay.filter((tag) => tag !== 'fairplay')
    if (mode !== '2v8_survivor' && draft.killerBehavior === 'ragequit_abandon') draft.killerBehavior = null
    draft.deaths = Math.min(draft.deaths, survivorCount(mode))
    draft.survivorAbandons = Math.min(draft.survivorAbandons, survivorCount(mode))
    draft.generatorsLeft = Math.min(draft.generatorsLeft, generatorCount(mode))
  },
)

watch(
  () => draft.sawEscaped,
  (escaped) => {
    if (!escaped) draft.hatchEscape = false
  },
)

const parsed = computed(() => gameSchema.safeParse(draftToInput(draft, isNew)))
const warnings = computed(() => (parsed.value.success ? gameWarnings(parsed.value.data) : []))

// Field errors, shown after a failed save and cleared on the next change.
const errors = ref<Record<string, string>>({})
watch(draft, () => (errors.value = {}), { deep: true })

// Saving

const saving = ref(false)
const confirmDelete = ref(false)

function nameOf(rows: { id: number; name: string }[] | undefined, id: number | undefined) {
  return rows?.find((row) => row.id === id)?.name ?? '?'
}

function failed() {
  toast.add({ title: 'Une erreur est survenue.', color: 'error', icon: 'i-lucide-circle-alert' })
}

async function submit(next: boolean) {
  if (saving.value) return
  const result = parsed.value
  if (!result.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const field = String(issue.path[0])
      fieldErrors[field] = draft[field as keyof GameDraft] === undefined ? 'Obligatoire' : 'Valeur invalide'
    }
    errors.value = fieldErrors
    toast.add({ title: 'Il manque des informations.', color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }

  saving.value = true
  try {
    if (isNew) {
      const { id } = await $fetch('/api/admin/games', { method: 'POST', body: result.data })
      savedToast(id)
      if (next) {
        Object.assign(draft, newDraft(draft))
        window.scrollTo({ top: 0 })
      } else {
        await navigateTo('/admin')
      }
    } else {
      await $fetch(`/api/admin/games/${props.gameId}`, { method: 'PUT', body: result.data })
      toast.add({ title: 'Partie modifiée', color: 'success', icon: 'i-lucide-check' })
      await leave()
    }
  } catch {
    failed()
  } finally {
    saving.value = false
  }
}

// "Annuler" deletes the game that was just created.
function savedToast(id: number) {
  const description = `${nameOf(reference.value?.killers, draft.killerId)} · ${nameOf(reference.value?.maps, draft.mapId)}`
  toast.add({
    title: 'Partie enregistrée',
    description,
    color: 'success',
    icon: 'i-lucide-check',
    actions: [
      { label: 'Modifier', color: 'neutral', variant: 'outline', onClick: () => navigateTo(`/admin/games/${id}`) },
      {
        label: 'Annuler',
        color: 'neutral',
        variant: 'outline',
        onClick: async () => {
          try {
            await $fetch(`/api/admin/games/${id}`, { method: 'DELETE' })
            toast.add({ title: 'Partie annulée', description, color: 'neutral', icon: 'i-lucide-undo-2' })
          } catch {
            failed()
          }
        },
      },
    ],
  })
}

// Back to where the edit was opened from (the filtered list), or to the list.
const router = useRouter()
async function leave() {
  if (window.history.state?.back) router.back()
  else await navigateTo('/admin/games')
}

async function remove() {
  saving.value = true
  try {
    await $fetch(`/api/admin/games/${props.gameId}`, { method: 'DELETE' })
    toast.add({ title: 'Partie supprimée', color: 'success', icon: 'i-lucide-check' })
    await leave()
  } catch {
    failed()
  } finally {
    saving.value = false
  }
}

// Ctrl+Enter (⌘+Enter on Mac) saves, even from a text field.
defineShortcuts({ meta_enter: { usingInput: true, handler: () => submit(isNew) } })
</script>
