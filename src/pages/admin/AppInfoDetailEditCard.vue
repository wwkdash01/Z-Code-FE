<template>
  <a-modal
    :open="open"
    :width="760"
    centered
    wrap-class-name="admin-scope"
    title="应用详情 / 修改"
    ok-text="保存"
    cancel-text="取消"
    :confirm-loading="saving"
    @ok="handleSave"
    @cancel="emit('update:open', false)"
  >
    <a-spin :spinning="loading">
      <div v-if="hasDetail" class="app-detail-edit">
        <div class="field-grid">
          <!-- ===== 可修改字段：无边框输入框，点击「保存」后统一提交 ===== -->
          <div class="field-item">
            <span class="field-label">应用名称</span>
            <a-input
              v-model:value="draft.appName"
              placeholder="请输入应用名称"
              :bordered="false"
              :disabled="saving"
            />
          </div>

          <div class="field-item">
            <span class="field-label">应用标签</span>
            <!-- 选中值保持原始枚举字符串（保存时直接提交），下拉项与回显都渲染成 tag -->
            <a-select
              v-model:value="draft.appTag"
              :placeholder="EMPTY_TEXT"
              :bordered="false"
              allow-clear
              :disabled="saving"
              :options="TAG_OPTIONS"
            >
              <!-- 下拉列表每一项 -->
              <template #option="{ value }">
                <AppTagOption :value="value" />
              </template>
              <!-- 选中值回显（单选走 optionLabel，不走 tagRender） -->
              <template #optionLabel="{ value }">
                <AppTagOption v-if="value !== undefined" :value="value" />
              </template>
            </a-select>
          </div>

          <div class="field-item field-item--full">
            <span class="field-label">应用封面</span>
            <a-input
              v-model:value="draft.cover"
              placeholder="请输入封面图片 URL"
              :bordered="false"
              :disabled="saving"
            />
          </div>

          <div class="field-item">
            <span class="field-label">优先级（99 为精选）</span>
            <a-input-number
              v-model:value="draft.priority"
              :min="0"
              :max="99"
              placeholder="0"
              :bordered="false"
              :disabled="saving"
              style="width: 100%"
            />
          </div>

          <!-- ===== 只读字段 ===== -->
          <div class="field-item">
            <span class="field-label">应用 ID</span>
            <span class="field-text field-text--readonly">{{ detail.id }}</span>
          </div>

          <div class="field-item">
            <span class="field-label">生成类型</span>
            <span class="field-text field-text--readonly">{{ codeGenTypeText }}</span>
          </div>

          <div class="field-item">
            <span class="field-label">创建者 ID</span>
            <span class="field-text field-text--readonly">{{ display(detail.createUserId) }}</span>
          </div>

          <div class="field-item">
            <span class="field-label">部署 Key</span>
            <span class="field-text field-text--readonly">{{ display(detail.deployKey) }}</span>
          </div>

          <div class="field-item field-item--full">
            <span class="field-label">初始提示词</span>
            <span class="field-text field-text--readonly">{{ display(detail.initPrompt) }}</span>
          </div>

          <div class="field-item">
            <span class="field-label">代码目录</span>
            <span class="field-text field-text--readonly">{{ display(detail.codeGenDir) }}</span>
          </div>

          <div class="field-item">
            <span class="field-label">部署目录</span>
            <span class="field-text field-text--readonly">{{ display(detail.deployDir) }}</span>
          </div>

          <div class="field-item">
            <span class="field-label">部署时间</span>
            <span class="field-text field-text--readonly">{{ formatTime(detail.deployTime) }}</span>
          </div>

          <div class="field-item">
            <span class="field-label">创建时间</span>
            <span class="field-text field-text--readonly">{{ formatTime(detail.createTime) }}</span>
          </div>

          <div class="field-item">
            <span class="field-label">更新时间</span>
            <span class="field-text field-text--readonly">{{ formatTime(detail.updateTime) }}</span>
          </div>
        </div>
      </div>

      <a-empty v-else-if="!loading" :description="EMPTY_TEXT" />
    </a-spin>
  </a-modal>
</template>

