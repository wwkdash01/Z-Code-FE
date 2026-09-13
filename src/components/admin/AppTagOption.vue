<script setup lang="ts">
import { computed } from 'vue'
import { getAppTagMeta } from '@/config/appTag'
import { tagStyle } from '@/config/theme'

/**
 * 应用标签的下拉选项内容：把选项渲染成 tag 而不是纯文字。
 * 下拉菜单里每一项、以及选中值回显，共用同一份配置与渲染。
 */
const props = defineProps<{ value?: unknown }>()

const tagMeta = computed(() =>
  getAppTagMeta(props.value === undefined ? undefined : String(props.value)),
)
</script>

<template>
  <a-tag v-if="tagMeta" :style="tagStyle(tagMeta)">
    <component :is="tagMeta.icon" />
    {{ tagMeta.label }}
  </a-tag>
  <span v-else>{{ props.value }}</span>
</template>

<style scoped>
:deep(.ant-tag) {
  margin-inline-end: 0;
}
</style>
