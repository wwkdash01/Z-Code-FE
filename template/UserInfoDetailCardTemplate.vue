<template>
  <a-modal
    :open="visible"
    :footer="null"
    :width="720"
    centered
    :title="null"
    @cancel="handleCancel"
  >
    <div class="user-profile-modal">
      <!-- 左栏：头像 + 姓名 + 角色 -->
      <div class="left-panel">
        <a-avatar :size="140" :src="user.avatar" :alt="user.name + ' 头像'" />
        <div class="user-name">{{ user.name }}</div>
        <a-tag color="success">{{ user.role }}</a-tag>
      </div>

      <!-- 分隔线 -->
      <a-divider type="vertical" class="divider" />

      <!-- 右栏：两列信息字段 -->
      <div class="right-panel">
        <a-descriptions :column="2" layout="vertical" size="small" bordered="false">
          <a-descriptions-item
            v-for="(field, index) in fields"
            :key="index"
            :label="field.label"
          >
            {{ field.value }}
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:visible', 'cancel'])

const user = ref({
  name: '姓名',
  role: '角色',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
})

const fields = ref([
  { label: '字段名称1', value: '字段内容1' },
  { label: '字段名称2', value: '字段内容2' },
  { label: '字段名称3', value: '字段内容3' },
  { label: '字段名称4', value: '字段内容4' },
  { label: '字段名称5', value: '字段内容5' },
  { label: '字段名称6', value: '字段内容6' },
  { label: '字段名称7', value: '字段内容7' },
  { label: '字段名称8', value: '字段内容8' },
  { label: '字段名称9', value: '字段内容9' },
  { label: '字段名称10', value: '字段内容10' },
])

function handleCancel() {
  emit('update:visible', false)
  emit('cancel')
}
</script>

<style scoped>
.user-profile-modal {
  display: flex;
  align-items: stretch;
  gap: 32px;
  min-height: 420px;
}

.left-panel {
  flex-shrink: 0;
  width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.left-panel :deep(.ant-avatar) {
  border: 3px solid #f0f0f0;
  margin-bottom: 16px;
}

.user-name {
  font-size: 22px;
  font-weight: 600;
  line-height: 30px;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 8px;
}

.divider {
  margin: 0 !important;
  top: 0 !important;
  height: auto !important;
  align-self: stretch;
}

.right-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.right-panel :deep(.ant-descriptions) {
  width: 100%;
}

.right-panel :deep(.ant-descriptions-item-label) {
  font-size: 12px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.45);
  padding-bottom: 6px !important;
}

.right-panel :deep(.ant-descriptions-item-content) {
  font-size: 14px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.88);
  padding-bottom: 18px !important;
}
</style>
