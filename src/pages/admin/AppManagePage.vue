<template>
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
    :columns="columns"
    :data-source="data"
    :pagination="pagination"
    @change="changePage"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.dataIndex === 'appTag'">
        <a-tag v-if="record.appTag" color="blue">{{ record.appTag }}</a-tag>
      </template>

      <template v-else-if="column.dataIndex === 'priority'">
        <a-tag v-if="record.priority === 99" color="pink">精选</a-tag>
        <span>{{ record.priority ?? 0 }}</span>
      </template>

      <template v-else-if="column.dataIndex === 'createTime'">
        {{ dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') }}
      </template>

      <template v-else-if="column.dataIndex === 'updateTime'">
        {{ dayjs(record.updateTime).format('YYYY-MM-DD HH:mm:ss') }}
      </template>

      <template v-else-if="column.dataIndex === 'action'">
        <span>
          <a @click="editApp(record)">编辑</a>

          <a-divider type="vertical" />

          <a-popconfirm
            ok-text="确认"
            cancel-text="取消"
            :icon="null"
            title="设为精选后优先级将置为 99"
            @confirm="featureApp(record)"
          >
            <a>精选</a>
          </a-popconfirm>

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

      <template v-else-if="column.dataIndex === 'info'">
        <a @click="showAppDetail(record)">详情</a>
      </template>
    </template>
  </a-table>

  <!-- ========== 应用详情弹窗 ========== -->
  <a-modal v-model:open="detailOpen" title="应用详情" :footer="null" :width="640">
    <a-descriptions v-if="detailRecord" bordered :column="1" size="small">
      <a-descriptions-item label="应用ID">{{ detailRecord.id }}</a-descriptions-item>
      <a-descriptions-item label="应用名称">{{ detailRecord.appName }}</a-descriptions-item>
      <a-descriptions-item label="应用标签">{{ detailRecord.appTag }}</a-descriptions-item>
      <a-descriptions-item label="生成类型">{{ detailRecord.codeGenType }}</a-descriptions-item>
      <a-descriptions-item label="优先级">{{ detailRecord.priority }}</a-descriptions-item>
      <a-descriptions-item label="初始提示词">{{ detailRecord.initPrompt }}</a-descriptions-item>
      <a-descriptions-item label="封面">{{ detailRecord.cover || '无' }}</a-descriptions-item>
      <a-descriptions-item label="代码目录">{{ detailRecord.codeGenDir || '无' }}</a-descriptions-item>
      <a-descriptions-item label="部署Key">{{ detailRecord.deployKey || '未部署' }}</a-descriptions-item>
      <a-descriptions-item label="部署目录">{{ detailRecord.deployDir || '无' }}</a-descriptions-item>
      <a-descriptions-item label="部署时间">
        {{ detailRecord.deployTime ? dayjs(detailRecord.deployTime).format('YYYY-MM-DD HH:mm:ss') : '无' }}
      </a-descriptions-item>
      <a-descriptions-item label="创建者ID">{{ detailRecord.createUserId }}</a-descriptions-item>
      <a-descriptions-item label="创建时间">
        {{ dayjs(detailRecord.createTime).format('YYYY-MM-DD HH:mm:ss') }}
      </a-descriptions-item>
      <a-descriptions-item label="更新时间">
        {{ dayjs(detailRecord.updateTime).format('YYYY-MM-DD HH:mm:ss') }}
      </a-descriptions-item>
    </a-descriptions>
  </a-modal>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  getAppByAdminPage,
  getAppByAdmin,
  updateAppByAdmin,
  removeAppByAdmin,
} from '@/api/appController'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import type {
  PreservedApp,
  PreservedGetAppByAdminPageParams,
} from '@/types/long-preserve'

const router = useRouter()

const TAG_OPTIONS = [
  { value: 'tool', label: '工具' },
  { value: 'webPage', label: '网页' },
  { value: 'profile', label: '个人博客' },
]

const CODE_GEN_OPTIONS = [
  { value: 'singleton', label: '单文件' },
  { value: 'multifile', label: '多文件' },
]

const columns = [
  { title: 'id', dataIndex: 'id' },
  { title: '应用名称', dataIndex: 'appName' },
  { title: '标签', dataIndex: 'appTag' },
  { title: '生成类型', dataIndex: 'codeGenType' },
  { title: '优先级', dataIndex: 'priority' },
  { title: '部署Key', dataIndex: 'deployKey' },
  { title: '创建时间', dataIndex: 'createTime' },
  { title: '更新时间', dataIndex: 'updateTime' },
  { title: '操作', dataIndex: 'action' },
  { title: '更多', dataIndex: 'info' },
]

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

// 编辑：新开页面跳转到应用信息修改页
const editApp = (record: PreservedApp) => {
  const route = router.resolve({ path: '/app/app-info', query: { id: record.id } })
  window.open(route.href)
}

// 精选：优先级置为 99
const featureApp = async (record: PreservedApp) => {
  const res = await updateAppByAdmin(
    { id: record.id! },
    { priority: 99 },
  )

  if (res.data.data) {
    fetchData()
    message.success('已设为精选')
  } else {
    message.error('设置失败:' + res.data.message)
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

// 详情弹窗显隐
const detailOpen = ref(false)

// 当前查看的应用记录
const detailRecord = ref<PreservedApp | null>(null)

// 展示应用详情
const showAppDetail = async (record: PreservedApp) => {
  const res = await getAppByAdmin({ id: record.id! })
  if (res.data.code === 200 && res.data.data) {
    detailRecord.value = res.data.data as unknown as PreservedApp
    detailOpen.value = true
  } else {
    message.error('获取详情失败:' + res.data.message)
  }
}

onMounted(() => {
  fetchData()
})
</script>
