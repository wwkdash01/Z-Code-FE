<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { useDraggable, useEventListener, useStorage } from '@vueuse/core'
import { AppstoreOutlined, SettingOutlined, TeamOutlined } from '@ant-design/icons-vue'
import annoLogo from '@/assets/anno.png'
import { adminNavItems } from '@/config/menu'
import { useLoginUserStore } from '@/stores/loginUser'

/**
 * 管理员悬浮球。
 *
 * 全局挂载在 App.vue（不在 BasicLayout 里）：这样 meta.blank 的全屏页
 * （如 /app/app-edit）也照样有这个入口，且路由切换时组件不卸载 —— 拖动监听、
 * 面板状态、位置都不受影响。
 *
 * 为什么是自研外壳 + useDraggable 而不是现成组件（vant FloatingBubble、
 * levitated-sphere、vue-float-menu 都实际扒过源码）：Vant 的 FloatingBubble 只绑
 * touch 事件（onTouchstartPassive/onTouchend + useEventListener('touchmove')），
 * 桌面鼠标拖不动；levitated-sphere 用 document.onmousemove 做 DOM0 全局赋值、
 * 触摸端还不区分点击；vue-float-menu 的菜单不能换成 antd popover 且自带
 * z-index:9999。@vueuse/core 已在依赖里，当"拖动引擎"最划算。
 */

/** 球直径（px）：改这里要同步 .admin-fab 的 width/height */
const BALL_SIZE = 56
/** 距视口边缘的最小留白 */
const MARGIN = 12
/** 位移超过该像素数才算拖动（useDraggable 的 isDragging 在 pointerdown 就为 true，不能用来区分点击） */
const DRAG_THRESHOLD = 4
/** 位置持久化 key（沿用 src/utils/auth.ts 的 `_` 前缀约定） */
const POSITION_KEY = '_admin_fab_position'

const loginUserStore = useLoginUserStore()
const router = useRouter()

const ballRef = ref<HTMLElement | null>(null)
const panelOpen = ref(false)
/** 本次按下是否已经变成拖动：用于吞掉拖动收尾那一次 click */
const dragMoved = ref(false)

/** 菜单项 key → 图标 */
const ITEM_ICONS: Record<string, Component> = {
  'user-manager': TeamOutlined,
  'app-manager': AppstoreOutlined,
}

/** 视口内约束 + 取整：整数像素，避免球落在亚像素上 */
function clampPosition(pos: { x: number; y: number }) {
  const maxX = Math.max(MARGIN, window.innerWidth - BALL_SIZE - MARGIN)
  const maxY = Math.max(MARGIN, window.innerHeight - BALL_SIZE - MARGIN)
  return {
    x: Math.round(Math.min(Math.max(MARGIN, pos.x), maxX)),
    y: Math.round(Math.min(Math.max(MARGIN, pos.y), maxY)),
  }
}

/** 默认位置：右侧偏下（避开 GlobalFooter 与全屏页底部可能出现的操作区） */
function defaultPosition() {
  return clampPosition({
    x: window.innerWidth - BALL_SIZE - MARGIN,
    y: window.innerHeight * 0.62,
  })
}

/**
 * 位置持久化。
 *
 * 注意 useDraggable 的 initialValue 只在 setup 时读一次
 * （源码是 `ref(toValue(initialValue) ?? {x:0,y:0})`，没有 watch），所以恢复位置
 * 必须在这里同步喂进去，否则首帧会先闪一下默认位。
 */
const savedPosition = useStorage<{ x: number; y: number } | null>(POSITION_KEY, null)

/** 拖动结束吸附到最近的左右边缘 */
function snapToEdge(pos: { x: number; y: number }) {
  const onLeftHalf = pos.x + BALL_SIZE / 2 < window.innerWidth / 2
  return clampPosition({
    x: onLeftHalf ? MARGIN : window.innerWidth - BALL_SIZE - MARGIN,
    y: pos.y,
  })
}

let pointerStart = { x: 0, y: 0 }

const { position, isDragging, style } = useDraggable(ballRef, {
  initialValue: savedPosition.value ? clampPosition(savedPosition.value) : defaultPosition(),
  onStart: (_pos, event) => {
    pointerStart = { x: event.clientX, y: event.clientY }
    dragMoved.value = false
  },
  onMove: (pos, event) => {
    if (!dragMoved.value) {
      const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y)
      if (moved > DRAG_THRESHOLD) {
        dragMoved.value = true
        // 真开始拖才收面板：antd 的 Align 只在 target 变化时 forceAlign()，
        // 用 left/top 移动锚点不会触发重新对齐，面板会跟球分家
        // （见 plan/popover-anchor-geometry-fix.md）
        panelOpen.value = false
      }
    }
    position.value = clampPosition(pos)
  },
  onEnd: () => {
    if (!dragMoved.value) return
    // 此刻 useDraggable 已清空 pressedDelta → isDragging 为 false → 吸附动画可以播
    position.value = snapToEdge(position.value)
    savedPosition.value = { ...position.value }
    // 拖动若在球上收尾会补发一次 click，交给 handleOpenChange 吃掉；下一轮再复位，
    // 避免拖动在球外结束时 dragMoved 一直是 true 把后续正常点击也吞掉
    window.setTimeout(() => {
      dragMoved.value = false
    }, 0)
  },
})

