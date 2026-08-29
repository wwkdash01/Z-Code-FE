<template>
  <a-card class="user-edit-card" :bordered="false">
    <div class="card-inner">
      <!-- 左栏：头像 + 姓名 + 角色 -->
      <div class="left-panel">
        <!-- 头像：点击触发上传 -->
        <div class="avatar-wrapper" @click="handleAvatarClick">
          <a-avatar :size="140" :src="test_edit_form_data.avatar" alt="用户头像" />
          <div class="avatar-mask">
            <CameraOutlined style="font-size: 22px" />
            <span>更换头像</span>
          </div>
          <input
            ref="avatarInputRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleAvatarChange"
          />
        </div>

        <!-- 姓名：查看态（常显铅笔） -->
        <div v-if="editingField !== 'name'" class="name-row">
          <span class="user-name">{{ test_edit_form_data.name }}</span>
          <span class="edit-icon" @click="startEdit('name')">
            <EditOutlined />
          </span>
        </div>
        <!-- 姓名：编辑态 -->
        <div v-else class="name-edit-row">
          <a-input
            v-model:value="tempEditValue"
            size="middle"
            :style="{ width: '140px', textAlign: 'center', fontWeight: 600, fontSize: '16px' }"
            @pressEnter="confirmEdit('name')"
            @blur="confirmEdit('name')"
          />
          <a-button type="primary" size="small" @click="confirmEdit('name')">确认</a-button>
        </div>

        <!-- 角色：tag + 下拉选择 -->
        <a-select
          v-model:value="test_edit_form_data.role"
          :options="test_role_select_items"
          size="small"
          class="role-select"
          @change="handleRoleChange"
          variant="borderless"
        >
          <template #suffixIcon>
            <DownOutlined />
          </template>
        </a-select>

        <div class="avatar-hint">点击头像可更换</div>
      </div>

      <!-- 分隔线 -->
      <a-divider type="vertical" class="divider" />

      <!-- 右栏：10个字段（两列布局，铅笔常显） -->
      <div class="right-panel">
        <div class="field-grid">
          <div
            v-for="field in fieldList"
            :key="field.key"
            class="field-item"
          >
            <span class="field-label">{{ field.label }}</span>

            <!-- 查看态 -->
            <div v-if="editingField !== field.key" class="field-row">
              <span class="field-value">{{ test_edit_form_data[field.key] }}</span>
              <span class="edit-icon" @click="startEdit(field.key)">
                <EditOutlined />
              </span>
            </div>

            <!-- 编辑态 -->
            <div v-else class="field-edit">
              <a-input
                v-model:value="tempEditValue"
                size="small"
                @pressEnter="confirmEdit(field.key)"
              />
              <a-button type="primary" size="small" @click="confirmEdit(field.key)">
                确认
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </a-card>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import {
  EditOutlined,
  CameraOutlined,
  DownOutlined,
} from '@ant-design/icons-vue'

// ===== 表单数据 =====
const test_edit_form_data = reactive({
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
  name: '姓名',
  role: '角色选项1',
  field1: '字段内容1',
  field2: '字段内容2',
  field3: '字段内容3',
  field4: '字段内容4',
  field5: '字段内容5',
  field6: '字段内容6',
  field7: '字段内容7',
  field8: '字段内容8',
  field9: '字段内容9',
  field10: '字段内容10',
})

// ===== 角色选项 =====
const test_role_select_items = ref([
  { label: '角色选项1', value: '角色选项1' },
  { label: '角色选项2', value: '角色选项2' },
  { label: '角色选项3', value: '角色选项3' },
  { label: '角色选项4', value: '角色选项4' },
])

// ===== 字段列表配置 =====
const fieldList = [
  { key: 'field1', label: '字段名称1' },
  { key: 'field2', label: '字段名称2' },
  { key: 'field3', label: '字段名称3' },
  { key: 'field4', label: '字段名称4' },
  { key: 'field5', label: '字段名称5' },
  { key: 'field6', label: '字段名称6' },
  { key: 'field7', label: '字段名称7' },
  { key: 'field8', label: '字段名称8' },
  { key: 'field9', label: '字段名称9' },
  { key: 'field10', label: '字段名称10' },
]

// ===== 编辑状态 =====
const editingField = ref(null) // 当前正在编辑的字段 key，null 表示无
const tempEditValue = ref('') // 编辑中的临时值
const avatarInputRef = ref(null)

// ===== 方法：头像点击 =====
function handleAvatarClick() {
  message.info('触发头像变更')
  // 触发隐藏的 file input
  nextTick(() => {
    avatarInputRef.value?.click()
  })
}

function handleAvatarChange(e) {
  const file = e.target.files?.[0]
  if (file) {
    message.success(`已选择文件：${file.name}`)
  }
}

// ===== 方法：开始编辑 =====
function startEdit(fieldKey) {
  tempEditValue.value = test_edit_form_data[fieldKey]
  editingField.value = fieldKey
}

// ===== 方法：确认编辑 =====
function confirmEdit(fieldKey) {
  message.info('触发编辑')
  test_edit_form_data[fieldKey] = tempEditValue.value
  editingField.value = null
}

// ===== 方法：角色变更 =====
function handleRoleChange(value) {
  message.info(`触发编辑（角色切换为：${value}）`)
}
</script>

<style scoped>
.user-edit-card {
  width: 720px;
  border-radius: 8px;
}

.card-inner {
  display: flex;
  gap: 32px;
  align-items: stretch;
  min-height: 460px;
  padding: 8px 0;
}

/* ===== 左栏 ===== */
.left-panel {
  flex-shrink: 0;
  width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
}

.avatar-wrapper {
  position: relative;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  border: 3px solid #f0f0f0;
  transition: all 0.2s;
}
.avatar-wrapper:hover {
  border-color: #1677ff;
}
.avatar-wrapper :deep(.ant-avatar) {
  width: 100% !important;
  height: 100% !important;
  line-height: 140px;
}
.avatar-wrapper :deep(.ant-avatar img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.25s;
}
.avatar-wrapper:hover .avatar-mask {
  opacity: 1;
}

/* 姓名行 */
.name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.user-name {
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  color: rgba(0, 0, 0, 0.88);
}

.name-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 角色选择 */
.role-select {
  min-width: 120px;
}
.role-select :deep(.ant-select-selector) {
  text-align: center;
  background: #f6ffed !important;
  border: 1px solid #b7eb8f !important;
  border-radius: 4px !important;
  color: #52c41a !important;
}
.role-select:hover :deep(.ant-select-selector) {
  border-color: #1677ff !important;
  color: #1677ff !important;
  background: #e6f4ff !important;
}

.avatar-hint {
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.6;
  margin-top: 4px;
}

/* ===== 分隔线 ===== */
.divider {
  margin: 0 !important;
  top: 0 !important;
  height: auto !important;
  align-self: stretch;
}

/* ===== 右栏 ===== */
.right-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.45);
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-value {
  flex: 1;
  font-size: 14px;
  line-height: 32px;
  color: rgba(0, 0, 0, 0.88);
  word-break: break-all;
}

.edit-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bfbfbf;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
}
.edit-icon:hover {
  color: #1677ff;
  background: #e6f4ff;
}

.field-edit {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
</style>
