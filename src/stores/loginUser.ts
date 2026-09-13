import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getCurrentUser } from '@/api/userController.ts'
import type { PreservedUserVO } from '@/types/long-preserve'

/**
 * 登录用户信息store
 */
export const useLoginUserStore = defineStore('counter', () => {
  // 定义数据，设定默认值
  const loginUser = ref<PreservedUserVO>({
    userName: '未登录',
  })

  // 角色判定的单一数据源：GlobalHeader、路由守卫（access.ts）、管理员悬浮球都取这里，
  // 避免各处重复写 `userRole === 'admin'` 导致口径漂移
  const isAdmin = computed(() => loginUser.value.userRole === 'admin')

  // 获取登录用户信息
  async function fetchLoginUser() {
    try {
      const res = await getCurrentUser();
      if (res.data.code == 200 && res.data.data) {
        loginUser.value = res.data.data as unknown as PreservedUserVO
      }
    } catch {
      // 后端不可用时忽略，保持默认未登录状态
    }
  }

  // 用户信息setter
  function setLoginUser(newLoginUser: PreservedUserVO) {
    loginUser.value = newLoginUser;
  }

  // 导出变量和操作便捷的方法
  return { loginUser, isAdmin, fetchLoginUser, setLoginUser }
})
