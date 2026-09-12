<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  CopyOutlined,
  CloudUploadOutlined,
  DownOutlined,
  DesktopOutlined,
  CodeOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { getAppById, previewApp, deployApp, updateAppById } from '@/api/appController'
import { getImgDegradation } from '@/utils/getImgDegradation'
import annoImg from '@/assets/anno.png'
import { useLoginUserStore } from '@/stores/loginUser'
import type { PreservedAppVO } from '@/types/long-preserve'
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
// 预览区模式：desktop=iframe 渲染，code=占位
const previewMode = ref<'desktop' | 'code'>('code')

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

// ========== 应用信息弹卡 ==========
/** 卡片对本人与管理员可见；但只有本人渲染可编辑输入，看别人的作品一律静态渲染 */
const showDetail = computed(() => isOwner.value || isAdmin.value)
const editForm = reactive({ appName: '' })
const editSnapshot = reactive({ appName: '' })

function syncEditFormFromApp() {
  editForm.appName = app.value?.appName || ''
  editSnapshot.appName = editForm.appName
}

// 本人失焦保存应用名称（无论角色，统一走 user 接口）
async function handleAppNameBlur() {
  const name = editForm.appName.trim()
  if (!name || name === editSnapshot.appName) return
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
  <div class="app-edit-page">
    <!-- ========== 页面 header：应用信息 + 预览模式 + 操作 ========== -->
    <header class="app-header">
      <div class="header-left">
        <a-avatar :size="40" :src="appCover" />
        <div class="app-info-main">
          <span class="app-info-name">{{ app?.appName || '未命名应用' }}</span>
          <span class="app-info-time">
            创建于 {{ app?.createTime ? dayjs(app.createTime).format('YYYY-MM-DD') : '-' }}
          </span>
        </div>
        <a-popover
          v-if="showDetail"
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
                  v-if="isOwner"
                  class="pop-input"
                  :bordered="false"
                  v-model:value="editForm.appName"
                  @blur="handleAppNameBlur"
                />
                <span v-else class="pop-value">{{ app?.appName || '-' }}</span>
              </div>
              <div class="pop-row">
                <label class="edit-label">封面</label>
                <span class="pop-value">{{ app?.cover || '无' }}</span>
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

      <div class="header-right">
        <a-radio-group v-model:value="previewMode" size="small">
          <a-radio-button value="desktop">
            <DesktopOutlined />
          </a-radio-button>
          <a-radio-button value="code">
            <CodeOutlined />
          </a-radio-button>
        </a-radio-group>
        <div class="header-actions">
          <a-button size="small">
            <template #icon><VerticalAlignBottomOutlined /></template>
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
      </div>
    </header>

    <!-- ========== 核心内容区：对话 + 预览 ========== -->
    <div class="chat-body">
      <aside class="chat-left">
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

      <main class="chat-right">
        <div class="preview-body">
          <iframe
            v-if="previewMode === 'desktop' && previewUrl"
            :key="iframeKey"
            :src="previewUrl"
            class="preview-iframe"
          />
          <div v-else class="preview-placeholder">
            {{
              previewMode === 'desktop'
                ? 'AI 回复结束后，生成的网站将自动展示在这里'
                : '代码视图占位'
            }}
          </div>
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
.app-edit-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  /* 左列轨道宽度：取整到整像素。小数宽度会一路继承下去，图标的水平位置就落在小数 CSS
     像素上，而父层绘制与独立合成层两条光栅化路径对小数取整的方式不同 → 静止态横向偏 1px。
     下游间距/尺寸本来就是整数，左列右边缘一取整，整条链就闭合。
     表达式里的 16px 就是两条网格的 gap；不支持 round() 时保持 1fr，即原来的 1fr:3fr */
  --col-left: 1fr;
}

/* 能力探测只用长度：混用百分比与长度（如 round(down, 100%, 1px)）可能被引擎在解析
   阶段判无效，导致门控恒为 false —— 这个探测不参与任何布局，纯粹回答「有没有 round()」 */
@supports (width: round(down, 10px, 1px)) {
  .app-edit-page {
    --col-left: round(down, (100% - 16px) / 4, 1px);
  }
}

/* ========== 页面 header：与内容区共用 1:3 网格，保证 radio-group 与预览区左对齐 ========== */
.app-header {
  height: 60px;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: var(--col-left) 3fr;
  gap: 16px;
  align-items: center;
  padding: 0 16px;
  background: #fff;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 0 10%;
}

.header-right {
  display: flex;
  align-items: center;
  min-width: 0;
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ========== 核心内容区：对话 : 预览 = 1:3 ========== */
.chat-body {
  flex: 1;
  display: grid;
  grid-template-columns: var(--col-left) 3fr;
  gap: 16px;
  padding: 0 16px 16px;
  min-height: 0;
}

.chat-left {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
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
  background: transparent;
  overflow: hidden;
  min-height: 0;
}

/* ========== 右侧预览 ========== */
.chat-right {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.preview-body {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #d9d9d9;
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
  .app-header {
    grid-template-columns: 1fr;
    height: auto;
    row-gap: 8px;
    padding: 8px 16px;
  }

  .chat-body {
    grid-template-columns: 1fr;
  }

  .chat-left {
    min-height: 400px;
  }

  .app-edit-page {
    height: auto;
  }
}
</style>
