<!-- Toggle chips for a list of values. An exclusive value clears the others. `none` adds a
     first chip, selected when the list is empty, that clears it: it's never stored. -->
<template>
  <div class="flex flex-wrap gap-1.5" role="group" :aria-label="label">
    <UButton
      v-if="none"
      :label="none"
      :icon="model.length === 0 ? 'i-lucide-check' : undefined"
      :color="model.length === 0 ? 'primary' : 'neutral'"
      :variant="model.length === 0 ? 'solid' : 'outline'"
      :aria-pressed="model.length === 0"
      @click="model = []"
    />
    <UButton
      v-for="item in items"
      :key="item.value"
      :label="item.label"
      :icon="model.includes(item.value) ? 'i-lucide-check' : undefined"
      :color="model.includes(item.value) ? 'primary' : 'neutral'"
      :variant="model.includes(item.value) ? 'solid' : 'outline'"
      :aria-pressed="model.includes(item.value)"
      @click="toggle(item.value)"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends string">
const props = defineProps<{ items: { value: T; label: string }[]; exclusive?: T[]; none?: string; label?: string }>()
const model = defineModel<T[]>({ required: true })

function toggle(value: T) {
  if (model.value.includes(value)) {
    model.value = model.value.filter((item) => item !== value)
  } else if (props.exclusive?.includes(value)) {
    model.value = [value]
  } else {
    model.value = [...model.value.filter((item) => !props.exclusive?.includes(item)), value]
  }
}
</script>
