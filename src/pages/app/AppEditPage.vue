<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  CopyOutlined,
  CloudUploadOutlined,
  InfoCircleOutlined,
  DesktopOutlined,
  CodeOutlined,
  VerticalAlignBottomOutlined,
  StarFilled,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { getAppById, getFeaturedAppById, previewApp, deployApp, updateAppById } from '@/api/appController'
import { getImgDegradation } from '@/utils/getImgDegradation'
import annoImg from '@/assets/anno.png'
import { useLoginUserStore } from '@/stores/loginUser'
import { APP_TAG_META } from '@/config/appTag'
import { tagStyle } from '@/config/theme'
import type { PreservedAppVO } from '@/types/long-preserve'
import ChatBoard from '@/components/Chat/ChatBoard.vue'
import { useNameTruncation } from '@/composables/useNameTruncation'

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

// 应用名称「固定宽度 + 超出才渐隐」，与后台应用管理表格、应用详情卡片同一套
// （样式在 @/styles/base.css 的 .name-cell 系列，判定逻辑在 useNameTruncation）。
// 本页没有 a-table，所以把名称所在的 .app-info-main 当测量容器：
// 该容器是 flex:1 + min-width:0，本身不变宽，真正会随窗口变的是外层网格列；
// 容器变宽被 ResizeObserver 捕获后重新判定，列宽就间接覆盖到了。
const appInfoMainRef = ref<HTMLElement | null>(null)
const { boxStyle, isOverflowing, setCellRef, scheduleMeasure } = useNameTruncation(appInfoMainRef)

// 应用名是异步拉回来的，拉到后必须重新量一次，否则首帧按空文本判定为「不溢出」
watch(app, () => scheduleMeasure())

// ========== 权限 / 模式 ==========
const isViewMode = computed(() => route.query.view === '1')
// 首页「精选应用」入口：走游客接口，游客 / 非所有者也能打开
const isFromFeatured = computed(() => route.query.from === 'featured')
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

// ========== 详情卡片展示 ==========
const tagMeta = computed(() => (app.value?.appTag ? APP_TAG_META[app.value.appTag] : undefined))
// 需求口径：priority === 99 即精选
const isFeatured = computed(() => app.value?.priority === 99)
// 降级与封面同一套：URL 无效或缺失时回退到 anno.png
const userAvatarSrc = computed(() => getImgDegradation(app.value?.userAvatar))

// ========== 应用信息弹卡 ==========
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
    const res = isFromFeatured.value
      ? await getFeaturedAppById({ id } as unknown as API.getFeaturedAppByIdParams)
      : await getAppById({ id } as unknown as API.getAppByIdParams)
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
        <a-popover
          trigger="click"
          placement="bottomLeft"
          :arrow="false"
          :overlay-inner-style="{ padding: '0' }"
        >
          <template #content>
            <a-card class="app-detail-card" :bordered="false" hoverable>
              <template #cover>
                <div class="detail-cover-wrap">
                  <img class="detail-cover" :src="appCover" alt="应用封面" />
                  <StarFilled v-if="isFeatured" class="detail-featured-star" />
                  <div class="detail-cover-tags">
                    <a-tag v-if="tagMeta" :style="tagStyle(tagMeta)">
                      <component :is="tagMeta.icon" />
                      {{ tagMeta.label }}
                    </a-tag>
                  </div>
                </div>
              </template>

              <!-- 放的是文字信息而非图标操作，故要覆盖 antd 给 actions 的均分宽度与竖分隔线 -->
              <template #actions>
                <span class="detail-meta-text detail-author">作者：{{ app?.userName || '-' }}</span>
                <span class="detail-meta-text">
                  {{ app?.createTime ? dayjs(app.createTime).format('YYYY-MM-DD HH:mm') : '-' }}
                </span>
              </template>

              <a-card-meta :description="app?.initPrompt || '暂无初始提示词'">
                <template #avatar>
                  <a-avatar class="detail-avatar" :size="40" :src="userAvatarSrc" />
                </template>
                <template #title>
                  <a-input
                    v-if="isOwner"
                    class="detail-name-input"
                    :bordered="false"
                    v-model:value="editForm.appName"
                    @blur="handleAppNameBlur"
                  />
                  <span v-else class="detail-name">{{ app?.appName || '未命名应用' }}</span>
                </template>
              </a-card-meta>
            </a-card>
          </template>
          <span class="avatar-anchor">
            <button class="avatar-btn" type="button" aria-label="查看应用详情">
              <a-avatar :size="40" :src="appCover" />
              <span class="avatar-mask"><InfoCircleOutlined /></span>
            </button>
          </span>
        </a-popover>

        <div class="app-info-main">
          <span
            :ref="(el) => setCellRef('appName', appId, el)"
            class="app-info-name name-cell"
            :class="{ 'name-cell--overflow': isOverflowing('appName', appId) }"
            :style="boxStyle"
          >
            <span class="name-cell-text">{{ app?.appName || '未命名应用' }}</span>
          </span>
          <span class="app-info-time">
            创建于 {{ app?.createTime ? dayjs(app.createTime).format('YYYY-MM-DD') : '-' }}
          </span>
        </div>
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
  background: var(--color-surface);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  /* 中轴线对齐：ChatBoard 内 AI 头像中心距列左边 = 16px(内容区内缩) + 10px(头像半径) = 26px，
     封面直径 40px（半径 20px），故封面左内缩 = 26px - 20px = 6px，两者中心同轴 */
  padding: 0 0 0 6px;
}

