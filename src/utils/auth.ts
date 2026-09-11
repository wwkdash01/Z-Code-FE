const REDIRECT_URL_KEY = '_login_redirect'
const AUTH_MSG_KEY = '_auth_msg'

export function redirect2Login(prompt?: string) {
    // 只存路径和查询参数，不存完整 URL
    const path = window.location.pathname + window.location.search
    localStorage.setItem(REDIRECT_URL_KEY, path)
    localStorage.setItem(AUTH_MSG_KEY, prompt ? prompt : '请先登录')

    window.location.href = '/user/login'
}

export function getRedirectURL() {
    const redirectURL = localStorage.getItem(REDIRECT_URL_KEY)

    localStorage.removeItem(REDIRECT_URL_KEY)

    return { redirectURL }
}

export function getAuthMsg() {
    const authMsg = localStorage.getItem(AUTH_MSG_KEY)

    localStorage.removeItem(AUTH_MSG_KEY)

    return { authMsg }
}
