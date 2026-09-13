#!/usr/bin/env node
/* ==========================================================================
   设计令牌一致性校验 —— npm run check:tokens

   为什么需要它：
   全站色值有两个定义处，靠人工同步，容易漏：

     src/config/theme.ts    themeColors  → 给 antd（JS 对象）用
     src/styles/tokens.css  :root        → 给自有 CSS（var(--color-*)）用

   antd 的主题系统读不了 CSS 变量，自有 CSS 也读不了 JS 对象，所以只能定义两次。
   本脚本把「记得同步」变成「机器保证」，检查 5 件事：

     1. themeColors 每一项，在 tokens.css 都能找到 --color-<kebab> 且等值
     2. tokens.css 里 theme.ts 没有的变量 —— 只提示不报错（CSS 专属令牌，属预期）
     3. 派生色 --color-primary-rgb 与 --color-primary 一致
     4. antdTheme 里不许出现字面色值（必须取自 themeColors）
     5. 组件里不许把调色板色值写成字面量（换肤会漏改，最隐蔽的一类）

   第 5 条只针对「调色板里已有的颜色」，语义白 / 黑（反白文字、蒙版、阴影）
   不在其列 —— 它们本来就不参与换肤。

   退出码非 0 = 有错误。
   ========================================================================== */

import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const THEME_TS = join(ROOT, 'src/config/theme.ts')
const TOKENS_CSS = join(ROOT, 'src/styles/tokens.css')
const SCAN_DIR = join(ROOT, 'src')

/** 语义白 / 黑：反白文字与阴影用，不参与换肤，故排除在泄漏扫描之外 */
const SEMANTIC = new Set(['#ffffff', '#000000'])

/** 扫描时跳过的文件（它们就是定义处本身） */
const SKIP_FILES = new Set([THEME_TS, TOKENS_CSS])

/** 扫描的扩展名 */
const SCAN_EXT = new Set(['.vue', '.css', '.ts', '.scss', '.less'])

const errors = []
const notes = []

// ---------------------------------------------------------------- 归一化

/** #abc → #aabbcc；大小写统一。非 hex 返回 null */
function normHex(value) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())
  if (!m) return null
  const h = m[1].toLowerCase()
  return '#' + (h.length === 3 ? [...h].map((c) => c + c).join('') : h)
}

/** rgba(20, 20, 19, 0.88) → rgba(20,20,19,0.88)；其余仅压空白并小写 */
function normalize(value) {
  const t = value.trim()
  const hex = normHex(t)
  if (hex) return hex
  const m = /^rgba?\(([^)]+)\)$/i.exec(t)
  if (m) {
    const parts = m[1].split(',').map((p) => p.trim())
    const rgb = parts.slice(0, 3).map(Number)
    const alpha = parts[3] === undefined ? 1 : Number(parts[3])
    return `rgba(${rgb.join(',')},${alpha})`
  }
  return t.replace(/\s+/g, ' ').toLowerCase()
}

/** themeColors 键名 → tokens.css 变量名：pageBg → --color-page-bg */
const toVarName = (key) => '--color-' + key.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase())

/** #da7757 → "218,119,87" */
function hexToRgbParts(hex) {
  const h = normHex(hex)
  if (!h) return null
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',')
}

// ---------------------------------------------------------------- 读取定义

const jiti = createJiti(import.meta.url)
const { themeColors, antdTheme } = await jiti.import(THEME_TS)
const cssText = readFileSync(TOKENS_CSS, 'utf8')

/** 解析 tokens.css 的 :root 块 */
const cssVars = new Map()
{
  const rootBlock = /:root\s*\{([\s\S]*?)\n\}/.exec(cssText)
  if (!rootBlock) {
    console.error('✗ 无法从 tokens.css 解析出 :root 块')
    process.exit(1)
  }
  for (const m of rootBlock[1].matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)) {
    cssVars.set(m[1], m[2].trim())
  }
}

// ------------------------------------------------- 检查 1 / 2：镜像一致性

let mirrored = 0
for (const [key, value] of Object.entries(themeColors)) {
  const varName = toVarName(key)
  if (!cssVars.has(varName)) {
    errors.push(
      `theme.ts 的 themeColors.${key} 在 tokens.css 里没有对应变量 ${varName}\n` +
        `      → 该色值只对 antd 生效，自有 CSS 拿不到，会出现「半换肤」`,
    )
    continue
  }
  const cssValue = cssVars.get(varName)
  if (normalize(cssValue) !== normalize(value)) {
    errors.push(
      `theme.ts ↔ tokens.css 取值不一致：${key}\n` +
        `      theme.ts    ${varName} = ${value}\n` +
        `      tokens.css  ${varName} = ${cssValue}`,
    )
    continue
  }
  mirrored++
}

