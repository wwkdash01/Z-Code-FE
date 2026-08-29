<template>
  <a-modal
    :open="open"
    :width="720"
    centered
    title="编辑用户"
    @cancel="emit('update:open', false)">

    <div v-if="user" class="user-edit-modal">
      <!-- 左栏：头像 + 用户名 + 角色 -->
      <div class="left-panel">
        <!-- 头像：点击仅记录"模拟头像变更" -->
        <div class="avatar-wrapper" @click="handleAvatarClick">
          <a-avatar :size="140" :src="getAvatarSrc(user.userAvatar)" alt="用户头像" />
          <div class="avatar-mask">
            <CameraOutlined style="font-size: 22px" />
            <span>更换头像</span>
          </div>
        </div>
        <div class="avatar-hint">点击头像可更换</div>

        <a-input
          v-model:value="editForm.userName"
          placeholder="用户名"
          :bordered="false"
          :style="{ textAlign: 'center', fontWeight: 600, fontSize: '16px' }"
        />

        <!-- 角色：点击 tag 打开下拉切换（渲染与管理页一致） -->
        <a-dropdown trigger="click">
          <a-tag
            v-if="editForm.userRole === 'user'"
            color="green"
            class="role-tag"
          >用户</a-tag>
          <a-tag
            v-else-if="editForm.userRole === 'admin'"
            color="blue"
            class="role-tag"
          >管理员</a-tag>
          <template #overlay>
            <a-menu @click="handleRoleClick">
              <a-menu-item key="user">用户</a-menu-item>
              <a-menu-item key="admin">管理员</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>

      <!-- 分隔线 -->
      <a-divider type="vertical" class="divider" />

      <!-- 右栏：账号、简介 -->
      <div class="right-panel">
        <div class="field-grid">
          <div class="field-item">
            <span class="field-label">账号</span>
            <a-input v-model:value="editForm.userAccount" placeholder="请输入账号" :bordered="false" />
          </div>
          <div class="field-item">
            <span class="field-label">简介</span>
            <a-input v-model:value="editForm.userProfile" placeholder="请输入简介" :bordered="false" />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <a-button @click="emit('update:open', false)">取消</a-button>
      <a-button type="primary" :loading="saving" @click="submitEdit">保存</a-button>
    </template>
  </a-modal>
</template>

<script lang="ts" setup>
import { ref, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CameraOutlined } from '@ant-design/icons-vue'
import { update } from '@/api/userController'
import annoImg from '@/assets/anno.png'

const props = defineProps<{
  open: boolean
  user: API.User | null
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  success: []
}>()

// 编辑表单（仅可编辑字段）
const editForm = reactive({
  userAccount: '',
  userName: '',
  userProfile: '',
  userRole: 'user',
})

// 是否点击过头像（模拟头像变更标记）
const avatarChanged = ref(false)

// 保存中
const saving = ref(false)

// 打开时回填当前行数据
watch(() => props.open, (val) => {
    if (val && props.user) {
        editForm.userAccount = props.user.userAccount ?? ''
        editForm.userName = props.user.userName ?? ''
        editForm.userProfile = props.user.userProfile ?? ''
        editForm.userRole = props.user.userRole ?? 'user'
        avatarChanged.value = false
    }
})

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

// 头像点击：仅打标记，不做真实上传
const handleAvatarClick = () => {
    avatarChanged.value = true
}

// 角色切换：菜单项 key 即角色值，写回草稿
const handleRoleClick = ({ key }: { key: string }) => {
    editForm.userRole = key
}

// 提交编辑（统一保存草稿到后端）
const submitEdit = async () => {
    if (!props.user?.id) return
    saving.value = true
    try {
        if (avatarChanged.value) {
            message.info('模拟头像变更')
        }
        const res = await update(
            { id: props.user.id },
            {
                userAccount: editForm.userAccount,
                userName: editForm.userName,
                userProfile: editForm.userProfile,
                userRole: editForm.userRole,
            }
        )
        if (res.data.data) {
            message.success('保存成功')
            emit('update:open', false)
            emit('success')
        } else {
            message.error('保存失败:' + res.data.message)
        }
    } finally {
        saving.value = false
    }
}
</script>

<style scoped>
.user-edit-modal {
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
  gap: 12px;
}

.avatar-wrapper {
  position: relative;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  border: 3px solid #f0f0f0;
  transition: all 0.2s;
}
.avatar-wrapper:hover {
  border-color: #1677ff;
}
.avatar-wrapper :deep(.ant-avatar) {
  width: 100% !important;
  height: 100% !important;
  line-height: 140px;
}
.avatar-wrapper :deep(.ant-avatar img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.25s;
}
.avatar-wrapper:hover .avatar-mask {
  opacity: 1;
}

.avatar-hint {
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.6;
}

/* 角色 tag：可点击 */
.role-tag {
  cursor: pointer;
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
  flex-direction: column;
  justify-content: center;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.45);
}
</style>
