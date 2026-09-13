<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getMyAppByPage } from '@/api/appController'
import { deployUrlOf } from '@/config/api'
import dayjs from 'dayjs'
import { useLoginUserStore } from '@/stores/loginUser'
import { getImgDegradation } from '@/utils/getImgDegradation'

interface AppItem {
  id: string
  appName?: string
  cover?: string
  createTime?: string
  deployKey?: string
}

/** 需求：每页最多 10 个 */
const PAGE_SIZE = 10

const router = useRouter()
const loginUserStore = useLoginUserStore()

const isLoggedIn = computed(
  () => !!(loginUserStore.loginUser.id && loginUserStore.loginUser.userAccount),
)

const appList = ref<AppItem[]>([])
const loading = ref(false)
const searchName = ref('')
const currentPage = ref(1)
const total = ref(0)

async function fetchData() {
  // 确保已获取登录用户信息
  if (!loginUserStore.loginUser.id) {
    await loginUserStore.fetchLoginUser()
  }
  if (!isLoggedIn.value) return
  loading.value = true
  try {
    const res = await getMyAppByPage({
      pageNum: currentPage.value,
      pageSize: PAGE_SIZE,
      appName: searchName.value || undefined,
    })
    if (res.data.code === 200 && res.data.data) {
      const records = (res.data.data.records || []).map((app) => ({
        ...app,
        cover: getImgDegradation(app.cover),
      }))
      // 运行时 id 已是 string（transformResponse 处理过），通过 unknown 桥接消除 TS 类型冲突
      appList.value = records as unknown as AppItem[]
      total.value = Number(res.data.data.totalRow ?? 0)
    } else {
      message.warning(res.data.message || '获取应用列表失败')
    }
  } catch {
    message.error('获取应用列表失败')
  } finally {
    loading.value = false
  }
}

function doSearch() {
  currentPage.value = 1
  fetchData()
}

function changePage(page: number) {
  currentPage.value = page
  fetchData()
}

function viewChat(app: AppItem) {
  router.push({ path: '/app/app-edit', query: { id: app.id, view: '1' } })
}

function viewWork(app: AppItem) {
  if (app.deployKey) window.open(deployUrlOf(app.deployKey))
}

onMounted(() => {
  fetchData()
})

watch(isLoggedIn, (val) => {
  if (val) fetchData()
})

defineExpose({ reload: fetchData })
</script>

<template>
  <section v-if="isLoggedIn" class="my-app-section">
    <div class="my-app-card">
      <div class="my-app-header">
        <h2 class="my-app-title">我的应用</h2>
        <a-input-search
          v-model:value="searchName"
          class="my-app-search"
          placeholder="搜索应用名称"
          allow-clear
          enter-button
          @search="doSearch"
        />
      </div>

      <a-spin :spinning="loading">
        <div class="my-app-grid">
          <div v-for="app in appList" :key="app.id" class="my-app-item">
            <div class="my-app-item-inner">
              <div
                class="my-app-cover"
                :style="{ backgroundImage: app.cover ? `url(${app.cover})` : undefined }"
              >
                <div v-if="!app.cover" class="my-app-cover-placeholder">
                  {{ app.appName?.charAt(0) || 'A' }}
                </div>
              </div>
              <div class="my-app-info">
                <div class="my-app-name">{{ app.appName || '未知应用' }}</div>
                <div class="my-app-time">
                  创建于 {{ dayjs(app.createTime).format('YYYY-MM-DD HH:mm') }}
                </div>
              </div>
              <!-- 灰色蒙版：hover / 键盘聚焦时淡入，两个操作按钮在其内 -->
              <div class="my-app-mask">
                <div class="my-app-actions">
                  <a-button class="action-chat" size="small" @click="viewChat(app)">查看对话</a-button>
                  <a-button
                    v-if="app.deployKey"
                    class="action-work"
                    size="small"
                    @click="viewWork(app)"
                  >
                    查看作品
                  </a-button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!loading && !appList.length" class="my-app-empty">暂无应用</div>
      </a-spin>

      <div v-if="total > 0" class="my-app-pagination">
        <a-pagination
          :current="currentPage"
          :page-size="PAGE_SIZE"
          :total="total"
          :show-total="(t: number) => `共 ${t} 条`"
          @change="changePage"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.my-app-section {
  padding: 0 24px 4px;
  max-width: 1200px;
  margin: 0 auto;
}

.my-app-card {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.my-app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.my-app-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.my-app-search {
  width: 240px;
}

.my-app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.my-app-item-inner {
  /* 蒙版的定位容器 */
  position: relative;
  background: var(--color-surface);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}

.my-app-item-inner:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.my-app-cover {
  width: 100%;
  height: 160px;
  background-size: cover;
  background-position: center;
  background-color: var(--color-surface-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-app-cover-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  /* 占位首字母底：品牌陶土的同色系渐变（旧的冷紫蓝与暖底冲突）。
     色值取令牌，换肤时跟随 */
  background: linear-gradient(135deg, var(--color-primary-hover), var(--color-primary-active));
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-app-info {
  padding: 12px 16px 4px;
}

.my-app-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.my-app-time {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* 灰色蒙版：hover / 键盘聚焦时淡入，300ms */
.my-app-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.my-app-item-inner:hover .my-app-mask,
.my-app-item-inner:focus-within .my-app-mask {
  opacity: 1;
}

.my-app-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 查看对话：绿色 = 对话区用户气泡同色（MessageRow 的 .sender-user .bb）。
   :deep(.ant-btn.xxx) 把特异性抬到 (0,3,0)，压过 antd 的默认 / hover 规则，免得底色被 :hover 变回去 */
.my-app-actions :deep(.ant-btn.action-chat) {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
  border-radius: 40%;
  font-weight: 500;
  letter-spacing: 0.02em;
}

/* 查看作品：灰色 = 输入区灰色卡片背景（ChatBoard 的 .prompt-card） */
.my-app-actions :deep(.ant-btn.action-work) {
  background: var(--color-surface-subtle);
  border-color: var(--color-surface-subtle);
  color: var(--color-text);
  border-radius: 40%;
  font-weight: 500;
  letter-spacing: 0.02em;
}

/* 蒙版上的按钮要有悬停反馈，否则像块死图 */
.my-app-actions :deep(.ant-btn.action-chat:hover),
.my-app-actions :deep(.ant-btn.action-work:hover) {
  filter: var(--hover-dim);
}

.my-app-empty {
  text-align: center;
  color: var(--color-text-quaternary);
  padding: 32px 0;
}

.my-app-pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