const themeVars = new Set(Object.keys(themeColors).map(toVarName))
const cssOnly = [...cssVars.keys()].filter((v) => !themeVars.has(v))
if (cssOnly.length) {
  notes.push(`CSS 专属令牌（theme.ts 无对应项，属预期）：\n${cssOnly.map((v) => '      ' + v).join('\n')}`)
}

// ------------------------------------------------- 检查 3：派生色一致性

const primaryVar = cssVars.get('--color-primary')
const primaryRgbVar = cssVars.get('--color-primary-rgb')
let derivedOk = false
if (!primaryVar || !primaryRgbVar) {
  errors.push('tokens.css 缺少 --color-primary 或 --color-primary-rgb')
} else {
  const expected = hexToRgbParts(primaryVar)
  const actual = primaryRgbVar.replace(/\s+/g, '')
  if (!expected) {
    errors.push(`--color-primary 不是可解析的 hex：${primaryVar}`)
  } else if (expected !== actual) {
    errors.push(
      `派生色与主色失配（改主色时这里最容易漏）：\n` +
        `      --color-primary     = ${primaryVar}  → 期望 RGB ${expected}\n` +
        `      --color-primary-rgb = ${primaryRgbVar}  ← 实际`,
    )
  } else {
    derivedOk = true
  }
}

// ------------------------------------------------- 检查 4：antdTheme 无字面量

const paletteValues = new Set()
for (const v of Object.values(themeColors)) paletteValues.add(normalize(v))
for (const v of cssVars.values()) {
  const h = normHex(v)
  if (h) paletteValues.add(h)
}

const looksLikeColor = (v) =>
  typeof v === 'string' &&
  (/^#([0-9a-f]{3,8})$/i.test(v.trim()) || /^(rgb|rgba|hsl|hsla)\(/i.test(v.trim()))

let antdColorTokens = 0
for (const [key, value] of Object.entries(antdTheme.token ?? {})) {
  if (!looksLikeColor(value)) continue
  antdColorTokens++
  if (!paletteValues.has(normalize(value))) {
    errors.push(
      `antdTheme.token.${key} 用了字面色值 ${value}\n` +
        `      → 请先在 themeColors 里定义，再从这里引用（否则它不参与换肤）`,
    )
  }
}

// ------------------------------------------------- 检查 5：硬编码泄漏扫描

/** 去掉注释，避免把「文档里提到的旧色值」误判成泄漏 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .split('\n')
    .map((line) => (/^\s*\/\//.test(line) ? '' : line))
    .join('\n')
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      out.push(...walk(full))
    } else if (SCAN_EXT.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      out.push(full)
    }
  }
  return out
}

// 泄漏 = 写了某个「调色板里已有的颜色」，而不是任意硬编码色（语义白黑除外）
const leakTargets = new Set([...paletteValues].filter((v) => !SEMANTIC.has(v)))
const leaks = []
let scanned = 0

for (const file of walk(SCAN_DIR)) {
  if (SKIP_FILES.has(file)) continue
  scanned++
  const text = stripComments(readFileSync(file, 'utf8'))
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const hex = normHex(m[0])
      if (hex && leakTargets.has(hex)) {
        const varHint = [...cssVars.entries()].find(([, v]) => normHex(v) === hex)?.[0]
        leaks.push(
          `${relative(ROOT, file)}:${i + 1}  写死了 ${m[0]}` +
            (varHint ? `  ← 应该用 var(${varHint})` : ''),
        )
      }
    }
  })
}

if (leaks.length) {
  errors.push(`发现 ${leaks.length} 处硬编码调色板色值：\n${leaks.map((l) => '      ' + l).join('\n')}`)
}

// ---------------------------------------------------------------- 输出

const check = (ok, label, detail) => `${ok ? '✓' : '✗'} ${label.padEnd(14)} ${detail}`

console.log('\n设计令牌校验（scripts/check-tokens.mjs）\n')
console.log(check(true, '镜像一致', `themeColors ${mirrored}/${Object.keys(themeColors).length} 项与 tokens.css 逐项等值`))
console.log(check(derivedOk, '派生色', derivedOk ? `--color-primary-rgb 与 ${primaryVar} 一致` : '见下方错误'))
console.log(check(!errors.some((e) => e.includes('antdTheme.token')), 'antdTheme', `${antdColorTokens} 个颜色 token 检查完毕`))
console.log(check(leaks.length === 0, '硬编码扫描', `扫描 ${scanned} 个文件，${leaks.length} 处泄漏`))

if (notes.length) {
  console.log()
  for (const n of notes) console.log(`· ${n}`)
}

if (errors.length) {
  console.log(`\n✗ 发现 ${errors.length} 个问题：\n`)
  errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
  console.log()
  process.exit(1)
}

console.log('\n全部通过。\n')
