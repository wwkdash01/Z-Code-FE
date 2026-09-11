// @ts-ignore
/* eslint-disable */
import request from "@/request";

/** 此处后端没有提供注释 DELETE /chatHistories/admin/${param0} */
export async function removeChatHistoryByAdmin(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.removeChatHistoryByAdminParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponseremoveChatHistoryByAdmin>(
    `/chatHistories/admin/${param0}`,
    {
      method: "DELETE",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 此处后端没有提供注释 GET /chatHistories/admin/page */
export async function getChatHistoryByAdminPage(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getChatHistoryByAdminPageParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponsePageChatHistory>("/chatHistories/admin/page", {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /chatHistories/user */
export async function addChatHistory(
  body: API.ChatHistoryAddRequestDTO,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseaddChatHistory>("/chatHistories/user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 GET /chatHistories/user/${param0} */
export async function getChatHistoryById(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getChatHistoryByIdParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.BaseResponseChatHistoryVO>(
    `/chatHistories/user/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 此处后端没有提供注释 GET /chatHistories/user/cursor */
export async function queryChatHistoryByCursor(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.queryChatHistoryByCursorParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseChatHistoryUserCursorPageVO>(
    "/chatHistories/user/cursor",
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}
