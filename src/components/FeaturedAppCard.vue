<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { DownOutlined } from '@ant-design/icons-vue'
import { getFeaturedAppByPage } from '@/api/appController'
import dayjs from 'dayjs'
import { getImgDegradation } from '@/utils/getImgDegradation'

const FETCH_PAGE_SIZE = 4

interface AppItem {
  id: string
  appName?: string
  cover?: string
  createTime?: string
}

interface SortOption {
  btnName: string
  sortField: string
}

const props = defineProps<{
  /** 初始每页数量，默认 20 */
  pageSize?: number
}>()

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
const myAppCardRef = ref<HTMLElement | null>(null)
const total = ref(0)
const showSortPanel = ref(false)

const currentSort = ref(SORT_OPTIONS[0])
const selectedTag = ref<string | null>(null)

const pagination = ref({
  current: 1,
  pageSize: FETCH_PAGE_SIZE,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['2', '4', '6', '10'],
})

const loadMoreDisabled = ref(false)

const MIN_CARD_WIDTH = 266

// 所有分页请求参数的计算属性
const pageRequestParams = computed(() => ({
  pageNum: pagination.value.current,
  pageSize: FETCH_PAGE_SIZE,
  sortField: currentSort.value.sortField || undefined,
  sortOrder: 'descend',
  appTag: selectedTag.value || undefined,
}))

async function fetchData() {
  loading.value = true
  try {
    const res = await getFeaturedAppByPage(pageRequestParams.value)
    if (res.data.code === 200 && res.data.data) {
      const records = (res.data.data.records || []).map(app => ({
        ...app,
        cover: getImgDegradation(app.cover),
      }))
      total.value = res.data.data.totalRow ?? 0
      pagination.value.total = total.value

      // 首次加载直接赋值，加载更多追加
      // 运行时 id 已是 string（transformResponse 处理过），此处通过 unknown 桥接消除 TS 类型冲突
      if (pagination.value.current === 1 && featuredAppList.value.length === 0) {
        featuredAppList.value = records as unknown as AppItem[]
      } else {
        featuredAppList.value = [...featuredAppList.value, ...(records as unknown as AppItem[])]
      }

      // 返回不够一页则禁用加载更多
      loadMoreDisabled.value = records.length < FETCH_PAGE_SIZE
    } else {
      message.warning(res.data.message || '获取精选应用列表失败')
    }
  } catch (e) {
    message.error('获取精选应用列表失败')
  } finally {
    loading.value = false
  }
}

function toggleSort() {
  showSortPanel.value = !showSortPanel.value
}

async function selectSort(opt: SortOption) {
  currentSort.value = opt
  resetFeaturedList()
  showSortPanel.value = false
  await fetchData()
}

function selectTag(key: string) {
  selectedTag.value = selectedTag.value === key ? null : key
  resetFeaturedList()
  fetchData()
}

function resetFeaturedList() {
  featuredAppList.value = []
  pagination.value.current = 1
  loadMoreDisabled.value = false
}

async function loadMore() {
  if (loadMoreDisabled.value || loading.value) return
  pagination.value.current++
  await fetchData()
}

function handleClickOutside(e: MouseEvent) {
  if (myAppCardRef.value && !myAppCardRef.value.contains(e.target as Node)) {
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
    <div class="my-app-card" ref="myAppCardRef">
      <div class="my-app-header">
        <h2 class="my-app-title">精选应用</h2>
      </div>

      <div class="my-app-toolbar">
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
          <div
            v-for="app in featuredAppList"
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

      <div class="my-app-loadmore-wrap">
        <a-button
          type="primary"
          :loading="loading"
          :disabled="loadMoreDisabled"
          @click="loadMore"
        >
          {{ loadMoreDisabled ? '已经到底啦' : '加载更多' }}
        </a-button>
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
  margin-bottom: 20px;
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

.my-app-loadmore-wrap {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
</style>
