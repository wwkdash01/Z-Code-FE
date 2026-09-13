<template>
  <!-- .admin-scope：管理页面整体回退无衬线（用户看不到后台，见 styles/base.css 说明） -->
  <div class="admin-scope">
    <a-form layout="inline" :model="queryParams" @finish="doSearch">
      <a-form-item label="账号">
        <a-input v-model:value="queryParams.userAccount" placeholder="请输入账号" />
      </a-form-item>

      <a-form-item label="用户名">
        <a-input v-model:value="queryParams.userName" placeholder="请输入用户名" />
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
        <!-- 角色：配色取自 @/config/userRole 的单一数据源；空角色显示 / -->
        <template v-if="column.dataIndex === 'userRole'">
          <a-tag
            v-if="getUserRoleMeta(record.userRole)"
            :style="tagStyle(getUserRoleMeta(record.userRole)!)"
          >
            {{ getUserRoleMeta(record.userRole)!.label }}
          </a-tag>
          <span v-else>{{ EMPTY_TEXT }}</span>
        </template>

        <template v-else-if="column.dataIndex === 'userAccount'">
          <!-- 账号：同用户名，固定 10 字符宽 + 超出才渐隐 -->
          <span
            :ref="(el) => setCellRef('userAccount', record.id, el)"
            class="name-cell"
            :class="{ 'name-cell--overflow': isOverflowing('userAccount', record.id) }"
            :style="boxStyle"
            :title="record.userAccount ?? undefined"
          >
            <span class="name-cell-text">{{ display(record.userAccount) }}</span>
          </span>
        </template>

        <template v-else-if="column.dataIndex === 'userName'">
          <!-- 用户名：盒子固定 10 字符宽，只有文字真的放不下时才渐隐 -->
          <span
            :ref="(el) => setCellRef('userName', record.id, el)"
            class="name-cell"
            :class="{ 'name-cell--overflow': isOverflowing('userName', record.id) }"
            :style="boxStyle"
            :title="record.userName ?? undefined"
          >
            <span class="name-cell-text">{{ display(record.userName) }}</span>
          </span>
        </template>

        <template v-else-if="column.dataIndex === 'createTime'">
          {{ dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>

        <template v-else-if="column.dataIndex === 'updateTime'">
          {{ dayjs(record.updateTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>

        <template v-else-if="column.dataIndex === 'action'">
          <span>
            <a @click="showUserDetail(record)">详情/修改</a>

            <a-divider type="vertical" />

            <a-popconfirm
              ok-text="确认"
              cancel-text="取消"
              :icon="null"
              title="删除后不可恢复"
              @confirm="deleteUser(record)"
            >
              <a>删除</a>
            </a-popconfirm>
          </span>
        </template>
      </template>
    </a-table>

    <!-- ========== 用户详情 / 修改弹窗 ========== -->
    <UserInfoDetailEditCard
      v-model:open="detailOpen"
      :user-id="detailUserId"
      @success="fetchData"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { getUserByPage, removeUserById } from '@/api/userController'
import { message } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import dayjs from 'dayjs'
import { getUserRoleMeta } from '@/config/userRole'
import { tagStyle } from '@/config/theme'
import { useNameTruncation } from '@/composables/useNameTruncation'
import UserInfoDetailEditCard from './UserInfoDetailEditCard.vue'
import type { PreservedUser } from '@/types/long-preserve'

// 表格空值占位符（弹窗里用「无」，表格里用「/」）
const EMPTY_TEXT = '/'

// 空值统一走这里：null / undefined / 空字符串 / 纯空格 → /
const display = (value?: string | number | null) => {
  if (value === null || value === undefined) return EMPTY_TEXT
  const text = String(value).trim()
  return text === '' ? EMPTY_TEXT : text
}

// 昵称列 / 账号列的「固定 10em 宽 + 超出才渐隐」：逻辑与样式与应用管理共用
const tableRef = ref<{ $el?: HTMLElement } | null>(null)
const { boxStyle, isOverflowing, setCellRef } = useNameTruncation(tableRef)

const columns = [
  {
    title: 'id',
    dataIndex: 'id',
    align: 'center',
  },
  {
    title: '账号',
    dataIndex: 'userAccount',
    align: 'center',
  },
  {
    title: '用户名',
    dataIndex: 'userName',
    align: 'center',
  },
  {
    title: '角色',
    dataIndex: 'userRole',
    align: 'center',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    align: 'center',
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    align: 'center',
  },
  {
    title: '操作',
    dataIndex: 'action',
    align: 'center',
  },
] as const

// 表格数据源
const data = ref<PreservedUser[]>()
const total = ref(0)

// 分页变量
const pagination = computed(() => {
  return {
    current: queryParams.pageNum ?? 1,
    pageSize: queryParams.pageSize ?? 10,
    total: total.value,
    showSizeChanger: true,
    showTotal: (total: number) => `共${total}条记录`,
    pageSizeOptions: ['1', '2', '5', '10'],
  }
})

// 换页：a-table change 回传的分页对象
const changePage = (page: TablePaginationConfig) => {
  queryParams.pageNum = page.current
  queryParams.pageSize = page.pageSize
  fetchData()
}

// 搜索条件
const queryParams = reactive<API.UserQueryRequestDTO>({
  pageNum: 1,
  pageSize: 10,
})

// 搜索函数
const doSearch = () => {
  queryParams.pageNum = 1
  fetchData()
}

// 重置查询条件
const resetParams = () => {
  queryParams.userAccount = ''
  queryParams.userName = ''
  queryParams.pageNum = 1
  fetchData()
}

// 分页查询函数
const fetchData = async () => {
  const res = await getUserByPage({
    userQueryRequestDTO: {
      ...queryParams,
    },
  })

  if (res.data.data) {
    data.value = (res.data.data.records as unknown as PreservedUser[]) ?? []
    total.value = res.data.data.totalRow ?? 0
  } else {
    message.error('获取数据失败:' + res.data.message)
  }
}

// 删除用户
const deleteUser = async (record: PreservedUser) => {
  const res = await removeUserById({
    id: record.id!,
  } as unknown as API.removeUserByIdParams)

  if (res.data.data) {
    fetchData()
    message.success('删除成功')
  } else {
    message.error('删除失败:' + res.data.message)
  }
}

// 详情 / 修改弹窗显隐
const detailOpen = ref(false)

// 当前查看 / 修改的用户ID
const detailUserId = ref<string | number>()

// 打开用户详情 / 修改弹窗（弹窗内部按 id 拉取完整详情）
const showUserDetail = (record: PreservedUser) => {
  detailUserId.value = record.id
  detailOpen.value = true
}

onMounted(() => {
  fetchData()
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

/* ========== 角色 tag：去掉 antd 默认的右外边距，让居中更准 ========== */
.admin-table--center :deep(.ant-tag) {
  margin-inline-end: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
