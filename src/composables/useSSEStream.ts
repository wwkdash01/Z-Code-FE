/**
 * SSE 流式请求工具
 * 复用 @composables/useSSETest.ts 的解析逻辑
 */

export async function fetchStream(
  url: string,
  onChunk: (data: string) => void,
): Promise<void> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'text/event-stream' },
  })

  if (!response.ok) {
    throw new Error(`SSE 连接失败：${response.status}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    buffer += chunk

    // 先处理完整行，收集所有 data 回调
    const lines: string[] = []
    let newlineIdx: number
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim()
      buffer = buffer.slice(newlineIdx + 1)

      if (!line || line.startsWith(':') || line.startsWith('id:') || line.startsWith('event:') || line.startsWith('retry:')) continue

      if (line.startsWith('data:')) {
        const data = line.slice(5)
        try {
          const parsed = JSON.parse(data)
          lines.push(parsed.d || parsed.data || parsed.content || '')
        } catch {
          lines.push(data)
        }
      }
    }

    // 逐个触发回调，让浏览器有机会重绘
    for (const d of lines) {
      console.log(`[useSSEStream] data: "${d.substring(0, 50)}" (${d.length} chars)`)
      onChunk(d)
      // 微任务暂停，给渲染让路
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
  }
}
