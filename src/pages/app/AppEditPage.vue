<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined,
  ExportOutlined,
  CopyOutlined,
  CloudUploadOutlined,
  DownOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import {
  getAppById,
  getAppByAdmin,
  previewApp,
  deployApp,
  updateAppById,
  updateAppByAdmin,
} from '@/api/appController'
import { getImgDegradation } from '@/utils/getImgDegradation'
import annoImg from '@/assets/anno.png'
import { useLoginUserStore } from '@/stores/loginUser'
import type { PreservedApp, PreservedAppVO } from '@/types/long-preserve'
import ChatBoard from '@/components/Chat/ChatBoard.vue'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

// ========== 基础状态 ==========
const appId = ref('')
const app = ref<PreservedAppVO | null>(null)
const previewUrl = ref('')
const iframeKey = ref(0)
const deploying = ref(false)

// ========== 权限 / 模式 ==========
const isViewMode = computed(() => route.query.view === '1')
const isAdmin = computed(() => loginUserStore.loginUser.userRole === 'admin')
const isOwner = computed(
  () => !!app.value?.userName && app.value.userName === loginUserStore.loginUser.userName,
)
// 非本人作品禁用对话输入（查看模式）
const chatDisabled = computed(() => !isOwner.value)
// 仅创建流（无 view 参数）且本人作品时自动发送初始提示词
const initialPrompt = computed(() =>
  !isViewMode.value && isOwner.value ? app.value?.initPrompt || undefined : undefined,
)

const appCover = computed(() => (app.value?.cover ? getImgDegradation(app.value.cover) : annoImg))

// ========== 应用信息弹卡编辑 ==========
const canEdit = computed(() => isOwner.value || isAdmin.value)
const editForm = reactive({ appName: '', cover: '', priority: 0 })
const editSnapshot = reactive({ appName: '', cover: '', priority: 0 })

function syncEditFormFromApp() {
  editForm.appName = app.value?.appName || ''
  editForm.cover = app.value?.cover || ''
  editSnapshot.appName = editForm.appName
  editSnapshot.cover = editForm.cover
  editSnapshot.priority = editForm.priority
}

function rollbackEditForm() {
  editForm.appName = editSnapshot.appName
  editForm.cover = editSnapshot.cover
  editForm.priority = editSnapshot.priority
}

// owner（非 admin）失焦保存应用名称
async function handleAppNameBlur() {
  const name = editForm.appName.trim()
  if (!name || name === editSnapshot.appName) return
  if (isAdmin.value) return saveAdminChanges()
  try {
    const res = await updateAppById({ id: appId.value }, { appName: name })
    if (res.data.data) {
      editSnapshot.appName = name
      if (app.value) app.value.appName = name
      message.success('更新成功')
    } else {
      message.error('更新失败：' + res.data.message)
      editForm.appName = editSnapshot.appName
    }
  } catch {
    message.error('更新失败')
    editForm.appName = editSnapshot.appName
  }
}

// admin 失焦保存名称/封面/优先级
async function saveAdminChanges() {
  const unchanged =
    editForm.appName.trim() === editSnapshot.appName &&
    (editForm.cover || '') === editSnapshot.cover &&
    editForm.priority === editSnapshot.priority
  if (unchanged) return
  try {
    const res = await updateAppByAdmin(
      { id: appId.value },
      {
        appName: editForm.appName.trim() || undefined,
        cover: editForm.cover || undefined,
        priority: editForm.priority,
      },
    )
    if (res.data.data) {
      editSnapshot.appName = editForm.appName.trim()
      editSnapshot.cover = editForm.cover || ''
      editSnapshot.priority = editForm.priority
      if (app.value) {
        app.value.appName = editSnapshot.appName
        app.value.cover = editSnapshot.cover
      }
      message.success('更新成功')
    } else {
      message.error('更新失败：' + res.data.message)
      rollbackEditForm()
    }
  } catch {
    message.error('更新失败')
    rollbackEditForm()
  }
}

