/** API base URL — single source of truth */
export const API_BASE = 'http://localhost:58080/api'

/** 已部署应用的访问地址（由后端 deployments 控制器提供静态资源） */
export function deployUrlOf(deployKey: string): string {
  return `${API_BASE}/deployments/${deployKey}/`
}
