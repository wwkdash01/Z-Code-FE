<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Segmented, Input, Button, Tag, Avatar, Divider } from 'ant-design-vue'
import {
  SaveOutlined,
  SendOutlined,
  UploadOutlined,
  RobotOutlined,
  EditOutlined,
  CodeOutlined,
  EyeOutlined,
  SettingOutlined,
  MenuOutlined,
  BarsOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { getAppById, getCodeGenStream /* , previewApp */, deployApp } from '@/api/appController'
import { getImgDegradation } from '@/utils/getImgDegradation'
import annoImg from '@/assets/anno.png'
import { useLoginUserStore } from '@/stores/loginUser'
import type { PreservedAppVO } from '@/types/long-preserve'
import ChatContainer from '@/components/Chat/ChatContainer.vue'
import MessageRow from '@/components/Chat/MessageRow.vue'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

// ========== 基础配置 ==========
const baseURL = 'http://localhost:58080/api'

// ========== 数据加载 ==========
const appId = ref<string>('')
const app = ref<PreservedAppVO | null>(null)
const previewUrl = ref('')
const loading = ref(false)

// ========== D1: 应用信息 ==========
const appCover = computed(() => {
  return app.value?.cover ? getImgDegradation(app.value.cover) : annoImg
})

// ========== D2: AI-用户对话 ==========
const userMessage = ref('')
const aiResponse = ref('')
const streamFinished = ref(false)
const isGenerating = ref(false)

// ========== D3: 输入框 ==========
const inputText = ref('')
const inputDisabled = computed(() => !streamFinished.value)
const mode = ref<'instruction' | 'dialog'>('instruction')

// ========== 右侧区域 ==========
const activeTab = ref('preview')
const deployUrlInput = ref('')
const codeContent = ref('')

// SSE stream reader reference for cleanup
let streamReader: ReadableStreamDefaultReader | null = null

// ========== 获取应用信息 ==========
async function fetchAppData() {
  const id = route.query.id as string
  if (!id) {
    message.error('应用 ID 无效')
    router.push('/')
    return
  }

  loading.value = true
  try {
    // 1. 获取应用信息
    const appRes = await getAppById({ id } as unknown as API.getAppByIdParams)
    if (appRes.data.code === 200 && appRes.data.data) {
      app.value = appRes.data.data as unknown as PreservedAppVO
      appId.value = app.value?.id || id
      userMessage.value = app.value?.initPrompt || ''
    } else {
      message.error('获取应用信息失败：' + appRes.data.message)
    }

    // 数据加载完成，关闭页面上转圈
    loading.value = false
  } catch {
    loading.value = false
    return
  }

  // 2. 触发 SSE 流式代码生成（阻塞等待流结束）— 此时页面已可操作
  if (app.value?.initPrompt) {
    try {
      await handleGenerateCode(app.value.initPrompt)
    } catch {
      // SSE 错误已在内部处理
    }
  }
}

// ========== SSE 流式生成（阻塞等待流结束） ==========
async function handleGenerateCode(prompt: string): Promise<void> {
  if (!prompt.trim()) return

  isGenerating.value = true
  streamFinished.value = false
  aiResponse.value = ''
  inputText.value = ''

  const params = `appId=${appId.value}&userPrompt=${encodeURIComponent(prompt)}`
  const url = `${baseURL}/apps/user/code-stream?${params}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'text/event-stream',
      },
    })

    if (!response.ok) {
      throw new Error(`SSE request failed with status ${response.status}`)
    }

    streamReader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    let buffer = ''

    while (true) {
      const { done, value } = await streamReader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // event="done" 表示流结束
        if (trimmed === 'event:done') {
          isGenerating.value = false
          streamFinished.value = true
          return
        }

        // data: 行，累积 JSON 数据
        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.slice(5).trim()
          if (!dataStr) continue
          try {
            const parsed = JSON.parse(dataStr)
            const content = parsed.d || parsed.data || parsed.content || ''
            fullText += content
            aiResponse.value = fullText
          } catch {
            fullText += dataStr
            aiResponse.value = fullText
          }
        }
      }
    }
  } catch (e) {
    isGenerating.value = false
    message.warning('连接断开，请检查后端是否启动')
    throw e
  } finally {
    // 流结束（正常或异常），统一标记完成状态
    isGenerating.value = false
    streamFinished.value = true
  }
}

// ========== 部署 ==========
async function handleDeploy() {
  if (!appId.value) return
  isGenerating.value = true
  try {
    const res = await deployApp({ appId: appId.value } as unknown as API.AppDeployRequestDTO)
    if (res.data.code === 200) {
      message.success('部署成功')
    } else {
      message.error('部署失败：' + res.data.message)
    }
  } catch {
    message.error('部署请求失败')
  } finally {
    isGenerating.value = false
  }
}

// ========== 输入框提交 ==========
function handleInputChange() {
  // 自动提交（当流结束时用户输入新提示词）
  if (!inputDisabled.value && inputText.value.trim()) {
    handleGenerateCode(inputText.value.trim())
  }
}

// ========== 工具栏按钮 ==========
function handleUpload() {
  message.info('TODO: 上传功能待实现')
}

function handleOptimize() {
  message.info('TODO: 提示词优化功能待实现')
}

function handleEdit() {
  message.info('TODO: 编辑功能待实现')
}

function handleSend() {
  message.info('TODO: 发送功能待实现')
}

// ========== 生命周期 ==========
onMounted(async () => {
  // 确保登录状态
  if (!loginUserStore.loginUser.id) {
    await loginUserStore.fetchLoginUser()
  }
  await fetchAppData()
})

onBeforeUnmount(() => {
  if (streamReader) streamReader.cancel()
})
</script>

<template>
  <div class="app-edit-page">
    <div class="app-edit-layout">
      <!-- ========== 左侧 25% ========== -->
      <aside class="left-panel">
        <!-- D1: 应用信息 -->
        <div class="d1-section">
          <a-avatar :size="48" :src="appCover" class="app-cover-circle" />
          <div class="d1-info">
            <span class="app-name">{{ app?.appName || '未命名应用' }}</span>
            <span class="app-meta">创建于 {{ dayjs(app?.createTime).format('YYYY-MM-DD') }}</span>
          </div>
          <a-dropdown class="detail-dropdown">
            <a-button size="small" ghost><MenuOutlined /></a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item>
                  <span class="todo-text">TODO: 应用详情</span>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>

        <!-- D2: AI-用户对话 -->
        <div class="d2-section">
          <ChatContainer
            :user-message="userMessage"
            :ai-response="aiResponse"
            :is-generating="isGenerating"
            :user-avatar-url="loginUserStore.loginUser.userAvatar || annoImg"
          />
        </div>

        <!-- D3: 输入框 -->
        <div class="d3-section">
          <textarea
            v-model="inputText"
            class="prompt-textarea"
            rows="3"
            :disabled="inputDisabled"
            placeholder="输入提示词，开始与 AI 对话..."
          />
          <div class="input-toolbar">
            <!-- 左侧按钮 -->
            <div class="toolbar-left">
              <a-button size="small" type="primary" @click="handleUpload">
                <template #icon><UploadOutlined /></template>
                上传
              </a-button>
              <a-button size="small" type="primary" @click="handleOptimize">
                <template #icon><RobotOutlined /></template>
                优化
              </a-button>
              <a-button size="small" type="primary" @click="handleEdit">
                <template #icon><EditOutlined /></template>
                编辑
              </a-button>
            </div>

            <!-- 中间：模式切换 -->
            <div class="toolbar-center">
              <a-button
                size="small"
                :type="mode === 'dialog' ? 'primary' : ''"
                :class="{ 'mode-dialog': mode === 'dialog' }"
                ghost
                @click="mode = mode === 'instruction' ? 'dialog' : 'instruction'"
              >
                <template #icon><BarsOutlined v-if="mode === 'dialog'" /><EditOutlined v-else /></template>
              </a-button>
            </div>

            <!-- 右侧按钮 -->
            <div class="toolbar-right">
              <a-button
                size="small"
                type="primary"
                :loading="isGenerating"
                :disabled="inputDisabled || !inputText.trim()"
                @click="handleSend"
              >
                <template #icon><SendOutlined /></template>
                发送
              </a-button>
            </div>
          </div>
        </div>
      </aside>

      <!-- ========== 右侧 75% ========== -->
      <main class="right-panel">
        <!-- 顶部栏 -->
        <div class="right-header">
          <Segmented
            v-model:value="activeTab"
            :options="[
              { label: '预览页', value: 'preview' },
              { label: '代码页', value: 'code' },
              { label: '设置页', value: 'settings' },
            ]"
            block
          />
          <Button
            type="primary"
            :loading="isGenerating"
            @click="handleDeploy"
          >
            <template #icon><SettingOutlined /></template>
            部署
          </Button>
        </div>

        <!-- Tab 内容区 -->
        <div class="tab-content">
          <!-- 预览页 — TODO: iframe bug 严重，暂时停用 -->
          <div v-if="activeTab === 'preview'" class="tab-preview">
            <div class="iframe-placeholder" style="position:relative;top:auto;left:auto;transform:none;">
              <p>预览功能暂时停用</p>
            </div>
          </div>

          <!-- 代码页 -->
          <div v-else-if="activeTab === 'code'" class="tab-code">
            <div class="code-content">
              <pre><code>{{ codeContent || '代码页待实现 - 源码将从预览 URL 获取' }}</code></pre>
            </div>
          </div>

          <!-- 设置页 -->
          <div v-else-if="activeTab === 'settings'" class="tab-settings">
            <div class="settings-placeholder">
              <a-icon type="setting" />
              <p>TODO: 设置页待实现</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* ========== 页面容器 ========== */
.app-edit-page {
  display: flex;
  min-height: calc(100vh - 56px - 48px);
  background: #f5f5f5;
  padding: 24px;
  min-width: 0;
  overflow-x: hidden;
}

.page-loader {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

.app-edit-layout {
  display: flex;
  width: 100%;
  gap: 24px;
  min-width: 0;
  overflow-x: hidden;
}

/* ========== 左侧 25% ========== */
.left-panel {
  width: 25%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 260px;
  /* 填满剩余高度 */
  max-height: calc(100vh - 56px - 48px - 48px);
}

/* D1: 应用信息 */
.d1-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.app-cover-circle {
  flex-shrink: 0;
  border: none;
}

.d1-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.app-name {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-meta {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.detail-dropdown {
  margin-left: auto;
  flex-shrink: 0;
}

.todo-text {
  color: #1677ff;
}

/* D2: 对话区域 */
.d2-section {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  min-height: 300px;
  min-width: 0;
  /* 防止溢出，让内部 chat-container 负责滚动 */
  overflow: hidden;
}

/* D3: 输入区域 */
.d3-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
}

.prompt-textarea {
  width: 100%;
  border: 1px solid transparent;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  font-family: inherit;
  color: rgba(0, 0, 0, 0.88);
  background: transparent;
  min-height: 70px;
}

.prompt-textarea:focus:not(:disabled) {
  border-color: #4096ff;
  background: #fafafa;
  border-radius: 6px;
}

.prompt-textarea:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
  color: rgba(0, 0, 0, 0.35);
}

.input-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  margin-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 4px;
}

.toolbar-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

/* 模式切换按钮绿色 */
.toolbar-center :deep(.mode-dialog.ant-btn-primary) {
  --antd-wave-shadow-color: #52c41a;
  color: #52c41a;
  border-color: #52c41a;
}

.toolbar-center :deep(.mode-dialog.ant-btn-primary.ant-btn-hover) {
  background: #52c41a !important;
  color: #fff !important;
  border-color: #52c41a !important;
}

.toolbar-center :deep(.mode-dialog.ant-btn-primary .ant-btn-icon) {
  color: #52c41a;
}

/* ========== 右侧 75% ========== */
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  overflow-x: hidden;
}

.right-header {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: space-between;
  background: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tab-content {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

/* 预览页 */
.tab-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.url-bar {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.url-bar :deep(.ant-input) {
  width: 100%;
}

.iframe-wrapper {
  flex: 1;
  position: relative;
  min-height: 400px;
  background: #fafafa;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  min-height: 400px;
}

.iframe-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: rgba(0, 0, 0, 0.35);
  font-size: 14px;
}

/* 代码页 */
.tab-code {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.code-content {
  font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.code-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: rgba(0, 0, 0, 0.88);
}

/* 设置页 */
.tab-settings {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: rgba(0, 0, 0, 0.35);
  font-size: 14px;
}

/* ========== 响应式 ========== */
@media (max-width: 900px) {
  .app-edit-layout {
    flex-direction: column;
  }

  .left-panel {
    width: 100%;
    min-width: unset;
  }
}
</style>

<style>
@import '@/styles/chat.css';
</style>
