// @ts-ignore
/* eslint-disable */
import request from '@/request'

/** 此处后端没有提供注释 GET /health */
export async function getHealthStatus(options?: { [key: string]: any }) {
  return request<API.BaseResponsegetHealthStatus>('/health', {
    method: 'GET',
    ...(options || {}),
  })
}
