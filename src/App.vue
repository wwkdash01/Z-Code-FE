<script setup lang="ts">
import { ConfigProvider } from 'ant-design-vue'
import BasicLayout from '@/layouts/BasicLayout.vue'
import AdminFloatingBall from '@/components/AdminFloatingBall.vue'
import { antdTheme } from '@/config/theme'
import { useLoginUserStore } from './stores/loginUser';
import '@/access';

const loginUserStore = useLoginUserStore();
loginUserStore.fetchLoginUser();
</script>

<template>
  <!-- 全站 antd 主题（主色 / 底色 / 圆角 / 字体）唯一注入点，令牌见 @/config/theme -->
  <ConfigProvider :theme="antdTheme">
    <BasicLayout />
    <!-- 管理员悬浮球：全局渲染（含 meta.blank 全屏页），自身按登录角色决定是否出现 -->
    <AdminFloatingBall />
  </ConfigProvider>
</template>

<style scoped>
.test-btn {
  position: fixed;
  top: 68px;
  right: 24px;
  z-index: 50;
}
</style>
