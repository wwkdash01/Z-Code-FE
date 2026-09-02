<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { UploadOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons-vue'
import MyAppCard from '@/components/MyAppCard.vue'
import FeaturedAppCard from '@/components/FeaturedAppCard.vue'
import { saveApp } from '@/api/appController'

const router = useRouter()
const examplePrompts = ref([
  '波音风电商首页',
  '企业网站',
  '电商运营后台',
  '暗藏话题社区',
])

const promptText = ref('')
const uploading = ref(false)
const optimizing = ref(false)
const submitting = ref(false)

// ========== App Info Modal ==========
const showAppModal = ref(false)
const appForm = reactive<API.AppAddRequestDTO>({
  appName: '',
  cover: '',
  initPrompt: '',
  codeGenType: 'singleton',
  appTag: 'tool',
})

const handleOpenAppModal = () => {
  if (!promptText.value.trim()) {
    message.warning('请输入提示词')
    return
  }
  appForm.initPrompt = promptText.value.trim()
  showAppModal.value = true
}

const handleSaveApp = async () => {
  if (!appForm.appName.trim()) {
    message.warning('请输入应用名称')
    return
  }
  submitting.value = true
  try {
    const res = await saveApp(appForm)
    if (res.data.code === 200 && res.data.data != null) {
      const appId = String(res.data.data)
      message.success('应用创建成功')
      showAppModal.value = false
      router.push({
        path: '/app/app-edit',
        query: { id: appId.toString() },
      })
    } else {
      message.error('创建失败：' + res.data.message)
    }
  } catch (e) {
    message.error('创建失败')
  } finally {
    submitting.value = false
  }
}

/**
 * 实例提示词点击 → 填充到输入框
 */
function handlePromptClick(text: string) {
  promptText.value = text
}

/**
 * 上传图片
 * TODO: 实现实际上传逻辑，调用后端文件上传接口
 */
async function handleUpload() {
  message.info('TODO: 实现图片上传功能')
}

/**
 * 提示词优化
 * TODO: 调用提示词优化 API
 */
async function handleOptimize() {
  if (!promptText.value.trim()) {
    message.warning('请输入提示词后再优化')
    return
  }
  optimizing.value = true
  try {
    // TODO: 调用提示词优化接口，如 /api/prompt/optimize
    // const res = await promptOptimize({ text: promptText.value })
    // if (res.data.code === 200) promptText.value = res.data.data
    message.success('TODO: 提示词优化功能待实现')
  } catch (e) {
    message.error('优化失败')
  } finally {
    optimizing.value = false
  }
}

/**
 * 提交提示词 → 弹出版应用信息填写框
 */
async function handleSubmit() {
  handleOpenAppModal()
}
</script>

<template>
  <!-- ========== 品牌区 ========== -->
  <section class="hero-section">
    <div class="hero-content">
      <h1 class="hero-title">
        一句话 <span class="hero-emoji">🐱</span> 呈所想
      </h1>
      <p class="hero-subtitle">与 AI 对话轻松创建应用和网站</p>
    </div>
  </section>

  <!-- ========== 提示词输入区 ========== -->
  <section class="prompt-section">
    <div class="prompt-card">
      <textarea
        v-model="promptText"
        class="prompt-textarea"
        rows="4"
        placeholder="使用 NoCode 创建一个数据看板，用来分析......"
      />
      <div class="prompt-toolbar">
        <a-button @click="handleUpload">
          <template #icon><UploadOutlined /></template>
          上传
        </a-button>
        <a-button
          :loading="optimizing"
          @click="handleOptimize"
          :disabled="!promptText.trim()"
        >
          <template #icon><RobotOutlined /></template>
          优化
        </a-button>
        <div class="prompt-toolbar-spacer" />
        <a-button
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
          :disabled="!promptText.trim()"
        >
          <template #icon><SendOutlined /></template>
          提交
        </a-button>
      </div>
    </div>

    <div class="example-prompts">
      <span v-for="item in examplePrompts" :key="item" class="example-tag" @click="handlePromptClick(item)">
        {{ item }}
      </span>
    </div>
  </section>

  <!-- ========== 我的作品 ========== -->
  <MyAppCard class="card-section" />

  <!-- ========== 精选应用 ========== -->
  <FeaturedAppCard class="card-section" />

  <!-- ========== 应用信息填写 Modal ========== -->
  <a-modal
    :open="showAppModal"
    :width="640"
    centered
    @cancel="showAppModal = false"
  >
    <div class="app-info-modal">
      <!-- 左栏：应用封面预览 -->
      <div class="left-panel">
        <div
          class="cover-preview"
          :style="{ backgroundImage: appForm.cover ? `url(${appForm.cover})` : undefined }"
        >
          <div v-if="!appForm.cover" class="cover-placeholder">
            <UploadOutlined />
          </div>
        </div>
        <div class="cover-hint">封面图（可选，填写 URL）</div>
      </div>

      <a-divider type="vertical" class="divider" />

      <!-- 右栏：表单字段 -->
      <div class="right-panel">
        <div class="field-group">
          <div class="field-item">
            <label class="field-label">应用名称 <span class="required">*</span></label>
            <a-input
              v-model:value="appForm.appName"
              placeholder="请输入应用名称"
              :bordered="false"
            />
          </div>

          <div class="field-item">
            <label class="field-label">生成类型</label>
            <a-radio-group v-model:value="appForm.codeGenType">
              <a-radio value="singleton">单文件</a-radio>
              <a-radio value="multifile">多文件</a-radio>
            </a-radio-group>
          </div>

          <div class="field-item">
            <label class="field-label">应用标签</label>
            <a-radio-group v-model:value="appForm.appTag">
              <a-radio value="tool">工具</a-radio>
              <a-radio value="webPage">网页</a-radio>
              <a-radio value="profile">个人博客</a-radio>
            </a-radio-group>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <a-button @click="showAppModal = false">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="handleSaveApp">确认创建</a-button>
    </template>
  </a-modal>
</template>

<style scoped>
/* ========== 品牌区 ========== */
.hero-section {
  background: linear-gradient(135deg, #e0f7fa 0%, #e8f5e9 40%, #f3e5f5 100%);
  padding: 80px 24px 60px;
  text-align: center;
}

.hero-content {
  max-width: 640px;
  margin: 0 auto;
}

.hero-title {
  font-size: 36px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 12px;
  letter-spacing: 2px;
}

.hero-emoji {
  font-size: 32px;
  margin: 0 4px;
}

.hero-subtitle {
  font-size: 16px;
  color: rgba(0, 0, 0, 0.55);
  margin: 0;
}

/* ========== 提示词输入区 ========== */
.prompt-section {
  padding: 40px 24px 24px;
  max-width: 720px;
  margin: 0 auto;
}

.prompt-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  min-height: 180px;
}

.prompt-textarea {
  flex: 1;
  width: 100%;
  border: 1px solid transparent;
  padding: 14px 16px;
  font-size: 15px;
  line-height: 1.6;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  font-family: inherit;
  color: rgba(0, 0, 0, 0.88);
  background: transparent;
  min-height: 80px;
}

.prompt-textarea:focus {
  border-color: #4096ff;
  background: #fafafa;
  border-radius: 8px;
}

.prompt-textarea::placeholder {
  color: rgba(0, 0, 0, 0.35);
}

.prompt-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.prompt-toolbar-spacer {
  flex: 1;
}

/* ========== 实例提示词 ========== */
.example-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  justify-content: center;
}

.example-tag {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 20px;
  background: #e6f4ff;
  color: #1677ff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  user-select: none;
}

.example-tag:hover {
  background: #1677ff;
  color: #fff;
}

/* ========== 卡片区块间距 ========== */
.card-section {
  margin-bottom: 10px;
}

/* ========== App Info Modal ========== */
.app-info-modal {
  display: flex;
  align-items: stretch;
  gap: 24px;
  min-height: 300px;
}

.left-panel {
  flex-shrink: 0;
  width: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.cover-preview {
  width: 160px;
  height: 100px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cover-preview :deep(.ant-icon) {
  font-size: 24px;
  color: #bfbfbf;
}

.cover-placeholder {
  color: #bfbfbf;
}

.cover-hint {
  font-size: 12px;
  color: #8c8c8c;
}

.divider {
  margin: 0 !important;
  top: 0 !important;
  height: auto !important;
  align-self: stretch;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.65);
}

.required {
  color: #ff4d4f;
}
</style>
