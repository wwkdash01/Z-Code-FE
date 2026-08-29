<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Grid, message } from 'ant-design-vue'
import { navItems } from '@/config/menu'
import { siteConfig } from '@/config/site'
import annoLogo from '@/assets/anno.png'
import { useLoginUserStore } from '@/stores/loginUser'
import { userLogout } from '@/api/userController'

// 获取登录用户状态
const loginUserStore = useLoginUserStore();
const isAdmin = computed(() => {
  return loginUserStore.loginUser.userRole === 'admin'
})

const route = useRoute()
const router = useRouter()

const screens = Grid.useBreakpoint()
const isMobile = computed(() => screens.value.md === false)
const menuOpen = ref(false)

const menuItems = computed(() =>
  navItems
  .filter((item) => !item.path?.startsWith('/admin') || isAdmin.value)
  .map((item) => ({
    key: item.key,
    label: item.label,
    path: item.path,
    children: item.children?.map((child) => ({
      key: child.key,
      label: child.label,
      path: child.path,
    })),
  })),
)

const selectedKeys = computed(() => {
  const key = findKeyByPath(route.path)
  return key ? [key] : []
})

const handleLogout = async () => {
  const res = await userLogout();
  if (res.data.code === 200 && res.data.data) {
    await loginUserStore.setLoginUser('未登录');
    message.success('注销成功')
    router.push({
      path: '/login',
      replace: true
    })
  } else {
    message.error('注销失败:' + res.data.message)
  }
}

function findItemByKey(key: string) {
  for (const item of navItems) {
    if (item.key === key) return item
    const child = item.children?.find((child) => child.key === key)
    if (child) return child
  }
  return undefined
}

function findKeyByPath(path: string) {
  const direct = navItems.find((item) => item.path === path)
  if (direct) return direct.key
  for (const parent of navItems) {
    const child = parent.children?.find((item) => item.path === path)
    if (child) return child.key
  }
  return undefined
}

function handleMenuClick({ key }: { key: string }) {
  const item = findItemByKey(key)
  if (item?.path) {
    router.push(item.path)
  }
  menuOpen.value = false
}

onMounted(() => {
    loginUserStore.fetchLoginUser()
})

</script>

<template>
  <header class="global-header">
    <div class="global-header__brand">
      <img class="global-header__logo" :src="annoLogo" alt="logo" />
      <span class="global-header__title">{{ siteConfig.title }}</span>
    </div>

    <nav v-if="!isMobile" class="global-header__nav">
      <a-menu
        mode="horizontal"
        :items="menuItems"
        :selectedKeys="selectedKeys"
        @click="handleMenuClick"
      />
    </nav>

    <div class="global-header__actions">
      <a-dropdown v-if="isMobile" v-model:open="menuOpen" trigger="click">
        <a-button>菜单</a-button>
        <template #overlay>
          <a-menu
            :items="menuItems"
            :selectedKeys="selectedKeys"
            @click="handleMenuClick"
          />
        </template>
      </a-dropdown>

    <div v-if="loginUserStore.loginUser.id">
        <a-popover trigger="hover" placement="bottomRight">

          <template #content>
            <div class="user-info-card">
              {{ loginUserStore.loginUser.userName ?? '无名' }}
              <a-button danger block @click="handleLogout">注销</a-button>
            </div>
          </template>

            <a-avatar :src="loginUserStore.loginUser.userAvatar" />
        
        </a-popover>
    </div>
    <div v-else>
      <a-button type="primary" href="/user/login">登录</a-button>
    </div>

    </div>
  </header>
</template>

<style scoped>
.global-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 32px;
  height: 56px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.global-header__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-width: 0;
}

.global-header__logo {
  width: 32px;
  height: 32px;
  border-radius: 6px;
}

.global-header__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: rgba(0, 0, 0, 0.88);
}

.global-header__nav {
  flex: 1;
  min-width: 0;
}

.global-header__nav :deep(.ant-menu) {
  border-bottom: none;
}

.global-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  margin-left: auto;
}

@media (max-width: 767px) {
  .global-header {
    gap: 16px;
    padding: 0 16px;
  }

  .global-header__title {
    font-size: 16px;
  }
}
</style>
