<template>
  <a-modal
    :open="open"
    :width="760"
    centered
    wrap-class-name="admin-scope"
    :title="null"
    ok-text="保存"
    cancel-text="取消"
    :confirm-loading="saving"
    @ok="handleSave"
    @cancel="emit('update:open', false)"
  >
    <a-spin :spinning="loading">
      <div v-if="hasDetail" class="user-detail-edit">
        <!-- 左栏：头像 + 昵称（角色不再在这里重复展示，改由右栏下拉以 tag 呈现） -->
        <div class="left-panel">
          <div class="avatar-wrapper" @click="handleAvatarClick">
            <a-avatar :size="140" :src="avatarSrc" :alt="(draft.userName || '') + ' 头像'" />
            <div class="avatar-mask">
              <CameraOutlined style="font-size: 22px" />
              <span>更换头像</span>
            </div>
          </div>
          <div class="avatar-hint">点击头像可更换（当前为 mock）</div>

          <div class="user-name">{{ display(detail.userName) }}</div>
        </div>

        <a-divider type="vertical" class="divider" />

        <!-- 右栏：可修改字段（无边框，点「保存」统一提交） + 只读字段 -->
        <div class="right-panel">
          <div class="field-grid">
            <div class="field-item">
              <span class="field-label">昵称</span>
              <a-input
                v-model:value="draft.userName"
                placeholder="请输入昵称"
                :bordered="false"
                :disabled="saving"
              />
            </div>

            <div class="field-item">
              <span class="field-label">账号</span>
              <a-input
                v-model:value="draft.userAccount"
                placeholder="请输入账号"
                :bordered="false"
                :disabled="saving"
              />
            </div>

            <div class="field-item">
              <span class="field-label">角色</span>
              <!-- 选中值保持原始枚举字符串（保存时直接提交），下拉项与回显都渲染成 tag -->
              <a-select
                v-model:value="draft.userRole"
                placeholder="未设置"
                :bordered="false"
                :disabled="saving"
                :options="USER_ROLE_OPTIONS"
              >
                <!-- 下拉列表每一项 -->
                <template #option="{ value }">
                  <UserRoleOption :value="value" />
                </template>
                <!-- 选中值回显（单选走 optionLabel，不走 tagRender） -->
                <template #optionLabel="{ value }">
                  <UserRoleOption v-if="value !== undefined" :value="value" />
                </template>
              </a-select>
            </div>

            <div class="field-item">
              <span class="field-label">用户 ID</span>
              <span class="field-text field-text--readonly">{{ display(detail.id) }}</span>
            </div>

            <div class="field-item field-item--full">
              <span class="field-label">头像 URL</span>
              <a-input
                v-model:value="draft.userAvatar"
                placeholder="请输入头像图片 URL"
                :bordered="false"
                :disabled="saving"
              />
            </div>

            <div class="field-item field-item--full">
              <span class="field-label">简介</span>
              <a-input
                v-model:value="draft.userProfile"
                placeholder="请输入简介"
                :bordered="false"
                :disabled="saving"
              />
            </div>

            <!-- 只读字段：更新接口（UserUpdateRequestDTO）里没有这些字段，只能展示 -->
            <div class="field-item">
              <span class="field-label">VIP 到期时间</span>
              <span class="field-text field-text--readonly">{{ formatTime(detail.vipExpireTime) }}</span>
            </div>

            <div class="field-item">
              <span class="field-label">VIP 编码</span>
              <span class="field-text field-text--readonly">{{ display(detail.vipCode) }}</span>
            </div>

            <div class="field-item">
              <span class="field-label">VIP ID</span>
              <span class="field-text field-text--readonly">{{ display(detail.vipId) }}</span>
            </div>

            <div class="field-item">
              <span class="field-label">分享码</span>
              <span class="field-text field-text--readonly">{{ display(detail.shareCode) }}</span>
            </div>

            <div class="field-item">
              <span class="field-label">邀请人</span>
              <span class="field-text field-text--readonly">{{ display(detail.inviteUser) }}</span>
            </div>

            <div class="field-item">
              <span class="field-label">编辑时间</span>
              <span class="field-text field-text--readonly">{{ formatTime(detail.editTime) }}</span>
            </div>

            <div class="field-item">
              <span class="field-label">创建时间</span>
              <span class="field-text field-text--readonly">{{ formatTime(detail.createTime) }}</span>
            </div>

            <div class="field-item">
              <span class="field-label">更新时间</span>
              <span class="field-text field-text--readonly">{{ formatTime(detail.updateTime) }}</span>
            </div>
          </div>
        </div>
      </div>

      <a-empty v-else-if="!loading" :description="EMPTY_TEXT" />
    </a-spin>
  </a-modal>
</template>

