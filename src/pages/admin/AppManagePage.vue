<template>
  <!-- .admin-scope：管理页面整体回退无衬线（用户看不到后台，见 styles/base.css 说明） -->
  <div class="admin-scope">
    <a-form layout="inline" :model="queryParams" @finish="doSearch">
      <a-form-item label="应用ID">
        <a-input v-model:value="queryParams.id" placeholder="请输入应用ID" />
      </a-form-item>

      <a-form-item label="应用名称">
        <a-input v-model:value="queryParams.appName" placeholder="请输入应用名称" />
      </a-form-item>

      <a-form-item label="应用标签">
        <a-select
          v-model:value="queryParams.appTag"
          placeholder="全部"
          allow-clear
          style="width: 120px"
          :options="TAG_OPTIONS"
        />
      </a-form-item>

      <a-form-item label="生成类型">
        <a-select
          v-model:value="queryParams.codeGenType"
          placeholder="全部"
          allow-clear
          style="width: 120px"
          :options="CODE_GEN_OPTIONS"
        />
      </a-form-item>

      <a-form-item label="优先级">
        <a-input v-model:value="priorityInput" placeholder="如 99" style="width: 100px" />
      </a-form-item>

      <a-form-item>
        <a-button type="primary" html-type="submit">搜索</a-button>
      </a-form-item>

      <a-form-item>
        <a-button danger @click="resetParams">重置</a-button>
      </a-form-item>
    </a-form>

    <a-divider />

    <a-table
      ref="tableRef"
      class="admin-table--center"
      :columns="columns"
      :data-source="data"
      :pagination="pagination"
      @change="changePage"
    >
      <template #bodyCell="{ column, record }">
        <!-- 应用名称：盒子固定 10 字符宽，只有文字真的放不下时才渐隐（避免短名字被误伤） -->
        <template v-if="column.dataIndex === 'appName'">
          <span
            :ref="(el) => setCellRef('appName', record.id, el)"
            class="name-cell"
            :class="{ 'name-cell--overflow': isOverflowing('appName', record.id) }"
            :style="boxStyle"
            :title="record.appName ?? undefined"
          >
            <span class="name-cell-text">{{ display(record.appName) }}</span>
          </span>
        </template>

        <!-- 标签：配色 / 图标取自 @/config/appTag 的单一数据源；空标签显示 / -->
        <template v-else-if="column.dataIndex === 'appTag'">
          <template v-if="getAppTagMeta(record.appTag)">
            <a-tag :style="tagStyle(getAppTagMeta(record.appTag)!)">
              <component :is="getAppTagMeta(record.appTag)!.icon" />
              {{ getAppTagMeta(record.appTag)!.label }}
            </a-tag>
          </template>
          <span v-else>{{ EMPTY_TEXT }}</span>
        </template>

        <!-- 精选（priority=99）不额外加 tag，仅把数字标红 -->
        <template v-else-if="column.dataIndex === 'priority'">
          <span :class="{ 'priority-featured': record.priority === 99 }">
            {{ record.priority ?? 0 }}
          </span>
        </template>

        <template v-else-if="column.dataIndex === 'deployKey'">
          {{ display(record.deployKey) }}
        </template>

        <template v-else-if="column.dataIndex === 'createTime'">
          {{ dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>

        <template v-else-if="column.dataIndex === 'updateTime'">
          {{ dayjs(record.updateTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>

        <template v-else-if="column.dataIndex === 'action'">
          <span>
            <a @click="showAppDetail(record)">详情/修改</a>

            <a-divider type="vertical" />

            <a-popconfirm
              ok-text="确认"
              cancel-text="取消"
              :icon="null"
              title="删除后不可恢复"
              @confirm="deleteApp(record)"
            >
              <a>删除</a>
            </a-popconfirm>
          </span>
        </template>
      </template>
    </a-table>

    <!-- ========== 应用详情 / 修改弹窗 ========== -->
    <AppInfoDetailEditCard v-model:open="detailOpen" :app-id="detailAppId" @success="fetchData" />
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { getAppByAdminPage, removeAppByAdmin } from '@/api/appController'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { APP_TAG_OPTIONS, getAppTagMeta } from '@/config/appTag'
import { tagStyle } from '@/config/theme'
import { useNameTruncation } from '@/composables/useNameTruncation'
import AppInfoDetailEditCard from './AppInfoDetailEditCard.vue'
import type { PreservedApp, PreservedGetAppByAdminPageParams } from '@/types/long-preserve'

// 表格空值占位符（弹窗里用「无」，表格里用「/」）
const EMPTY_TEXT = '/'

// 空值统一走这里：null / undefined / 空字符串 / 纯空格 → /
const display = (value?: string | number | null) => {
  if (value === null || value === undefined) return EMPTY_TEXT
  const text = String(value).trim()
  return text === '' ? EMPTY_TEXT : text
}

// 标签下拉项：来自标签配置的单一数据源
const TAG_OPTIONS = APP_TAG_OPTIONS

const CODE_GEN_OPTIONS = [
  { value: 'singleton', label: '单文件' },
  { value: 'multifile', label: '多文件' },
]

// 应用名称盒子宽度上限：10em = 表格字号 14px 下的 140px（10 个汉字宽）
// 判定口径就是这 140px：文字自然宽度超过它才居中裁切 + 右侧渐隐，短名字一律全实心
const tableRef = ref<{ $el?: HTMLElement } | null>(null)
const { boxStyle, isOverflowing, setCellRef } = useNameTruncation(tableRef)

const columns = [
  { title: 'id', dataIndex: 'id', align: 'center' },
  { title: '应用名称', dataIndex: 'appName', align: 'center' },
  { title: '标签', dataIndex: 'appTag', align: 'center' },
  { title: '生成类型', dataIndex: 'codeGenType', align: 'center' },
  { title: '优先级', dataIndex: 'priority', align: 'center' },
  { title: '部署Key', dataIndex: 'deployKey', align: 'center' },
  { title: '创建时间', dataIndex: 'createTime', align: 'center' },
  { title: '更新时间', dataIndex: 'updateTime', align: 'center' },
  { title: '操作', dataIndex: 'action', align: 'center' },
] as const

// 表格数据源
const data = ref<PreservedApp[]>()
const total = ref(0)

// 搜索条件
const queryParams = reactive<PreservedGetAppByAdminPageParams>({
  pageNum: 1,
  pageSize: 10,
})

// priority 为 number 类型，单独用字符串输入框承接再转换
const priorityInput = ref('')

// 分页变量
const pagination = computed(() => {
  return {
    current: queryParams.pageNum ?? 1,
    pageSize: queryParams.pageSize ?? 10,
    total: total.value,
    showSizeChanger: true,
    showTotal: (total: number) => `共${total}条记录`,
  }
})

// 换页
const changePage = (page: { current: number; pageSize: number }) => {
  queryParams.pageNum = page.current
  queryParams.pageSize = page.pageSize
  fetchData()
}

// 搜索函数
const doSearch = () => {
  queryParams.pageNum = 1
  queryParams.priority = priorityInput.value.trim() ? Number(priorityInput.value) : undefined
  fetchData()
}

// 重置查询条件
const resetParams = () => {
  queryParams.id = undefined
  queryParams.appName = undefined
  queryParams.appTag = undefined
  queryParams.codeGenType = undefined
  queryParams.priority = undefined
  priorityInput.value = ''
  queryParams.pageNum = 1
  fetchData()
}

// 分页查询函数
const fetchData = async () => {
  const res = await getAppByAdminPage({ ...queryParams })

  if (res.data.data) {
    data.value = (res.data.data.records as unknown as PreservedApp[]) ?? []
    total.value = Number(res.data.data.totalRow ?? 0)
  } else {
    message.error('获取数据失败:' + res.data.message)
  }
}

// 删除应用
const deleteApp = async (record: PreservedApp) => {
  const res = await removeAppByAdmin({ id: record.id! })

  if (res.data.data) {
    fetchData()
    message.success('删除成功')
  } else {
    message.error('删除失败:' + res.data.message)
  }
}

// 详情 / 修改弹窗显隐
const detailOpen = ref(false)

// 当前查看 / 修改的应用ID
const detailAppId = ref<string | number>()

// 打开应用详情 / 修改弹窗（弹窗内部按 id 拉取完整详情）
const showAppDetail = (record: PreservedApp) => {
  detailAppId.value = record.id
  detailOpen.value = true
}

onMounted(async () => {
  await fetchData()
})
</script>

<style scoped>
/* ========== 表头 / 表体全列居中（表头与单元格一并覆盖） ========== */
.admin-table--center :deep(.ant-table-thead > tr > th) {
  text-align: center;
}

.admin-table--center :deep(.ant-table-tbody > tr > td) {
  text-align: center;
}

/* 应用名称的「固定宽度 + 超出才渐隐」样式在 @/styles/base.css（.name-cell 系列），
   由 @/composables/useNameTruncation 负责判定溢出，此处不再重复定义。 */

/* ========== 标签：细节对齐应用编辑页的详情卡片 ========== */
.admin-table--center :deep(.ant-tag) {
  margin-inline-end: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 精选应用（priority=99）的优先级数字用品牌色强调。
   原为 #cf1322 正红，与新的陶土主色 #DA7757 撞色且偏冷，改用同一强调色保持单一视觉语言。 */
.priority-featured {
  color: var(--color-primary);
  font-weight: 600;
}
</style>