// ========== 数据加载 ==========
async function fetchApp() {
  const id = route.query.id as string
  if (!id) {
    message.error('应用 ID 无效')
    router.push('/')
    return
  }
  appId.value = id
  try {
    const res = await getAppById({ id } as unknown as API.getAppByIdParams)
    if (res.data.code === 200 && res.data.data) {
      app.value = res.data.data as unknown as PreservedAppVO
    } else {
      message.error('获取应用信息失败：' + res.data.message)
    }
  } catch {
    message.error('获取应用信息失败')
    return
  }
  // admin 弹卡需要 priority 等全量字段
  if (isAdmin.value) {
    try {
      const admRes = await getAppByAdmin({ id })
      if (admRes.data.code === 200 && admRes.data.data) {
        editForm.priority = (admRes.data.data as unknown as PreservedApp).priority ?? 0
      }
    } catch {
      // 优先级加载失败不阻塞页面
    }
  }
  syncEditFormFromApp()
  // 已生成过的应用进入页面时静默尝试加载预览（失败不提示）
  loadPreview(true)
}

// ========== 预览 ==========
async function loadPreview(silent = false) {
  if (!appId.value) return
  try {
    const res = await previewApp({ appId: appId.value } as unknown as API.previewAppParams)
    if (res.data.code === 200 && res.data.data) {
      previewUrl.value = res.data.data
      iframeKey.value++
    } else if (!silent) {
      message.warning('未获取到预览地址：' + res.data.message)
    }
  } catch {
    if (!silent) message.warning('预览加载失败')
  }
}

function reloadPreview() {
  iframeKey.value++
}

function openPreview() {
  if (previewUrl.value) window.open(previewUrl.value)
}

// ========== 部署 ==========
const deployUrl = ref('')
const deployModalOpen = ref(false)

async function handleDeploy() {
  if (!appId.value) return
  deploying.value = true
  try {
    const res = await deployApp({ appId: appId.value } as unknown as API.AppDeployRequestDTO)
    if (res.data.code === 200 && res.data.data) {
      deployUrl.value = res.data.data
      deployModalOpen.value = true
    } else {
      message.error('部署失败：' + res.data.message)
    }
  } catch {
    message.error('部署请求失败')
  } finally {
    deploying.value = false
  }
}

async function copyDeployUrl() {
  try {
    await navigator.clipboard.writeText(deployUrl.value)
    message.success('已复制部署地址')
  } catch {
    message.error('复制失败，请手动复制')
  }
}

function openDeployUrl() {
  if (deployUrl.value) window.open(deployUrl.value)
}

onMounted(async () => {
  if (!loginUserStore.loginUser.id) {
    await loginUserStore.fetchLoginUser()
  }
  await fetchApp()
})
</script>

