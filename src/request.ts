import axios from 'axios'
import { message } from 'ant-design-vue'

/**
 * 安全整数阈值，超过此值的整数需要转为字符串保留精度
 */
const SAFE_INT_THRESHOLD = 9007199254740991 // Number.MAX_SAFE_INTEGER

/**
 * 递归将响应中超过安全整数范围的大整数转为字符串，避免 JS Number 精度丢失。
 * 用于 axios transformResponse，在默认 JSON 解析之前执行。
 */
function preserveLongIntegrity(text: string): any {
  if (!text) return null

  /** 从 JSON 文本中匹配整数 token，超过阈值则返回字符串，否则返回原始数字 */
  const rawJson = text.replace(
    /(?<=:\s*)(-?\d+)(?=[,\s\n\r\}\]])/g,
    (_match, numStr) => {
      const n = Number(numStr)
      if (Number.isSafeInteger(n)) return numStr
      // 超出安全范围的整数：转字符串保留精度
      return `"${numStr}"`
    },
  )

  try {
    return JSON.parse(rawJson)
  } catch {
    // 非 JSON 响应（如 SSE），原样返回
    return text
  }
}

// 创建 Axios 实例
const myAxios = axios.create({
  baseURL: 'http://localhost:58080/api',
  timeout: 60000,
  withCredentials: true,
  transformResponse: [(data) => preserveLongIntegrity(typeof data === 'string' ? data : String(data))],
})

// 全局请求拦截器
myAxios.interceptors.request.use(
  function (config) {
    // Do something before request is sent
    return config
  },
  function (error) {
    // Do something with request error
    return Promise.reject(error)
  },
)

// 全局响应拦截器
myAxios.interceptors.response.use(
  function (response) {
    const { data } = response
    // 未登录
    if (data.code === 40100) {
      console.error('[40100] url:', response.request.responseURL, 'body:', data)
      // 不是获取用户信息的请求，并且用户目前不是已经在用户登录页面，则跳转到登录页面
      const url = response.request.responseURL
      // 用户相关接口不触发跳转，由页面自行处理
      const isUserRequest = url.includes('/users/')
      const isLoginPage = window.location.pathname.includes('/user/login')
      if (!isUserRequest && !isLoginPage) {
        window.location.href = `/user/login?prompt_login=1&redirect=${window.location.href}`
      }
    }
    return response
  },
  function (error) {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    return Promise.reject(error)
  },
)

export default myAxios
