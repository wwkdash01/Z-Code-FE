import { marked } from 'marked'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    code({ text, lang }) {
      const escaped = escapeHtml(text)
      return `<div class="vscode-code-block">
<div class="vscode-header">${escapeHtml(lang || '')}</div>
<pre><code>${escaped}</code></pre>
<button class="copy-btn" title="复制代码">Copy</button>
</div>`
    },
    html({ text }) {
      return text
    }
  }
})

export function renderMarkdown(md: string): string {
  return (marked.parse(md) as string)
}
