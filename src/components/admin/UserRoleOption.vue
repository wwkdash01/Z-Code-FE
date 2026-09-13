<script setup lang="ts">
import { computed } from 'vue'
import { getUserRoleMeta } from '@/config/userRole'
import { tagStyle } from '@/config/theme'

/**
 * 用户角色的下拉选项内容：把选项渲染成 tag 而不是纯文字。
 * 下拉菜单里每一项、以及选中值回显，共用同一份配置与渲染。
 * 与「应用编辑页」的标签下拉（AppTagOption）保持同一套做法。
 */
const props = defineProps<{ value?: unknown }>()

const roleMeta = computed(() =>
  getUserRoleMeta(props.value === undefined ? undefined : String(props.value)),
)
</script>

<template>
  <a-tag v-if="roleMeta" :style="tagStyle(roleMeta)">
    {{ roleMeta.label }}
  </a-tag>
  <span v-else>{{ props.value }}</span>
</template>

<style scoped>
:deep(.ant-tag) {
  margin-inline-end: 0;
}
</style>
