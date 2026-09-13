import { themeColors, type TagMeta } from './theme'

/**
 * 用户角色（userRole）展示配置 —— 单一数据源。
 *
 * 表格 tag、弹窗下拉、以及任何需要展示角色的地方都从这里取值，
 * 避免各页面各写一份 label / color 导致风格漂移。
 */

/** 角色枚举值 */
export type UserRole = 'user' | 'admin'

/** 角色展示元信息：中文名 + 配色（配色跟随后端返回的枚举字符串）。
 *  与 src/config/appTag.ts 同一套暖色调色板，且同样从 themeColors 取值
 *  （不写字面量，否则换肤时角色标签不会跟随）：
 *  管理员用品牌陶土（强调），普通用户用暖中性灰（不抢焦点）。 */
export const USER_ROLE_META: Record<UserRole, TagMeta> = {
  user: {
    label: '用户',
    color: themeColors.neutralWarm,
    background: themeColors.surfaceSubtle,
    borderColor: themeColors.border,
  },
  admin: {
    label: '管理员',
    color: themeColors.primaryActive,
    background: themeColors.primarySoft,
    borderColor: themeColors.primaryBorder,
  },
}

/** 角色下拉选项（详情/修改弹窗使用），顺序与 USER_ROLE_META 一致 */
export const USER_ROLE_OPTIONS = (
  Object.keys(USER_ROLE_META) as UserRole[]
).map((value) => ({
  value,
  label: USER_ROLE_META[value].label,
}))

/** 取角色展示元信息，未知 / 空角色返回 undefined */
export const getUserRoleMeta = (userRole?: string) =>
  userRole && userRole in USER_ROLE_META ? USER_ROLE_META[userRole as UserRole] : undefined
