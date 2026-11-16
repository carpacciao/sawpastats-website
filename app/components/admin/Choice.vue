<!-- One-tap choice between a few values: a row of buttons, the selected one filled. -->
<template>
  <div class="flex flex-wrap gap-1.5" role="radiogroup" :aria-label="label">
    <UButton
      v-for="item in items"
      :key="String(item.value)"
      :label="item.label"
      :color="item.value === model ? 'primary' : 'neutral'"
      :variant="item.value === model ? 'solid' : 'outline'"
      role="radio"
      :aria-checked="item.value === model"
      :disabled="disabled"
      :size="size"
      class="min-w-10 justify-center"
      @click="model = item.value"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends string | number | boolean | null">
import type { ButtonProps } from '@nuxt/ui'

defineProps<{ items: { value: T; label: string }[]; label?: string; disabled?: boolean; size?: ButtonProps['size'] }>()
const model = defineModel<T>({ required: true })
</script>
