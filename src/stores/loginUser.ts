import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getCurrentUser } from '@/api/userController.ts'

/**
 * 登录用户信息store
 */
export const useLoginUserStore = defineStore('counter', () => {
  // 定义数据，设定默认值
  const loginUser = ref<API.UserVO>({
    userName: '未登录',
  })

  // 获取登录用户信息
  async function fetchLoginUser() {
    const res = await getCurrentUser();
    if (res.data.code == 200 && res.data.data) {
      loginUser.value = res.data.data
    }
  }

  // 用户信息setter
  function setLoginUser(newLoginUser: any) {
    loginUser.value = newLoginUser;
  }

  // 到处变量和操作便利的方法
  return { loginUser, fetchLoginUser, setLoginUser }
})
