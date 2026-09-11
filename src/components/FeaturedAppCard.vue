<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { DownOutlined } from '@ant-design/icons-vue'
import { getFeaturedAppByPage } from '@/api/appController'
import { deployUrlOf } from '@/config/api'
import dayjs from 'dayjs'
import { getImgDegradation } from '@/utils/getImgDegradation'

/** 需求：每页最多 10 个 */
const PAGE_SIZE = 10

interface AppItem {
  id: string
  appName?: string
  cover?: string
  createTime?: string
  deployKey?: string
}

interface SortOption {
  btnName: string
  sortField: string
}

const router = useRouter()

// 排序选项配置
const SORT_OPTIONS: SortOption[] = [
  { btnName: '默认排序', sortField: 'id' },
  { btnName: '应用名称', sortField: 'appName' },
  { btnName: '创建时间', sortField: 'createTime' },
]

// Tag 选项配置
const TAG_OPTIONS = [
  { key: 'tool', label: '工具' },
  { key: 'webPage', label: '网页' },
  { key: 'profile', label: '个人博客' },
] as const

const featuredAppList = ref<AppItem[]>([])
const loading = ref(false)
const toolbarRef = ref<HTMLElement | null>(null)
const total = ref(0)
const showSortPanel = ref(false)

const currentSort = ref(SORT_OPTIONS[0])
const selectedTag = ref<string | null>(null)
const searchName = ref('')
const currentPage = ref(1)

async function fetchData() {
  loading.value = true
  try {
    const res = await getFeaturedAppByPage({
      pageNum: currentPage.value,
      pageSize: PAGE_SIZE,
      appName: searchName.value || undefined,
      sortField: currentSort.value.sortField || undefined,
      sortOrder: 'descend',
      appTag: selectedTag.value || undefined,
    })
    if (res.data.code === 200 && res.data.data) {
      const records = (res.data.data.records || []).map((app) => ({
        ...app,
        cover: getImgDegradation(app.cover),
      }))
      total.value = Number(res.data.data.totalRow ?? 0)
      // 运行时 id 已是 string（transformResponse 处理过），此处通过 unknown 桥接消除 TS 类型冲突
      featuredAppList.value = records as unknown as AppItem[]
    } else {
      message.warning(res.data.message || '获取精选应用列表失败')
    }
  } catch {
    message.error('获取精选应用列表失败')
  } finally {
    loading.value = false
  }
}

function resetAndFetch() {
  currentPage.value = 1
  fetchData()
}

function doSearch() {
  resetAndFetch()
}

function changePage(page: number) {
  currentPage.value = page
  fetchData()
}

function toggleSort() {
  showSortPanel.value = !showSortPanel.value
}

async function selectSort(opt: SortOption) {
  currentSort.value = opt
  showSortPanel.value = false
  resetAndFetch()
}

function selectTag(key: string) {
  selectedTag.value = selectedTag.value === key ? null : key
  resetAndFetch()
}

function viewChat(app: AppItem) {
  router.push({ path: '/app/app-edit', query: { id: app.id, view: '1' } })
}

function viewWork(app: AppItem) {
  if (app.deployKey) window.open(deployUrlOf(app.deployKey))
}

function handleClickOutside(e: MouseEvent) {
  if (toolbarRef.value && !toolbarRef.value.contains(e.target as Node)) {
    showSortPanel.value = false
  }
}

watch(showSortPanel, (val) => {
  if (val) {
    nextTick(() => {
      document.addEventListener('click', handleClickOutside)
    })
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
})

onMounted(() => {
  fetchData()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

defineExpose({ reload: fetchData })
</script>

<template>
  <section class="my-app-section">
    <div class="my-app-card">
      <div class="my-app-header">
        <h2 class="my-app-title">精选应用</h2>
        <a-input-search
          v-model:value="searchName"
          class="my-app-search"
          placeholder="搜索应用名称"
          allow-clear
          enter-button
          @search="doSearch"
        />
      </div>

      <div ref="toolbarRef" class="my-app-toolbar">
        <div class="my-app-sort-wrap">
          <a-button @click.stop="toggleSort">
            {{ currentSort.btnName }} <DownOutlined />
          </a-button>
          <div v-if="showSortPanel" class="my-app-sort-panel">
            <div
              v-for="opt in SORT_OPTIONS"
              :key="opt.sortField"
              class="my-app-sort-item"
              :class="{ active: currentSort.sortField === opt.sortField }"
              @click="selectSort(opt)"
            >
              {{ opt.btnName }}
            </div>
          </div>
        </div>

        <div class="my-app-tag-group">
          <a-button
            v-for="tag in TAG_OPTIONS"
            :key="tag.key"
            :type="selectedTag === tag.key ? 'primary' : 'default'"
            @click="selectTag(tag.key)"
          >
            {{ tag.label }}
          </a-button>
        </div>
      </div>

      <a-spin :spinning="loading">
        <div class="my-app-grid">
          <div v-for="app in featuredAppList" :key="app.id" class="my-app-item">
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
              <div class="my-app-actions">
                <a-button size="small" type="link" @click="viewChat(app)">查看对话</a-button>
                <a-button v-if="app.deployKey" size="small" type="link" @click="viewWork(app)">
                  查看作品
                </a-button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!loading && !featuredAppList.length" class="my-app-empty">暂无精选应用</div>
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
  gap: 16px;
  margin-bottom: 20px;
}

.my-app-title {
  font-size: 22px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin: 0;
}

.my-app-search {
  width: 240px;
}

.my-app-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.my-app-sort-wrap {
  position: relative;
}

.my-app-sort-panel {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  margin-top: 4px;
  min-width: 120px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.my-app-sort-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
  transition: background 0.2s;
}

.my-app-sort-item:hover {
  background: #f5f5f5;
}

.my-app-sort-item.active {
  color: #1677ff;
  font-weight: 500;
}

.my-app-tag-group {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.my-app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.my-app-item-inner {
  background: #fff;
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
  padding: 12px 16px 4px;
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

.my-app-actions {
  display: flex;
  gap: 4px;
  padding: 4px 8px 8px;
}

.my-app-empty {
  text-align: center;
  color: rgba(0, 0, 0, 0.35);
  padding: 32px 0;
}

.my-app-pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
