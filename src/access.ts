import { useLoginUserStore } from "./stores/loginUser"
import { message } from "ant-design-vue"
import router from "./router"
import { userLogin } from "./api/userController"

let firstFetchLoginUser = true

/**
 * 全局权限校验
 */
router.beforeEach(async (to, from, next) => {
    const LoginUserStore = useLoginUserStore()
    let loginUser = LoginUserStore.loginUser

    // 首次加载确保后端返回再校验
    if (firstFetchLoginUser) {
        await LoginUserStore.fetchLoginUser()
        loginUser = LoginUserStore.loginUser
        firstFetchLoginUser = false
    }

    // 如果目标url为管理员页面则校验参数
    const toUrl = to.fullPath
    if (toUrl.startsWith('/admin')) {
        // 未登录或者为用户登录 报错并重定向
        if (!loginUser || loginUser.userRole !== 'admin') {
            message.error("无权限")
            next(`/user/login?redirect=${to.fullPath}`)
            return
        }
    }

    // 放行
    next()
})