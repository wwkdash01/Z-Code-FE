<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { UploadOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons-vue'
import MyAppCard from '@/components/MyAppCard.vue'
import FeaturedAppCard from '@/components/FeaturedAppCard.vue'

/**
 * 实例提示词标签
 */
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
 * 提交提示词
 * TODO: 调用 code-stream / preview / deploy 接口
 */
async function handleSubmit() {
  if (!promptText.value.trim()) {
    message.warning('请输入提示词')
    return
  }
  submitting.value = true
  try {
    // TODO: 调用代码生成接口，如 getCodeGenStream
    // await getCodeGenStream({ appCodeStreamQueryDTO: { appId, userPrompt: promptText.value } })
    // 或者调用部署接口
    // await deployApp({ appId })
    message.success('TODO: 提交功能待实现')
  } catch (e) {
    message.error('提交失败')
  } finally {
    submitting.value = false
  }
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
</style>
