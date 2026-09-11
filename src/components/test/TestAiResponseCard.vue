<script setup lang="ts">
    import { computed, onMounted, ref, watch } from 'vue'
    import { useSSE } from '@/composables/useSSE';
    import { renderMarkdown } from '@/utils/markdown';

    const props = defineProps<{
        appId: number | string
        userPrompt: string
    }>()

    const { aiResponse, isGenerating, error, fetchSSE } = useSSE()

    const containerRef = ref<HTMLElement | null>(null)

    const html = computed(() => renderMarkdown(aiResponse.value))

    // 监听内容变化，自动滚动到底部
    watch(html, () => {
        setTimeout(() => {
            if (containerRef.value) {
                containerRef.value.scrollTop = containerRef.value.scrollHeight
            }
        }, 0)
    })

    function handleFetch() {
        fetchSSE(props.appId, props.userPrompt)
    }

    function handleCopy(e: Event) {
      const btn = e.target as HTMLElement
      if (!btn.classList.contains('copy-btn')) return
      const pre = btn.closest('.vscode-code-block')?.querySelector('pre')
      if (!pre) return
      navigator.clipboard.writeText(pre.textContent || '').then(() => {
        btn.textContent = 'Copied ✓'
        setTimeout(() => { btn.textContent = 'Copy' }, 1500)
      })
    }

    onMounted(() => {
      document.addEventListener('click', handleCopy)
    })
</script>

<template>

    <div class="test-ai-res">

        <a-button type="primary" @click="handleFetch" :loading="isGenerating">GO</a-button>

        <a-card class="message-card">

            <div class="md-render" ref="containerRef" v-html="html || 'reasoning...'"></div>

        </a-card>

    </div>

</template>

<style scoped>

/* ========== 第 1 层：外层容器 ========== */
.test-ai-res {
    flex: 1;
    width: 100%;              /* 宽度占满父容器（left-panel）的 100% */
}

.message-card :deep(.ant-card-body) {
    padding: 0;
}

/* ========== Markdown 渲染样式 ========== */
.md-render {
    padding-left: 10px;
    padding-right: 5px;
    font-size: 14px;
    line-height: 1.6;
    color: rgba(0, 0, 0, 0.88);
    word-break: break-word;
    overflow-wrap: break-word;
}

.md-render :deep(h1) {
    font-size: 1.5rem;
    margin: 0.5rem 0;
}

.md-render :deep(h2) {
    font-size: 1.25rem;
    margin: 0.5rem 0;
}

.md-render :deep(h3) {
    font-size: 1.1rem;
    margin: 0.5rem 0;
}

.md-render :deep(p) {
    margin: 0.5rem 0;
}

.md-render :deep(ul),
.md-render :deep(ol) {
    padding-left: 1.5rem;
    margin: 0.5rem 0;
}

.md-render :deep(li) {
    margin: 0.25rem 0;
}

.md-render :deep(a) {
    color: #0969da;
    text-decoration: none;
}

.md-render :deep(a:hover) {
    text-decoration: underline;
}

.md-render :deep(.vscode-code-block) {
    margin: 1rem 0;
    position: relative;
    background: #1e1e1e;
    border-radius: 8px;
    overflow: hidden;
    display: block;
}

.md-render :deep(.vscode-header) {
    background: #2d2d2d;
    color: #999;
    padding: 4px 14px;
    font-size: 12px;
    user-select: none;
}

.md-render :deep(.vscode-code-block pre) {
    max-height: 320px;
    overflow: auto !important;
    margin: 0;
    padding: 12px 16px;
    scrollbar-width: thin;
    scrollbar-color: #555 #1e1e1e;
}

.md-render :deep(.vscode-code-block code) {
    font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace;
    font-size: 13px;
    white-space: pre;
    color: #d4d4d4;
}

.md-render :deep(.copy-btn) {
    position: absolute;
    top: 8px;
    right: 12px;
    background: #3c3c3c;
    color: #ccc;
    border: none;
    padding: 3px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s;
}

.md-render :deep(.vscode-code-block:hover .copy-btn) {
    opacity: 1;
}

.md-render :deep(.copy-btn:hover) {
    background: #505050;
    color: #fff;
}

</style>
