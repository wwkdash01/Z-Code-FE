import { useLoginUserStore } from "./stores/loginUser"
import { message } from "ant-design-vue"
import router from "./router"

let firstFetchLoginUser = true

/**
 * 全局权限校验
 */
router.beforeEach(async (to, from, next) => {
    const LoginUserStore = useLoginUserStore()

    // 首次加载确保后端返回再校验
    if (firstFetchLoginUser) {
        await LoginUserStore.fetchLoginUser()
        firstFetchLoginUser = false
    }

    // 如果目标url为管理员页面则校验权限
    // isAdmin 取自 store 的单一判定口径（与 Header、悬浮球共用一个来源）
    if (to.fullPath.startsWith('/admin') && !LoginUserStore.isAdmin) {
        message.error("无权限")
        next(`/user/login?redirect=${to.fullPath}`)
        return
    }

    // 放行
    next()
})