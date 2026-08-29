<template>

  <a-form
    layout="inline"
    :model="queryParams"
    @finish="doSearch">
    
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
    :columns="columns"
    :data-source="data"
    :pagination="pagination"
    @change="changePage">

    <template #bodyCell="{ column, record }">

      <template v-if="column.dataIndex === 'userRole'">
        <div v-if="record.userRole === 'user'">
            <a-tag color="green">用户</a-tag>
        </div>

        <div v-else-if="record.userRole === 'admin'">
            <a-tag color="blue">管理员</a-tag>
        </div>
      </template>

      <template v-else-if="column.dataIndex === 'createTime'">
        {{ dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') }}
      </template>

      <template v-else-if="column.dataIndex === 'updateTime'">
        {{ dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') }}
      </template>

      <template v-else-if="column.dataIndex === 'action'">
        <span>

          <a-popconfirm
            ok-text="确认"
            cancel-text="取消"
            :icon="null"
            title="删除后不可恢复"
            @confirm="deleteUser(record)">
            <a>删除</a>
          </a-popconfirm>

          <a-divider type="vertical" />

          <a @click="updateUser(record)">编辑</a>

        </span>
      </template>

        <template v-else-if="column.dataIndex === 'info'">
        <a @click="showUserDetail(record)">详情</a>
      </template>

    </template>

  </a-table>

  <UserInfoDetailCard v-model:open="detailOpen" :user="detailRecord" />

  <UserInfoEditCard v-model:open="editOpen" :user="editRecord" @success="fetchData" />

</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { getUserByPage, removeUserById } from '@/api/userController'
import { message } from 'ant-design-vue';
import dayjs from 'dayjs'
import UserInfoDetailCard from './UserInfoDetailCard.vue'
import UserInfoEditCard from './UserInfoEditCard.vue'

const columns = [
  {
    title: 'id',
    dataIndex: 'id',
  },
  {
    title: '账号',
    dataIndex: 'userAccount',
  },
  {
    title: '用户名',
    dataIndex: 'userName',
  },
  {
    title: '角色',
    dataIndex: 'userRole',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
  },
  {
    title: '操作',
    dataIndex: 'action',
  },
  {
    title: '更多',
    dataIndex: 'info',
  },
];

// 表格数据源
const data = ref<API.User[]>()
const total = ref(0)

// 分页变量
const pagination = computed(() => {
    return {
        current: queryParams.pageNum ?? 1,
        pageSize: queryParams.pageSize ?? 10,
        total: total.value,
        showSizeChanger: true,
        showTotal: (total: number) => `共${total}条记录`,
        pageSizeOptions: ['1', '2', '5', '10']
    }
})

// 换页
const changePage = (page: any) => {
    queryParams.pageNum = page.current;
    queryParams.pageSize = page.pageSize;
    fetchData()
}

// 搜索条件
const queryParams = reactive<API.UserQueryRequestDTO>({
    pageNum: 1,
    pageSize: 10
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
            ...queryParams
        }
    })

    if (res.data.data) {
        data.value = res.data.data.records ?? []
        total.value = res.data.data.totalRow ?? 0
    } else {
        message.error('获取数据失败:' + res.data.message)
    }
}

// 删除用户
const deleteUser = async (record: API.User) => {
    const res = await removeUserById({
        id: record.id!
    })

    if (res.data.data) {
        fetchData()
        message.success('删除成功')
    } else {
        message.error('删除失败:' + res.data.message)
    }
}

// 详情弹窗显隐
const detailOpen = ref(false)

// 当前查看的用户记录
const detailRecord = ref<API.User | null>(null)

// 展示用户详情卡片
const showUserDetail = (record: API.User) => {
    detailRecord.value = record
    detailOpen.value = true

}

// 编辑弹窗显隐
const editOpen = ref(false)

// 当前编辑的用户记录
const editRecord = ref<API.User | null>(null)

// 展示用户编辑卡片
const updateUser = (record: API.User) => {
    editRecord.value = record
    editOpen.value = true
}

onMounted(() => {
    fetchData()
})

</script>

