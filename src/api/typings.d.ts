declare namespace API {
  type App = {
    /** 应用主键ID */
    id?: string;
    appName?: string;
    cover?: string;
    appTag?: "tool" | "webPage" | "profile";
    initPrompt?: string;
    codeGenType?: "singleton" | "multifile";
    codeGenDir?: string;
    priority?: number;
    deployKey?: string;
    deployDir?: string;
    deployTime?: string;
    /** 创建者ID */
    createUserId?: string;
    editTime?: string;
    createTime?: string;
    updateTime?: string;
    isDelete?: number;
  };

  type AppAddRequestDTO = {
    appName: string;
    cover?: string;
    initPrompt: string;
    codeGenType: "singleton" | "multifile";
    appTag?: "tool" | "webPage" | "profile";
  };

  type AppAdminUpdateRequestDTO = {
    appName?: string;
    cover?: string;
    priority?: number;
    appTag?: "tool" | "webPage" | "profile";
  };

  type AppDeployRequestDTO = {
    /** 应用主键ID */
    appId: string;
  };

  type AppUpdateRequestDTO = {
    appName: string;
  };

  type AppVO = {
    /** 应用主键ID */
    id?: string;
    appName?: string;
    cover?: string;
    initPrompt?: string;
    codeGenType?: "singleton" | "multifile";
    appTag?: "tool" | "webPage" | "profile";
    createTime?: string;
    userName?: string;
    userAvatar?: string;
  };

  type BaseResponseaddChatHistory = {
    code?: number;
    message?: any;
    data?: number;
  };

  type BaseResponseApp = {
    code?: number;
    message?: any;
    data?: App;
  };

  type BaseResponseAppVO = {
    code?: number;
    message?: any;
    data?: AppVO;
  };

  type BaseResponseChatHistoryUserCursorPageVO = {
    code?: number;
    message?: any;
    data?: ChatHistoryUserCursorPageVO;
  };

  type BaseResponseChatHistoryVO = {
    code?: number;
    message?: any;
    data?: ChatHistoryVO;
  };

  type BaseResponsedeployApp = {
    code?: number;
    message?: any;
    data?: string;
  };

  type BaseResponsegetHealthStatus = {
    code?: number;
    message?: any;
    data?: string;
  };

  type BaseResponsePageApp = {
    code?: number;
    message?: any;
    data?: PageApp;
  };

  type BaseResponsePageAppVO = {
    code?: number;
    message?: any;
    data?: PageAppVO;
  };

  type BaseResponsePageChatHistory = {
    code?: number;
    message?: any;
    data?: PageChatHistory;
  };

  type BaseResponsePageUser = {
    code?: number;
    message?: any;
    data?: PageUser;
  };

  type BaseResponsepreviewApp = {
    code?: number;
    message?: any;
    data?: string;
  };

  type BaseResponseremoveAppByAdmin = {
    code?: number;
    message?: any;
    data?: boolean;
  };

  type BaseResponseremoveAppById = {
    code?: number;
    message?: any;
    data?: boolean;
  };

  type BaseResponseremoveChatHistoryByAdmin = {
    code?: number;
    message?: any;
    data?: boolean;
  };

  type BaseResponseremoveUserById = {
    code?: number;
    message?: any;
    data?: boolean;
  };

  type BaseResponsesaveApp = {
    code?: number;
    message?: any;
    data?: number;
  };

  type BaseResponsesaveUser = {
    code?: number;
    message?: any;
    data?: boolean;
  };

  type BaseResponseString = {
    code?: number;
    message?: any;
    data?: string;
  };

  type BaseResponseupdate = {
    code?: number;
    message?: any;
    data?: boolean;
  };

  type BaseResponseupdateAppByAdmin = {
    code?: number;
    message?: any;
    data?: boolean;
  };

  type BaseResponseupdateAppById = {
    code?: number;
    message?: any;
    data?: boolean;
  };

  type BaseResponseUser = {
    code?: number;
    message?: any;
    data?: User;
  };

  type BaseResponseuserLogout = {
    code?: number;
    message?: any;
    data?: boolean;
  };

  type BaseResponseuserRegister = {
    code?: number;
    message?: any;
    data?: number;
  };

  type BaseResponseUserVO = {
    code?: number;
    message?: any;
    data?: UserVO;
  };

  type ChatHistory = {
    /** 会话记录主键ID */
    id?: string;
    /** 关联应用ID */
    appId?: string;
    /** 关联用户ID */
    userId?: string;
    message?: string;
    /** 消息类型：user=用户消息，ai=AI回复 */
    messageType?: string;
    editTime?: string;
    createTime?: string;
    updateTime?: string;
    isDelete?: number;
  };

  type ChatHistoryAddRequestDTO = {
    /** 关联应用ID */
    appId: string;
    /** 消息内容 */
    message: string;
    /** 消息类型：user=用户消息，ai=AI回复 */
    messageType: string;
  };

  type ChatHistoryUserCursorPageVO = {
    /** 当前页消息列表 */
    records?: ChatHistoryVO[];
    /** 是否有更多数据 */
    hasMore?: boolean;
    /** 下一页游标 */
    nextCursor?: string;
  };

  type ChatHistoryVO = {
    /** 关联应用ID */
    appId?: string;
    /** 关联用户ID */
    userId?: string;
    /** 消息内容 */
    message?: string;
    /** 消息类型：user=用户消息，ai=AI回复 */
    messageType?: string;
    /** 创建时间 */
    createTime?: string;
  };

  type getAppByAdminPageParams = {
    /** 应用主键ID */
    id?: string;
    appName?: string;
    cover?: string;
    initPrompt?: string;
    codeGenType?: string;
    priority?: number;
    appTag?: string;
    deployKey?: string;
    deployTime?: string;
    pageNum?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
  };

  type getAppByAdminParams = {
    /** 应用ID */
    id: any;
  };

  type getAppByIdParams = {
    /** 应用ID */
    id: any;
  };

  type getChatHistoryByAdminPageParams = {
    /** 记录主键ID */
    id?: string;
    /** 关联应用ID */
    appId?: string;
    /** 关联用户ID */
    userId?: string;
    /** 消息类型过滤：user/ai */
    messageType?: string;
    pageNum?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
  };

  type getChatHistoryByIdParams = {
    /** 聊天记录ID */
    id: any;
  };

  type getCodeGenStreamParams = {
    /** 应用主键ID */
    appId: string;
    userPrompt: string;
  };

  type getFeaturedAppByPageParams = {
    appName?: string;
    /** 应用标签：tool/webPage/profile */
    appTag?: string;
    sortField?: string;
    pageNum?: number;
    pageSize?: number;
    sortOrder?: string;
  };

  type getInfoParams = {
    /** 用户ID */
    id: any;
  };

  type getMyAppByPageParams = {
    appName?: string;
    /** 应用标签：tool/webPage/profile */
    appTag?: string;
    sortField?: string;
    pageNum?: number;
    pageSize?: number;
    sortOrder?: string;
  };

  type getUserByPageParams = {
    userQueryRequestDTO: UserQueryRequestDTO;
  };

  type PageApp = {
    records?: App[];
    pageNumber?: number;
    pageSize?: number;
    totalPage?: number;
    totalRow?: number;
    optimizeCountQuery?: boolean;
  };

  type PageAppVO = {
    records?: AppVO[];
    pageNumber?: number;
    pageSize?: number;
    totalPage?: number;
    totalRow?: number;
    optimizeCountQuery?: boolean;
  };

  type PageChatHistory = {
    records?: ChatHistory[];
    pageNumber?: number;
    pageSize?: number;
    totalPage?: number;
    totalRow?: number;
    optimizeCountQuery?: boolean;
  };

  type PageUser = {
    records?: User[];
    pageNumber?: number;
    pageSize?: number;
    totalPage?: number;
    totalRow?: number;
    optimizeCountQuery?: boolean;
  };

  type previewAppParams = {
    /** 应用ID */
    appId: any;
  };

  type queryChatHistoryByCursorParams = {
    /** 关联应用ID */
    appId?: string;
    /** 消息类型过滤：user/ai */
    messageType?: string;
    /** 翻页游标，首次加载不传 */
    cursor?: string;
    pageNum?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
  };

  type removeAppByAdminParams = {
    /** 应用ID */
    id: any;
  };

  type removeAppByIdParams = {
    /** 应用ID */
    id: any;
  };

  type removeChatHistoryByAdminParams = {
    /** 聊天记录ID */
    id: any;
  };

  type removeUserByIdParams = {
    /** 用户ID */
    id: any;
  };

  type ServerSentEventString = Record<string, any>;

  type serveStaticResourceParams = {
    deployKey: string;
  };

  type updateAppByAdminParams = {
    /** 应用ID */
    id: any;
  };

  type updateAppByIdParams = {
    /** 应用ID */
    id: any;
  };

  type updateParams = {
    /** 用户ID */
    id: any;
  };

  type User = {
    /** 用户主键ID */
    id?: string;
    userAccount?: string;
    userPassword?: string;
    userName?: string;
    userAvatar?: string;
    userProfile?: string;
    userRole?: string;
    vipExpireTime?: string;
    vipCode?: string;
    /** 会员ID */
    vipId?: string;
    shareCode?: string;
    /** 邀请人ID */
    inviteUser?: string;
    editTime?: string;
    createTime?: string;
    updateTime?: string;
    isDelete?: number;
  };

  type UserAddRequestDTO = {
    userAccount: string;
    userPassword: string;
    userName?: string;
    userAvatar?: string;
    userProfile?: string;
    userRole?: string;
    vipExpireTime?: string;
    vipCode?: string;
    /** 会员ID */
    vipId?: string;
    shareCode?: string;
    /** 邀请人ID */
    inviteUser?: string;
  };

  type UserLoginRequestDTO = {
    userAccount: string;
    password: string;
  };

  type UserQueryRequestDTO = {
    pageNum?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    /** 用户主键ID */
    id?: string;
    userAccount?: string;
    userRole?: string;
    userName?: string;
    /** 会员ID */
    vipId?: string;
  };

  type UserRegisterRequestDTO = {
    userAccount: string;
    password: string;
    confirmPassword: string;
  };

  type UserUpdateRequestDTO = {
    userAccount?: string;
    userPassword?: string;
    userName?: string;
    userAvatar?: string;
    userProfile?: string;
    userRole?: string;
  };

  type UserVO = {
    /** 用户主键ID */
    id?: string;
    userAccount?: string;
    userName?: string;
    userAvatar?: string;
    userProfile?: string;
    userRole?: string;
    vipExpireTime?: string;
    /** 会员ID */
    vipId?: string;
    shareCode?: string;
    /** 邀请人ID */
    inviteUser?: string;
    editTime?: string;
    createTime?: string;
    updateTime?: string;
  };
}
