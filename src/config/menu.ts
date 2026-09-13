export interface NavItem {
  key: string
  label: string
  /** 路由地址；有 children 时可不填 */
  path?: string
  children?: NavItem[]
}

/** 对所有人可见的导航项（由 GlobalHeader 消费） */
export const navItems: NavItem[] = [
  { key: 'home', label: '首页', path: '/' },
  { key: 'about', label: '关于', path: '/about' },
]

/**
 * 仅管理员可见的入口（由 AdminFloatingBall 消费）。
 *
 * 刻意与 navItems 分开：管理入口的可见性由登录用户角色决定，不该再由 Header
 * 过滤一遍 —— 这样 Header 完全不知道 admin 的存在，新增管理页也只改这一处。
 */
export const adminNavItems: NavItem[] = [
  { key: 'user-manager', label: '用户管理', path: '/admin/user-manager' },
  { key: 'app-manager', label: '应用管理', path: '/admin/app-manager' },
]

