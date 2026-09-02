<template>
  <a-modal
    :open="open"
    :footer="null"
    :width="720"
    centered
    :title="null"
    @cancel="emit('update:open', false)">

    <div v-if="user" class="user-profile-modal">
      <!-- 左栏：头像 + 姓名 + 角色 -->
      <div class="left-panel">
        <a-avatar :size="140" :src="getAvatarSrc(user.userAvatar)" :alt="(user.userName || '') + ' 头像'" />
        <div class="user-name">{{ user.userName }}</div>
        <a-tag v-if="user.userRole === 'user'" color="green">用户</a-tag>
        <a-tag v-else-if="user.userRole === 'admin'" color="blue">管理员</a-tag>
      </div>

      <!-- 分隔线 -->
      <a-divider type="vertical" class="divider" />

      <!-- 右栏：两列信息字段 -->
      <div class="right-panel">
        <a-descriptions :column="2" layout="vertical" size="small">
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

<script lang="ts" setup>
import { computed } from 'vue'
import dayjs from 'dayjs'
import annoImg from '@/assets/anno.png'
import type { PreservedUser } from '@/types/long-preserve'

const props = defineProps<{
  open: boolean
  user: PreservedUser | null
}>()

const emit = defineEmits<{
  'update:open': [boolean]
}>()

// 头像地址校验：空或格式非法回退占位图
const getAvatarSrc = (url?: string) => {
    if (!url) return annoImg
    try {
        new URL(url)
        return url
    } catch {
        return annoImg
    }
}

// 详情右栏字段：头像/姓名/角色已在左栏展示，这里放其余业务字段
const fields = computed(() => {
    const u = props.user
    if (!u) return []
    const fmt = (time?: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : ''
    return [
        { label: 'id', value: u.id },
        { label: '账号', value: u.userAccount },
        { label: '简介', value: u.userProfile },
        { label: 'VIP到期时间', value: fmt(u.vipExpireTime) },
        { label: 'VIP编码', value: u.vipCode },
        { label: 'VIP ID', value: u.vipId },
        { label: '分享码', value: u.shareCode },
        { label: '邀请人', value: u.inviteUser },
        { label: '编辑时间', value: fmt(u.editTime) },
        { label: '创建时间', value: fmt(u.createTime) },
        { label: '更新时间', value: fmt(u.updateTime) },
    ]
})
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
