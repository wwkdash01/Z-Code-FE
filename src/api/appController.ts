// @ts-ignore
/* eslint-disable */
import request from '@/request'

/** 此处后端没有提供注释 GET /apps/admin/${param0} */
export async function getAppByAdmin(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getAppByAdminParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params
  return request<API.BaseResponseApp>(`/apps/admin/${param0}`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 PUT /apps/admin/${param0} */
export async function updateAppByAdmin(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.updateAppByAdminParams,
  body: API.AppAdminUpdateRequestDTO,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params
  return request<API.BaseResponseupdateAppByAdmin>(`/apps/admin/${param0}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    params: { ...queryParams },
    data: body,
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 DELETE /apps/admin/${param0} */
export async function removeAppByAdmin(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.removeAppByAdminParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params
  return request<API.BaseResponseremoveAppByAdmin>(`/apps/admin/${param0}`, {
    method: 'DELETE',
    params: { ...queryParams },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 GET /apps/admin/page */
export async function getAppByAdminPage(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getAppByAdminPageParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponsePageApp>('/apps/admin/page', {
    method: 'GET',
    params: {
      ...params,
      appAdminQueryRequestDTO: undefined,
      ...params['appAdminQueryRequestDTO'],
    },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 GET /apps/guest/page/featured */
export async function getFeaturedAppByPage(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getFeaturedAppByPageParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponsePageAppVO>('/apps/guest/page/featured', {
    method: 'GET',
    params: {
      ...params,
      appQueryRequestDTO: undefined,
      ...params['appQueryRequestDTO'],
    },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 POST /apps/user */
export async function saveApp(body: API.AppAddRequestDTO, options?: { [key: string]: any }) {
  return request<API.BaseResponsesaveApp>('/apps/user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 GET /apps/user/${param0} */
export async function getAppById(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getAppByIdParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params
  return request<API.BaseResponseAppVO>(`/apps/user/${param0}`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 PUT /apps/user/${param0} */
export async function updateAppById(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.updateAppByIdParams,
  body: API.AppUpdateRequestDTO,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params
  return request<API.BaseResponseupdateAppById>(`/apps/user/${param0}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    params: { ...queryParams },
    data: body,
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 DELETE /apps/user/${param0} */
export async function removeAppById(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.removeAppByIdParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params
  return request<API.BaseResponseremoveAppById>(`/apps/user/${param0}`, {
    method: 'DELETE',
    params: { ...queryParams },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 GET /apps/user/code-stream */
export async function getCodeGenStream(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getCodeGenStreamParams,
  options?: { [key: string]: any }
) {
  return request<API.ServerSentEventString[]>('/apps/user/code-stream', {
    method: 'GET',
    params: {
      ...params,
      appCodeStreamQueryDTO: undefined,
      ...params['appCodeStreamQueryDTO'],
    },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 POST /apps/user/deployment */
export async function deployApp(body: API.AppDeployRequestDTO, options?: { [key: string]: any }) {
  return request<API.BaseResponsedeployApp>('/apps/user/deployment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 GET /apps/user/page/my-apps */
export async function getMyAppByPage(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getMyAppByPageParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponsePageAppVO>('/apps/user/page/my-apps', {
    method: 'GET',
    params: {
      ...params,
      appQueryRequestDTO: undefined,
      ...params['appQueryRequestDTO'],
    },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 GET /apps/user/preview/${param0} */
export async function previewApp(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.previewAppParams,
  options?: { [key: string]: any }
) {
  const { appId: param0, ...queryParams } = params
  return request<API.BaseResponsepreviewApp>(`/apps/user/preview/${param0}`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  })
}
