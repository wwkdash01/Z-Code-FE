<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  getAppById,
  getAppByAdmin,
  updateAppById,
  updateAppByAdmin,
} from '@/api/appController'
import { useLoginUserStore } from '@/stores/loginUser'
import type { PreservedApp, PreservedAppVO } from '@/types/long-preserve'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const isAdmin = computed(() => loginUserStore.loginUser.userRole === 'admin')
const appId = computed(() => (route.query.id as string) || '')

const loading = ref(false)
const saving = ref(false)
const forbidden = ref(false)

const form = reactive({
  appName: '',
  cover: '',
  priority: 0,
})

async function fetchApp() {
  if (!appId.value) {
    message.error('应用 ID 无效')
    router.push('/')
    return
  }
  loading.value = true
  try {
    if (isAdmin.value) {
      // 管理员可编辑任意应用，需要 priority 等全量字段
      const res = await getAppByAdmin({ id: appId.value })
      if (res.data.code === 200 && res.data.data) {
        const app = res.data.data as unknown as PreservedApp
        form.appName = app.appName || ''
        form.cover = app.cover || ''
        form.priority = app.priority ?? 0
      } else {
        message.error('获取应用信息失败：' + res.data.message)
      }
    } else {
      const res = await getAppById({ id: appId.value })
      if (res.data.code === 200 && res.data.data) {
        const app = res.data.data as unknown as PreservedAppVO
        // 普通用户只能编辑自己的应用（后端为最终校验）
        if (app.userName !== loginUserStore.loginUser.userName) {
          forbidden.value = true
          return
        }
        form.appName = app.appName || ''
      } else {
        message.error('获取应用信息失败：' + res.data.message)
      }
    }
  } catch {
    message.error('获取应用信息失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!appId.value || !form.appName.trim()) return
  saving.value = true
  try {
    let ok = false
    let errMsg = ''
    if (isAdmin.value) {
      const res = await updateAppByAdmin(
        { id: appId.value },
        {
          appName: form.appName.trim(),
          cover: form.cover || undefined,
          priority: form.priority,
        },
      )
      ok = !!res.data.data
      errMsg = res.data.message || ''
    } else {
      const res = await updateAppById(
        { id: appId.value },
        { appName: form.appName.trim() },
      )
      ok = !!res.data.data
      errMsg = res.data.message || ''
    }
    if (ok) {
      message.success('保存成功')
      await fetchApp()
    } else {
      message.error('保存失败：' + errMsg)
    }
  } catch {
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!loginUserStore.loginUser.id) {
    await loginUserStore.fetchLoginUser()
  }
  await fetchApp()
})
</script>

<template>
  <div class="app-info-edit-page">
    <a-card title="应用信息修改" class="edit-card">
      <a-result v-if="forbidden" status="403" title="403" sub-title="只能编辑自己的应用" />

      <a-spin v-else :spinning="loading">
        <a-form layout="vertical" :model="form" class="edit-form" @finish="handleSave">
          <a-form-item
            label="应用名称"
            name="appName"
            :rules="[{ required: true, message: '请输入应用名称' }]"
          >
            <a-input v-model:value="form.appName" placeholder="请输入应用名称" />
          </a-form-item>

          <template v-if="isAdmin">
            <a-form-item label="应用封面" name="cover">
              <a-input v-model:value="form.cover" placeholder="请输入封面图片 URL" />
              <img v-if="form.cover" :src="form.cover" class="cover-preview" alt="封面预览" />
            </a-form-item>

            <a-form-item label="优先级" name="priority">
              <a-input-number v-model:value="form.priority" :min="0" :max="99" />
              <div class="form-hint">优先级设为 99 表示精选应用</div>
            </a-form-item>
          </template>

          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="saving">保存</a-button>
            <a-button class="back-btn" @click="router.back()">返回</a-button>
          </a-form-item>
        </a-form>
      </a-spin>
    </a-card>
  </div>
</template>

<style scoped>
.app-info-edit-page {
  max-width: 640px;
  margin: 0 auto;
}

.edit-form {
  max-width: 480px;
}

.cover-preview {
  display: block;
  margin-top: 8px;
  max-width: 240px;
  max-height: 150px;
  border-radius: 8px;
  object-fit: cover;
}

.form-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 4px;
}

.back-btn {
  margin-left: 8px;
}
</style>
