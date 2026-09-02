<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { getMyAppByPage } from '@/api/appController'
import dayjs from 'dayjs'
import { useLoginUserStore } from '@/stores/loginUser'
import { getImgDegradation } from '@/utils/getImgDegradation'

interface AppItem {
  id: string
  appName?: string
  cover?: string
  createTime?: string
}

const props = defineProps<{
  /** 一页显示数量，默认 20 */
  pageSize?: number
}>()

const loginUserStore = useLoginUserStore()

const isLoggedIn = computed(
  () => !!(loginUserStore.loginUser.id && loginUserStore.loginUser.userAccount)
)

const appList = ref<AppItem[]>([])
const loading = ref(false)
const myAppCardRef = ref<HTMLElement | null>(null)
const displayApps = ref<AppItem[]>([])

const MIN_CARD_WIDTH = 266

function updateDisplayApps() {
  if (!myAppCardRef.value) return
  const containerWidth = myAppCardRef.value.offsetWidth
  const maxPerRow = Math.floor(containerWidth / MIN_CARD_WIDTH)
  const count = Math.min(appList.value.length, Math.max(maxPerRow, 1))
  displayApps.value = appList.value.slice(0, count)
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null
function handleResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    updateDisplayApps()
  }, 50)
}

async function fetchData() {
  // 确保已获取登录用户信息
  if (!loginUserStore.loginUser.id) {
    await loginUserStore.fetchLoginUser()
  }
  if (!isLoggedIn.value) return
  loading.value = true
  try {
    const res = await getMyAppByPage({
      pageNum: 1,
      pageSize: props.pageSize ?? 20,
    })
    if (res.data.code === 200 && res.data.data) {
      const records = (res.data.data.records || []).map(app => ({
        ...app,
        cover: getImgDegradation(app.cover),
      }))
      // 运行时 id 已是 string（transformResponse 处理过），通过 unknown 桥接消除 TS 类型冲突
      appList.value = records as unknown as AppItem[]
      updateDisplayApps()
    } else {
      message.warning(res.data.message || '获取应用列表失败')
    }
  } catch (e) {
    message.error('获取应用列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
  updateDisplayApps()
  window.addEventListener('resize', handleResize)
})

watch(isLoggedIn, (val) => {
  if (val) fetchData()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeTimer) clearTimeout(resizeTimer)
})

defineExpose({ reload: fetchData })
</script>

<template>
  <section v-if="isLoggedIn" class="my-app-section">
    <div class="my-app-card" ref="myAppCardRef">
      <div class="my-app-header">
        <h2 class="my-app-title">我的应用</h2>
        <a-button text @click="message.info('TODO: 更多应用页')">更多 ></a-button>
      </div>

      <a-spin :spinning="loading">
        <div class="my-app-grid">
          <div
            v-for="app in displayApps"
            :key="app.id"
            class="my-app-item"
          >
            <div
              class="my-app-item-inner"
              @click="message.info('TODO: 应用详情/预览功能待实现')"
            >
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
            </div>
          </div>
        </div>
      </a-spin>
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
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.my-app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.my-app-title {
  font-size: 22px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin: 0;
}

.my-app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.my-app-item {
  margin-bottom: 0;
}

.my-app-item-inner {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s;
  cursor: pointer;
}

.my-app-item-inner:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.my-app-cover {
  width: 100%;
  height: 160px;
  background-size: cover;
  background-position: center;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-app-cover-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-app-info {
  padding: 12px 16px;
}

.my-app-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.my-app-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
