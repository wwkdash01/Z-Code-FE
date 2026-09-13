import type { Component } from 'vue'
import { themeColors, type TagMeta } from './theme'
import {
  ToolOutlined,
  CreditCardOutlined,
  ProfileOutlined,
} from '@ant-design/icons-vue'

/**
 * 应用标签（appTag）展示配置 —— 单一数据源。
 *
 * 任何需要展示标签的地方（首页卡片、应用编辑页详情卡、后台管理表格/弹窗）
 * 都应从这里取值，避免各处各写一份 color / label 导致风格漂移。
 */

/** 标签枚举值 */
export type AppTag = NonNullable<API.App['appTag']>

/**
 * 标签展示元信息：中文名 + 配色 + 图标。
 *
 * 配色不走 antd 预设色名，而是给「面 / 描边 / 字」三件套；
 * 色值一律从 themeColors（src/config/theme.ts）取，不在这里写字面量——
 * 否则换肤时标签会留在旧色上，且不容易发现：
 *   - 工具   → 品牌陶土（主色系：active / soft / border）
 *   - 网页   → 暖中性灰（不抢焦点）
 *   - 个人主页 → 琥珀金（唯一保留的第三种强调色，用于区分）
 * 之所以弃用预设色名：antd 的 red / blue / yellow 是冷色高饱和色板，
 * 摆在 #FAF9F6 暖底 + #DA7757 陶土主色旁边会互相打架（实测对比后定案）。
 */
export const APP_TAG_META: Record<AppTag, TagMeta & { icon: Component }> = {
  tool: {
    label: '工具',
    icon: ToolOutlined,
    color: themeColors.primaryActive,
    background: themeColors.primarySoft,
    borderColor: themeColors.primaryBorder,
  },
  webPage: {
    label: '网页',
    icon: CreditCardOutlined,
    color: themeColors.neutralWarm,
    background: themeColors.surfaceSubtle,
    borderColor: themeColors.border,
  },
  profile: {
    label: '个人主页',
    icon: ProfileOutlined,
    color: themeColors.accentAmber,
    background: themeColors.accentAmberSoft,
    borderColor: themeColors.accentAmberBorder,
  },
}

/** 标签下拉框选项（搜索栏、详情弹窗共用），顺序与 APP_TAG_META 一致 */
export const APP_TAG_OPTIONS = (Object.keys(APP_TAG_META) as AppTag[]).map((value) => ({
  value,
  label: APP_TAG_META[value].label,
}))

/** 取标签展示元信息，未知 / 空标签返回 undefined */
export const getAppTagMeta = (appTag?: string) =>
  appTag && appTag in APP_TAG_META ? APP_TAG_META[appTag as AppTag] : undefined