<script lang="ts" setup>
import { ref, reactive, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { getAppByAdmin, updateAppByAdmin } from '@/api/appController'
import { APP_TAG_OPTIONS } from '@/config/appTag'
import AppTagOption from '@/components/admin/AppTagOption.vue'
import type { PreservedApp } from '@/types/long-preserve'

const props = defineProps<{
  open: boolean
  appId?: string | number
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  success: []
}>()

// 标签选项 / 配色 / 图标：单一数据源
const TAG_OPTIONS = APP_TAG_OPTIONS

const CODE_GEN_TEXT: Record<string, string> = {
  singleton: '单文件',
  multifile: '多文件',
}

// 完整详情（接口返回）：只读字段直接读它，也是改动比对与重置的基准
const origin = ref<PreservedApp | null>(null)

// 模板中安全访问的详情（无数据时为占位对象）
const detail = computed<PreservedApp>(() => origin.value ?? {})

// 只读字段在模板里通过 detail 访问，是否已加载
const hasDetail = computed(() => origin.value !== null)

// 可修改字段的编辑草稿（点击「保存」前只改这里，不落库）
const draft = reactive({
  appName: '',
  cover: '',
  priority: 0 as number | null,
  appTag: undefined as string | undefined,
})

const loading = ref(false)

// 保存中（挂到弹窗确定的 loading 上）
const saving = ref(false)

// 空字段统一占位符：弹窗内容里缺值一律显示「无」
const EMPTY_TEXT = '无'

// 空值统一走这里：null / undefined / 空字符串 / 纯空格 → \，其余原样输出
const display = (value?: string | number | null) => {
  if (value === null || value === undefined) return EMPTY_TEXT
  const text = String(value).trim()
  return text === '' ? EMPTY_TEXT : text
}

const codeGenTypeText = computed(
  () => CODE_GEN_TEXT[origin.value?.codeGenType ?? ''] ?? display(origin.value?.codeGenType),
)

const formatTime = (time?: string) =>
  time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : EMPTY_TEXT

// 以详情为基准重置草稿（打开详情时、保存失败时共用）
const resetDraft = () => {
  const app = origin.value
  draft.appName = app?.appName ?? ''
  draft.cover = app?.cover ?? ''
  draft.priority = app?.priority ?? 0
  draft.appTag = app?.appTag ?? undefined
}

// 拉取详情并回填草稿
const fetchDetail = async () => {
  if (!props.appId) return
  loading.value = true
  try {
    const res = await getAppByAdmin({ id: props.appId })
    if (res.data.code === 200 && res.data.data) {
      origin.value = res.data.data as unknown as PreservedApp
      resetDraft()
    } else {
      message.error('获取详情失败：' + res.data.message)
    }
  } catch {
    message.error('获取详情失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      origin.value = null
      resetDraft()
      fetchDetail()
    }
  },
  { immediate: true },
)

// 点击「保存」：校验 → 汇总改动字段 → 提交 → 成功关闭弹窗 / 失败重置卡片
const handleSave = async () => {
  const app = origin.value
  if (!app?.id || saving.value) return

  const appName = draft.appName.trim()
  if (!appName) {
    message.warning('应用名称不能为空')
    return
  }

  const priority = Number(draft.priority ?? 0)
  if (Number.isNaN(priority) || priority < 0 || priority > 99) {
    message.warning('优先级需为 0 ~ 99 的数字')
    return
  }

  const cover = draft.cover.trim()
  const appTag = draft.appTag ?? undefined

  // 只提交发生变化的字段
  const body: API.AppAdminUpdateRequestDTO = {}
  if (appName !== (app.appName ?? '')) body.appName = appName
  if (cover !== (app.cover ?? '')) body.cover = cover
  if (priority !== (app.priority ?? 0)) body.priority = priority
  if (appTag !== (app.appTag ?? undefined)) {
    body.appTag = appTag as API.AppAdminUpdateRequestDTO['appTag']
  }

  // 无改动：直接关闭，不发请求
  if (Object.keys(body).length === 0) {
    emit('update:open', false)
    return
  }

  saving.value = true
  try {
    const res = await updateAppByAdmin({ id: app.id }, body)
    if (res.data.data) {
      emit('update:open', false)
      message.success('保存成功')
      emit('success')
    } else {
      resetDraft()
      message.error('保存失败：' + res.data.message)
    }
  } catch {
    resetDraft()
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.app-detail-edit {
  padding: 4px 0;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 24px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 4px 0;
}

.field-item--full {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-tertiary);
}

.field-text {
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text);
  word-break: break-all;
}

.field-text--readonly {
  color: var(--color-text-secondary);
}

/* 无边框输入：hover / focus 时给一层浅色底，提示可编辑 */
.app-detail-edit :deep(.ant-input),
.app-detail-edit :deep(.ant-input-number),
.app-detail-edit :deep(.ant-select-selector) {
  padding-left: 0;
  transition: background-color 0.2s;
}

.app-detail-edit :deep(.ant-input-number-input) {
  padding-left: 0;
}

.app-detail-edit :deep(.ant-input:not(:disabled)):hover,
.app-detail-edit :deep(.ant-input-number:not(.ant-input-number-disabled)):hover,
.app-detail-edit :deep(.ant-select:not(.ant-select-disabled):hover .ant-select-selector) {
  background-color: rgba(0, 0, 0, 0.03);
}

.app-detail-edit :deep(.ant-select-selector) {
  background-color: transparent;
}

</style>