<template>
  <div class="chat-page">
    <!-- ========== 核心内容区 ========== -->
    <div class="chat-body">
      <!-- 左侧：应用信息 + 对话区域 -->
      <aside class="chat-left">
        <div class="app-info-card">
          <a-avatar :size="40" :src="appCover" />
          <div class="app-info-main">
            <span class="app-info-name">{{ app?.appName || '未命名应用' }}</span>
            <span class="app-info-time">
              创建于 {{ app?.createTime ? dayjs(app.createTime).format('YYYY-MM-DD') : '-' }}
            </span>
          </div>
          <a-popover
            v-if="canEdit"
            trigger="click"
            placement="bottomRight"
            :arrow="false"
          >
            <template #content>
              <div class="app-edit-pop">
                <div class="pop-row">
                  <label class="edit-label">ID</label>
                  <span class="pop-value">{{ app?.id || '-' }}</span>
                </div>
                <div class="pop-row">
                  <label class="edit-label">应用名称</label>
                  <a-input
                    class="pop-input"
                    :bordered="false"
                    v-model:value="editForm.appName"
                    @blur="handleAppNameBlur"
                  />
                </div>
                <div class="pop-row">
                  <label class="edit-label">封面</label>
                  <a-input
                    v-if="isAdmin"
                    class="pop-input"
                    :bordered="false"
                    v-model:value="editForm.cover"
                    @blur="saveAdminChanges"
                  />
                  <span v-else class="pop-value">{{ app?.cover || '无' }}</span>
                </div>
                <div v-if="isAdmin" class="pop-row">
                  <label class="edit-label">优先级</label>
                  <a-input-number
                    class="pop-input"
                    :bordered="false"
                    :min="0"
                    :max="99"
                    v-model:value="editForm.priority"
                    @blur="saveAdminChanges"
                  />
                </div>
                <div class="pop-row">
                  <label class="edit-label">生成类型</label>
                  <span class="pop-value">{{ app?.codeGenType || '-' }}</span>
                </div>
                <div class="pop-row">
                  <label class="edit-label">应用标签</label>
                  <span class="pop-value">{{ app?.appTag || '-' }}</span>
                </div>
                <div class="pop-row">
                  <label class="edit-label">部署Key</label>
                  <span class="pop-value">{{ app?.deployKey || '未部署' }}</span>
                </div>
                <div class="pop-row">
                  <label class="edit-label">创建时间</label>
                  <span class="pop-value">
                    {{ app?.createTime ? dayjs(app.createTime).format('YYYY-MM-DD HH:mm') : '-' }}
                  </span>
                </div>
                <div class="pop-row">
                  <label class="edit-label">创建者</label>
                  <span class="pop-value">{{ app?.userName || '-' }}</span>
                </div>
                <div class="pop-block">
                  <label class="edit-label">初始提示词</label>
                  <div class="pop-prompt">{{ app?.initPrompt || '-' }}</div>
                </div>
              </div>
            </template>
            <a-button type="text" size="small">
              <template #icon><DownOutlined /></template>
            </a-button>
          </a-popover>
        </div>
        <div class="chat-board-card">
          <ChatBoard
            v-if="appId"
            :app-id="appId"
            :initial-prompt="initialPrompt"
            :disabled="chatDisabled"
            disabled-tip="无法在别人的作品下对话哦~"
            @stream-complete="loadPreview()"
          />
        </div>
      </aside>

      <!-- 右侧：网页展示区域 -->
      <main class="chat-right">
        <div class="preview-toolbar">
          <a-button size="small" :disabled="!previewUrl" @click="reloadPreview">
            <template #icon><ReloadOutlined /></template>
          </a-button>
          <a-input
            class="preview-url-input"
            size="small"
            read-only
            :value="previewUrl || '预览区：网站生成完成后自动展示'"
          />
          <a-button size="small" :disabled="!previewUrl" @click="openPreview">
            <template #icon><ExportOutlined /></template>
          </a-button>
          <a-button
            type="primary"
            :loading="deploying"
            :disabled="!isOwner"
            @click="handleDeploy"
          >
            <template #icon><CloudUploadOutlined /></template>
            部署
          </a-button>
        </div>
        <div class="preview-body">
          <iframe v-if="previewUrl" :key="iframeKey" :src="previewUrl" class="preview-iframe" />
          <div v-else class="preview-placeholder">AI 回复结束后，生成的网站将自动展示在这里</div>
        </div>
      </main>
    </div>

    <!-- ========== 部署结果弹窗 ========== -->
    <a-modal v-model:open="deployModalOpen" title="部署成功" :footer="null">
      <p class="deploy-modal-hint">应用已部署，可通过以下地址访问：</p>
      <div class="deploy-url-row">
        <a-input read-only :value="deployUrl" />
        <a-button @click="copyDeployUrl">
          <template #icon><CopyOutlined /></template>
          复制
        </a-button>
        <a-button type="primary" @click="openDeployUrl">打开</a-button>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: calc(100vh - 56px - 70px - 48px);
  min-height: 560px;
}

/* ========== 核心内容区 ========== */
.chat-body {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

/* 左右面板占比 1:4 */
.chat-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  min-height: 0;
}

.app-info-card {
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-info-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-info-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-info-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

/* 弹卡应用详情：全部 VO 字段，可编辑字段为无边框 input */
.app-edit-pop {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pop-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-label {
  flex-shrink: 0;
  width: 64px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.pop-value {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pop-input {
  flex: 1;
  min-width: 0;
}

.pop-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pop-prompt {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.5;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-board-card {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  min-height: 0;
}

/* ========== 右侧预览 ========== */
.chat-right {
  flex: 4;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.preview-url-input {
  flex: 1;
}

.preview-body {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  position: relative;
  min-height: 0;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.preview-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(0, 0, 0, 0.35);
  font-size: 14px;
}

/* ========== 部署弹窗 ========== */
.deploy-modal-hint {
  color: rgba(0, 0, 0, 0.65);
}

.deploy-url-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ========== 响应式 ========== */
@media (max-width: 900px) {
  .chat-body {
    flex-direction: column;
  }

  .chat-left {
    min-height: 400px;
  }

  .chat-page {
    height: auto;
  }
}
</style>
