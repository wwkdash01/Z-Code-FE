export interface NavItem {
  key: string
  label: string
  /** 路由地址；有 children 时可不填 */
  path?: string
  children?: NavItem[]
}

export const navItems: NavItem[] = [
  { key: 'home', label: '首页', path: '/' },
  { key: 'about', label: '关于', path: '/about' },
  { key: 'user-manager', label: '用户管理', path: '/admin/user-manager'}
]