/* popover 的对齐锚点，必须几何恒定：弹层在入场动画结束（onAfterEnter → status 置 stable）时
   会被重新对齐一次，锚点若此时还在变，弹层就会跟着位移（表现为动画播完向下跳 ~1px）。
   所以按下缩放只能挂在内层 .avatar-btn 上——transform 不改变布局盒，这一层的 rect 始终恒定 */
.avatar-anchor {
  display: flex;
}

/* 头像按钮：样式全部清零，盒子正好等于 40px 头像——任何 padding/border 都会顶偏
   header-left 那条按 6px 左内缩算好的中轴线 */
.avatar-btn {
  position: relative;
  display: flex;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  /* 按下回弹：只动 transform，且落点只有 1 与 .92 两个值，都是整数几何，不引入亚像素落点 */
  transition: transform 0.15s ease;
}

.avatar-btn:active {
  transform: scale(0.92);
}

/* 灰色蒙版：与头像同心同圆，靠 opacity 淡入淡出 */
.avatar-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 16px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

/* 蒙版与图标一起淡入，图标同时从 .8 放大到 1，免得只是「干巴巴亮一下」 */
.avatar-btn:hover .avatar-mask,
.avatar-btn:focus-visible .avatar-mask {
  opacity: 1;
}

.avatar-mask :deep(.anticon) {
  transform: scale(0.8);
  transition: transform 0.2s ease;
}

.avatar-btn:hover .avatar-mask :deep(.anticon),
.avatar-btn:focus-visible .avatar-mask :deep(.anticon) {
  transform: scale(1);
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

/* 名称：固定宽度 + 超出渐隐。裁切盒子、内层文字、渐隐遮罩都在 base.css 的
   .name-cell 系列里，这里只给「字号 / 字重 / 颜色」——白名单口径与后台表格一致，
   但这里是粗体，所以字号沿用 14px 后整体比表格宽一点，属预期 */
.app-info-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.app-info-time {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* ========== 应用详情卡片（弹层内，无边框，靠弹层自身出框） ========== */
.app-detail-card {
  width: 300px;
  /* hoverable 会让 antd 给整卡挂 cursor: pointer，但卡内没有可点元素，指针不该变手指 */
  cursor: default;
}

/* 封面：定位容器 + 底部悬浮的 tag 行 */
.detail-cover-wrap {
  position: relative;
}

.detail-cover {
  display: block;
  width: 100%;
  /* 固定高度：避免原图比例把弹层撑到半屏 */
  height: 150px;
  object-fit: cover;
}

.detail-cover-tags {
  position: absolute;
  left: 8px;
  bottom: 8px;
  display: flex;
  gap: 5px;
}

.detail-cover-tags :deep(.ant-tag) {
  margin-inline-end: 0;
}

/* 精选角标：封面左上角的金星，替代原来的 tag 方案 */
.detail-featured-star {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 18px;
  color: #faad14;
}

/* 无边框 input 顶替 a-card-meta 的 title：字号、字重对齐 antd 的 meta title */
.detail-name-input {
  padding: 0;
  font-size: 16px;
  font-weight: 500;
}

.detail-name {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 头像与右侧文字列垂直居中：antd 的 .ant-card-meta 是 flex 但默认 align-items: stretch，
   于是头像列的盒子被拉到与文字列等高、40px 的圆形却贴在顶部 */
.app-detail-card :deep(.ant-card-meta) {
  align-items: center;
}

/* 头像悬停放大：100% → 150%。静止态也给真值 3D 变换：光靠 hover 的 transform 建层，
   动画一结束层就被回收、元素回到父层取整，两条路径差半个像素会跳一下
   （见 docs/亚像素跳变排查.md 第二节） */
.detail-avatar {
  transform: translate3d(0, 0, 0);
  transition: transform 0.4s ease;
}

.detail-avatar:hover {
  transform: translate3d(0, 0, 0) scale(1.5);
}

/* actions 行里放的是文字信息，不是 antd 默认的图标操作 */
.detail-meta-text {
  font-size: 12px;
}

/* 作者用正文黑（与应用名同色），覆盖 antd 给 actions 的灰色描述色 */
.detail-author {
  color: var(--color-text);
}

/* #actions 默认是给「图标操作」准备的：均分宽度 + 相邻竖分隔线，放文字要覆盖掉 */
.app-detail-card :deep(.ant-card-actions) {
  justify-content: space-between;
  padding: 0 16px;
  gap: 12px;
}

.app-detail-card :deep(.ant-card-actions > li) {
  /* antd 给每个 li 内联了 width: 50%，只有 !important 能覆盖 */
  width: auto !important;
  margin: 10px 0;
}

.app-detail-card :deep(.ant-card-actions > li:not(:last-child)) {
  border-inline-end: none;
}

.app-detail-card :deep(.ant-card-actions > li > span) {
  cursor: default;
}

.app-detail-card :deep(.ant-card-actions > li > span:hover) {
  color: inherit;
}

/* 初始提示词可能很长：限高内滚，不无限撑高弹层 */
.app-detail-card :deep(.ant-card-meta-description) {
  max-height: 96px;
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
  background: var(--color-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
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
  color: var(--color-text-quaternary);
  font-size: 14px;
}

/* ========== 部署弹窗 ========== */
.deploy-modal-hint {
  color: var(--color-text-secondary);
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