/** popover 受控开关：拖动收尾的那一次 click 直接丢弃 */
function handleOpenChange(next: boolean) {
  if (dragMoved.value) {
    dragMoved.value = false
    return
  }
  panelOpen.value = next
}

/** 面板往球的哪一侧弹：球在右半屏就往左，避免贴边溢出 */
const placement = computed(() =>
  position.value.x + BALL_SIZE / 2 > window.innerWidth / 2 ? 'leftTop' : 'rightTop',
)

function togglePanel() {
  panelOpen.value = !panelOpen.value
}

function goTo(path?: string) {
  if (!path) return
  panelOpen.value = false
  if (router.currentRoute.value.path !== path) {
    router.push(path)
  }
}

// 窗口尺寸变化后重新约束，避免球跑到视口外
useEventListener(window, 'resize', () => {
  position.value = clampPosition(position.value)
  savedPosition.value = { ...position.value }
})

// antd 4.2.6 的 vc-trigger 没有任何 ESC/keyboard 处理，关闭键得自己接
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') panelOpen.value = false
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="loginUserStore.isAdmin"
      ref="ballRef"
      class="admin-fab"
      :class="{ 'admin-fab--dragging': isDragging }"
      :style="style"
    >
      <a-popover
        :open="panelOpen"
        trigger="click"
        :placement="placement"
        :overlay-inner-style="{ padding: '6px' }"
        @update:open="handleOpenChange"
      >
        <template #content>
          <div class="admin-fab__panel">
            <button
              v-for="item in adminNavItems"
              :key="item.key"
              type="button"
              class="admin-fab__item"
              @click="goTo(item.path)"
            >
              <component :is="ITEM_ICONS[item.key] ?? SettingOutlined" class="admin-fab__item-icon" />
              {{ item.label }}
            </button>
          </div>
        </template>

        <!--
          锚点层：几何恒定（宽度/高度固定，不做任何缩放），弹层的触发元素是这一层。
          按下回弹的 scale 放在内层按钮上 —— 否则触发器 rect 变化会让 antd 重新对齐，
          复现 plan/popover-anchor-geometry-fix.md 里那个 1px 跳变。
        -->
        <span class="admin-fab__anchor">
          <button
            type="button"
            class="admin-fab__ball"
            aria-label="管理员功能"
            :aria-expanded="panelOpen"
            :style="{ backgroundImage: `url(${annoLogo})` }"
            @keydown.enter.prevent="togglePanel"
            @keydown.space.prevent="togglePanel"
          >
            <SettingOutlined class="admin-fab__glyph" />
          </button>
        </span>
      </a-popover>
    </div>
  </Teleport>
</template>

<style scoped>
.admin-fab {
  position: fixed;
  /* 高于全站内容（Header 100、卡片 ≤10），低于 antd 弹层族（zIndexPopupBase 1000），
     所以压得住页面内容，又不会盖住 Modal/message */
  z-index: 900;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  cursor: grab;
  user-select: none;
  /* 触摸拖动时不要连带滚动页面（useDraggable 是 passive 监听，拦不住默认滚动） */
  touch-action: none;
  /* 只给吸附/复位用；拖动中必须关掉，否则球会滞后于指针 */
  transition: left 0.18s ease, top 0.18s ease;
}

.admin-fab--dragging {
  transition: none;
  cursor: grabbing;
}

.admin-fab__anchor {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.admin-fab__ball {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 50%;
  background-color: var(--color-surface);
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  cursor: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.admin-fab__ball:active {
  transform: scale(0.94);
}

.admin-fab__ball:hover {
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.08), 0 4px 6px rgba(0, 0, 0, 0.05);
}

/* hover 蒙版：和 header 头像蒙版同一观感，同时给白色齿轮一个能看清的底 */
.admin-fab__ball::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0);
  transition: background 0.15s ease;
}

.admin-fab__ball:hover::after,
.admin-fab__ball:focus-visible::after {
  background: rgba(0, 0, 0, 0.32);
}

.admin-fab__glyph {
  position: relative;
  z-index: 1;
  font-size: 20px;
  color: #fff;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.admin-fab__ball:hover .admin-fab__glyph,
.admin-fab__ball:focus-visible .admin-fab__glyph {
  opacity: 1;
}

.admin-fab__panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 128px;
}

.admin-fab__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.admin-fab__item:hover {
  background: var(--color-surface-subtle);
}

.admin-fab__item-icon {
  font-size: 15px;
  color: var(--color-text-tertiary);
}
</style>
