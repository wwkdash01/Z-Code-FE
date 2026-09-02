/**
 * 外部类型声明 — Long 精度保留
 *
 * src/api/typings.d.ts 是 openapi2ts 自动生成的，不能直接修改。
 * 本文件通过 Omit & 重新声明的方式，将涉及 Long 精度的 number 字段覆盖为 string。
 *
 * 使用方式：
 *   import { PreservedApp, PreservedUserVO } from '@/types/long-preserve'
 *   const app: PreservedApp = data // ← TS 认为 id/createUserId 是 string
 */

// ===== 实体类型覆盖 =====

/** App: id, createUserId → string */
export type PreservedApp = Omit<API.App, 'id' | 'createUserId'> & {
  id?: string
  createUserId?: string
}

/** AppVO: id → string */
export type PreservedAppVO = Omit<API.AppVO, 'id'> & {
  id?: string
}

/** User: id, vipId, inviteUser → string */
export type PreservedUser = Omit<API.User, 'id' | 'vipId' | 'inviteUser'> & {
  id?: string
  vipId?: string
  inviteUser?: string
}

/** UserVO: id, vipId, inviteUser → string */
export type PreservedUserVO = Omit<API.UserVO, 'id' | 'vipId' | 'inviteUser'> & {
  id?: string
  vipId?: string
  inviteUser?: string
}

// ===== Params 类型覆盖（作为请求参数时，后端接受 String 形式的 Long）=====

/** getAppByAdminParams.id → string */
export type PreservedGetAppByAdminParams = Omit<API.getAppByAdminParams, 'id'> & {
  id: string
}

/** getAppByIdParams.id → string */
export type PreservedGetAppByIdParams = Omit<API.getAppByIdParams, 'id'> & {
  id: string
}

/** updateAppByIdParams.id → string */
export type PreservedUpdateAppByIdParams = Omit<API.updateAppByIdParams, 'id'> & {
  id: string
}

/** removeAppByIdParams.id → string */
export type PreservedRemoveAppByIdParams = Omit<API.removeAppByIdParams, 'id'> & {
  id: string
}

/** updateAppByAdminParams.id → string */
export type PreservedUpdateAppByAdminParams = Omit<API.updateAppByAdminParams, 'id'> & {
  id: string
}

/** removeAppByAdminParams.id → string */
export type PreservedRemoveAppByAdminParams = Omit<API.removeAppByAdminParams, 'id'> & {
  id: string
}

/** removeUserByIdParams.id → string */
export type PreservedRemoveUserByIdParams = Omit<API.removeUserByIdParams, 'id'> & {
  id: string
}

/** getInfoParams.id → string */
export type PreservedGetInfoParams = Omit<API.getInfoParams, 'id'> & {
  id: string
}

/** previewAppParams.appId → string */
export type PreservedPreviewAppParams = Omit<API.previewAppParams, 'appId'> & {
  appId: string
}

/** updateParams.id → string */
export type PreservedUpdateParams = Omit<API.updateParams, 'id'> & {
  id: string
}

/** AppCodeStreamQueryDTO.appId → string */
export type PreservedAppCodeStreamQueryDTO = Omit<API.AppCodeStreamQueryDTO, 'appId'> & {
  appId: string
}

/** AppDeployRequestDTO.appId → string */
export type PreservedAppDeployRequestDTO = Omit<API.AppDeployRequestDTO, 'appId'> & {
  appId: string
}

// ===== Query / DTO 类型覆盖 =====

/** getAppByAdminPageParams.id → string */
export type PreservedGetAppByAdminPageParams = Omit<API.getAppByAdminPageParams, 'id'> & {
  id?: string
}

/** UserQueryRequestDTO: id, vipId → string */
export type PreservedUserQueryRequestDTO = Omit<API.UserQueryRequestDTO, 'id' | 'vipId'> & {
  id?: string
  vipId?: string
}

/** UserAddRequestDTO: vipId, inviteUser → string */
export type PreservedUserAddRequestDTO = Omit<API.UserAddRequestDTO, 'vipId' | 'inviteUser'> & {
  vipId?: string
  inviteUser?: string
}
