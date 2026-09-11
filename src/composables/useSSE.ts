import { ref } from 'vue'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { redirect2Login } from '@/utils/auth'
import { useLoginUserStore } from '@/stores/loginUser'

export function useSSE() {
  const aiResponse = ref('')
  const isGenerating = ref(false)
  const error = ref<Error | null>(null)
  const loginUserStore = useLoginUserStore()

  async function fetchSSE(appId: number | string, userPrompt: string) {
    // 直接用 user store 检查登录状态，未登录直接跳转
    if (!loginUserStore.loginUser.id) {
      redirect2Login('请先登录后再使用')
      return
    }

    aiResponse.value = ''
    isGenerating.value = true
    error.value = null

    const url = `http://localhost:58080/api/apps/user/code-stream?appId=${appId}&userPrompt=${encodeURIComponent(userPrompt)}`

    try {
      console.log(`[${new Date().toLocaleTimeString()}] SSE 请求已建立`)
      await fetchEventSource(url, {
        credentials: 'include',
        async onopen(response) {
          console.log(`[${new Date().toLocaleTimeString()}] SSE 连接打开，状态：${response.status}`)
          // 打开失败终止并弹 message
          if (!response.ok) {
            error.value = new Error(`SSE 连接失败：${response.status}`)
            isGenerating.value = false
            return
          }
        },

        onmessage(event) {
          console.log(`[${new Date().toLocaleTimeString()}] 收到 chunk，长度：${event.data.length}`)
          // 正常追加 ai 输出
          try {
            const parsed = JSON.parse(event.data)
            aiResponse.value += parsed.d || parsed.data || parsed.content || ''
            requestAnimationFrame(() => {})
          } catch {
            aiResponse.value += event.data
          }
        },

        onclose() {
          isGenerating.value = false
        },

        onerror(err) {
          isGenerating.value = false
          error.value = err
        },
      })
    } catch (e) {
      isGenerating.value = false
      error.value = e as Error
    }
  }

  return { aiResponse, isGenerating, error, fetchSSE }
}