<script lang="ts" setup>
import { ref, reactive, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import { CameraOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { getInfo, update } from '@/api/userController'
import { USER_ROLE_OPTIONS } from '@/config/userRole'
import UserRoleOption from '@/components/admin/UserRoleOption.vue'
import annoImg from '@/assets/anno.png'
import type { PreservedUser } from '@/types/long-preserve'

const props = defineProps<{
  open: boolean
  userId?: string | number
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  success: []
}>()

// 空字段统一占位符：弹窗内容里缺值一律显示「无」
const EMPTY_TEXT = '无'

// 空值统一走这里：null / undefined / 空字符串 / 纯空格 → 无
const display = (value?: string | number | null) => {
  if (value === null || value === undefined) return EMPTY_TEXT
  const text = String(value).trim()
  return text === '' ? EMPTY_TEXT : text
}

const formatTime = (time?: string) =>
  time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : EMPTY_TEXT

// 完整详情（接口返回）：只读字段直接读它，也是改动比对与重置的基准
const origin = ref<PreservedUser | null>(null)

// 模板中安全访问的详情（无数据时为占位对象）
const detail = computed<PreservedUser>(() => origin.value ?? {})

// 详情是否已加载
const hasDetail = computed(() => origin.value !== null)

// 可修改字段的编辑草稿（点「保存」前只改这里，不落库）
const draft = reactive({
  userAccount: '',
  userName: '',
  userAvatar: '',
  userProfile: '',
  userRole: undefined as string | undefined,
})

const loading = ref(false)

// 保存中（挂到弹窗确定的 loading 上）
const saving = ref(false)

// 头像地址校验：空或格式非法回退占位图
const avatarSrc = computed(() => {
  const url = draft.userAvatar
  if (!url) return annoImg
  try {
    new URL(url)
    return url
  } catch {
    return annoImg
  }
})

// 以详情为基准重置草稿（打开详情时、保存失败时共用）
const resetDraft = () => {
  const user = origin.value
  draft.userAccount = user?.userAccount ?? ''
  draft.userName = user?.userName ?? ''
  draft.userAvatar = user?.userAvatar ?? ''
  draft.userProfile = user?.userProfile ?? ''
  draft.userRole = user?.userRole ?? undefined
}

// 拉取详情并回填草稿
const fetchDetail = async () => {
  if (!props.userId) return
  loading.value = true
  try {
    const res = await getInfo({ id: props.userId })
    if (res.data.code === 200 && res.data.data) {
      origin.value = res.data.data as unknown as PreservedUser
      resetDraft()
    } else {
      message.error('获取详情失败：' + res.data.message)
    }
  } catch {
    message.error('获取详情失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      origin.value = null
      resetDraft()
      fetchDetail()
    }
  },
  { immediate: true },
)

// 头像点击：仅打提示，不做真实上传（与既有 mock 行为一致）
const handleAvatarClick = () => {
  message.info('模拟头像变更')
}

// 点击「保存」：校验 → 汇总改动字段 → 提交 → 成功关闭弹窗 / 失败重置卡片
const handleSave = async () => {
  const user = origin.value
  if (!user?.id || saving.value) return

  const userName = draft.userName.trim()
  if (!userName) {
    message.warning('昵称不能为空')
    return
  }

  const userAccount = draft.userAccount.trim()
  if (userAccount.length < 6 || userAccount.length > 32) {
    message.warning('账号长度需为 6 ~ 32 位')
    return
  }

  const userProfile = draft.userProfile.trim()
  const userAvatar = draft.userAvatar.trim()
  const userRole = draft.userRole ?? undefined

  // 只提交发生变化的字段
  const body: API.UserUpdateRequestDTO = {}
  if (userAccount !== (user.userAccount ?? '')) body.userAccount = userAccount
  if (userName !== (user.userName ?? '')) body.userName = userName
  if (userAvatar !== (user.userAvatar ?? '')) body.userAvatar = userAvatar
  if (userProfile !== (user.userProfile ?? '')) body.userProfile = userProfile
  if (userRole !== (user.userRole ?? undefined)) body.userRole = userRole

  // 无改动：直接关闭，不发请求
  if (Object.keys(body).length === 0) {
    emit('update:open', false)
    return
  }

  saving.value = true
  try {
    const res = await update({ id: user.id }, body)
    if (res.data.data) {
      emit('update:open', false)
      message.success('保存成功')
      emit('success')
    } else {
      resetDraft()
      message.error('保存失败：' + res.data.message)
    }
  } catch {
    resetDraft()
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.user-detail-edit {
  display: flex;
  align-items: stretch;
  gap: 28px;
  min-height: 380px;
}

/* ========== 左栏：头像 + 昵称 + 角色 ========== */
.left-panel {
  flex-shrink: 0;
  width: 190px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
}

.avatar-wrapper {
  position: relative;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  border: 3px solid var(--color-border);
  transition: border-color 0.2s;
}

.avatar-wrapper:hover {
  border-color: var(--color-primary);
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
  color: var(--color-text-tertiary);
  line-height: 1.6;
}

.user-name {
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  color: var(--color-text);
  word-break: break-all;
}

.divider {
  margin: 0 !important;
  top: 0 !important;
  height: auto !important;
  align-self: stretch;
}

/* ========== 右栏：字段网格 ========== */
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
  gap: 4px 24px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 4px 0;
}

.field-item--full {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-tertiary);
}

.field-text {
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text);
  word-break: break-all;
}

.field-text--readonly {
  color: var(--color-text-secondary);
}

/* 无边框输入：hover 时给一层浅色底，提示可编辑 */
.user-detail-edit :deep(.ant-input),
.user-detail-edit :deep(.ant-select-selector) {
  padding-left: 0;
  transition: background-color 0.2s;
}

.user-detail-edit :deep(.ant-input:not(:disabled)):hover,
.user-detail-edit :deep(.ant-select:not(.ant-select-disabled):hover .ant-select-selector) {
  background-color: rgba(0, 0, 0, 0.03);
}

.user-detail-edit :deep(.ant-select-selector) {
  background-color: transparent;
}
</style>
