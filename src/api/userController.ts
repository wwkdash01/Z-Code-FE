// @ts-ignore
/* eslint-disable */
import request from '@/request'

/** 此处后端没有提供注释 POST /users */
export async function saveUser(body: API.UserAddRequestDTO, options?: { [key: string]: any }) {
  return request<API.BaseResponsesaveUser>('/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 PUT /users/${param0} */
export async function update(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.updateParams,
  body: API.UserUpdateRequestDTO,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params
  return request<API.BaseResponseupdate>(`/users/${param0}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    params: { ...queryParams },
    data: body,
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 DELETE /users/${param0} */
export async function removeUserById(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.removeUserByIdParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params
  return request<API.BaseResponseremoveUserById>(`/users/${param0}`, {
    method: 'DELETE',
    params: { ...queryParams },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 GET /users/Info/${param0} */
export async function getInfo(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getInfoParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params
  return request<API.BaseResponseUser>(`/users/Info/${param0}`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 POST /users/login */
export async function userLogin(body: API.UserLoginRequestDTO, options?: { [key: string]: any }) {
  return request<API.BaseResponseUserVO>('/users/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 GET /users/login-status */
export async function getCurrentUser(options?: { [key: string]: any }) {
  return request<API.BaseResponseUserVO>('/users/login-status', {
    method: 'GET',
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 POST /users/logout */
export async function userLogout(options?: { [key: string]: any }) {
  return request<API.BaseResponseuserLogout>('/users/logout', {
    method: 'POST',
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 GET /users/page */
export async function getUserByPage(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getUserByPageParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponsePageUser>('/users/page', {
    method: 'GET',
    params: {
      ...params,
      userQueryRequestDTO: undefined,
      ...params['userQueryRequestDTO'],
    },
    ...(options || {}),
  })
}

/** 此处后端没有提供注释 POST /users/register */
export async function userRegister(
  body: API.UserRegisterRequestDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseuserRegister>('/users/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  })
}
