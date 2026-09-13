import { ref, onBeforeUnmount, watch, type Ref } from 'vue'

/** 单元格宽度上限单位：em，`1em` = 当前表格字号 */
export const NAME_BOX_MAX_EM = 10

/** 单元格引用键：列标识 + 记录 id（同一张表可能有多列都要截断） */
const cellKey = (field: string, id: string | number | undefined) =>
  id === undefined ? '' : `${field}:${id}`

/**
 * 表格「固定宽度 + 超出才渐隐」的通用逻辑。
 *
 * 背景：直接给文字元素挂 mask 渐变是不行的 —— 渐变位置按元素自身宽度算，
 * 短文本的元素很窄，渐变会糊到整条文字上（早期 `sksa` / `df41测试…` 就是这个问题）。
 * 所以拆成两层：
 *   1. 外层盒子固定宽度（10em）+ overflow:hidden，负责裁切；
 *   2. 内层文字 inline-block + max-width:none，按自身宽度溢出；
 *   3. 只有当「文字自然宽度 > 盒子宽度」时，才给盒子挂 `--overflow` 类加渐隐遮罩。
 *
 * 判定用像素而不是字符数：文字 span 的 scrollWidth 就是它的自然宽度，
 * 父级 overflow:hidden 只裁切绘制、不会压缩 scrollWidth。
 *
 * 一张表可以截断多列：一个 useNameTruncation 实例内部按 `列 + id` 分别记录，
 * 调用 `setCellRef(field, id, el)` 与 `isOverflowing(field, id)` 即可。
 *
 * @param containerRef 测量容器。两种形态都支持：
 *   - a-table 组件实例（自动取其 `$el`）
 *   - 普通 HTMLElement（页面里没有表格时，例如应用编辑页 header 的 .app-info-main）
 *
 * 为什么用 watch 而不是 onMounted：容器可能**挂载后才出现**。
 * `:ref` 是惰性的，首帧渲染前 ref 仍是 null；页面数据也是异步拉的。
 * 只观察「ref 从 null 变成元素」这一次就够覆盖这些情况，之后交给 ResizeObserver。
 */
export function useNameTruncation(
  containerRef: Ref<{ $el?: HTMLElement } | HTMLElement | null>,
) {
  // 盒子宽度放在内联样式里，保证「10em」这个口径的唯一来源
  const boxStyle = { width: `${NAME_BOX_MAX_EM}em` }

  // 当前有溢出（需要渐隐）的单元格键集合
  const overflowKeys = ref<Set<string>>(new Set())

  // 单元格引用：`field:id` -> 元素
  const cells = new Map<string, HTMLElement>()

  const setCellRef = (field: string, id: string | number | undefined, el: unknown) => {
    const key = cellKey(field, id)
    if (!key) return
    if (el instanceof HTMLElement) cells.set(key, el)
    else cells.delete(key)
  }

  /** 该单元格是否需要渐隐 */
  const isOverflowing = (field: string, id: string | number | undefined) =>
    overflowKeys.value.has(cellKey(field, id))

  const measure = () => {
    const next = new Set<string>()
    cells.forEach((el, key) => {
      const textEl = el.firstElementChild
      if (textEl && textEl.scrollWidth > el.clientWidth) next.add(key)
    })
    // 集合内容不变时不触发更新，避免无谓的重渲染
    const same =
      next.size === overflowKeys.value.size &&
      [...next].every((key) => overflowKeys.value.has(key))
    if (!same) overflowKeys.value = next
  }

  // 列宽变化（窗口缩放 / 分页换数据 / 侧栏折叠）都要重新量
  let observer: ResizeObserver | undefined
  let raf = 0

  const scheduleMeasure = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(measure)
  }

  const resolveEl = (target: { $el?: HTMLElement } | HTMLElement | null): HTMLElement | null => {
    if (!target) return null
    // 组件实例取 $el，普通元素直接用
    return target instanceof HTMLElement ? target : (target.$el ?? null)
  }

  watch(
    containerRef,
    (target) => {
      observer?.disconnect()
      observer = undefined
      // ref 就绪时先量一次：数据刚回来那一帧还没有 ResizeObserver 回调
      scheduleMeasure()
      const rootEl = resolveEl(target)
      if (rootEl && typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(scheduleMeasure)
        observer.observe(rootEl)
      }
    },
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(() => {
    observer?.disconnect()
    cancelAnimationFrame(raf)
  })

  return { boxStyle, isOverflowing, setCellRef, scheduleMeasure }
}
