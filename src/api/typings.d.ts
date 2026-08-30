declare namespace API {
  type App = {
    id?: number;
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
    createUserId?: number;
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

  type AppAdminQueryRequestDTO = {
    pageNum?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    id?: number;
    appName?: string;
    cover?: string;
    initPrompt?: string;
    codeGenType?: string;
    priority?: number;
    appTag?: "tool" | "webPage" | "profile";
    deployKey?: string;
    deployTime?: string;
    sortFieldValid?: boolean;
  };

  type AppAdminUpdateRequestDTO = {
    appName?: string;
    cover?: string;
    priority?: number;
    appTag?: "tool" | "webPage" | "profile";
  };

  type AppCodeStreamQueryDTO = {
    appId: number;
    userPrompt: string;
  };

  type AppDeployRequestDTO = {
    appId: number;
  };

  type AppQueryRequestDTO = {
    pageNum?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    appName?: string;
    sortFieldValid?: boolean;
  };

  type AppUpdateRequestDTO = {
    appName: string;
  };

  type AppVO = {
    id?: number;
    appName?: string;
    cover?: string;
    initPrompt?: string;
    codeGenType?: "singleton" | "multifile";
    appTag?: "tool" | "webPage" | "profile";
    createTime?: string;
    userName?: string;
    userAvatar?: string;
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

  type getAppByAdminPageParams = {
    appAdminQueryRequestDTO: AppAdminQueryRequestDTO;
  };

  type getAppByAdminParams = {
    id: number;
  };

  type getAppByIdParams = {
    id: number;
  };

  type getCodeGenStreamParams = {
    appCodeStreamQueryDTO: AppCodeStreamQueryDTO;
  };

  type getFeaturedAppByPageParams = {
    appQueryRequestDTO: AppQueryRequestDTO;
  };

  type getInfoParams = {
    id: number;
  };

  type getMyAppByPageParams = {
    appQueryRequestDTO: AppQueryRequestDTO;
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

  type PageUser = {
    records?: User[];
    pageNumber?: number;
    pageSize?: number;
    totalPage?: number;
    totalRow?: number;
    optimizeCountQuery?: boolean;
  };

  type previewAppParams = {
    appId: number;
  };

  type removeAppByAdminParams = {
    id: number;
  };

  type removeAppByIdParams = {
    id: number;
  };

  type removeUserByIdParams = {
    id: number;
  };

  type ServerSentEventString = Record<string, any>;

  type serveStaticResourceParams = {
    deployKey: string;
  };

  type updateAppByAdminParams = {
    id: number;
  };

  type updateAppByIdParams = {
    id: number;
  };

  type updateParams = {
    id: number;
  };

  type User = {
    id?: number;
    userAccount?: string;
    userPassword?: string;
    userName?: string;
    userAvatar?: string;
    userProfile?: string;
    userRole?: string;
    vipExpireTime?: string;
    vipCode?: string;
    vipId?: number;
    shareCode?: string;
    inviteUser?: number;
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
    vipId?: number;
    shareCode?: string;
    inviteUser?: number;
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
    id?: number;
    userAccount?: string;
    userRole?: string;
    userName?: string;
    vipId?: number;
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
    id?: number;
    userAccount?: string;
    userName?: string;
    userAvatar?: string;
    userProfile?: string;
    userRole?: string;
    vipExpireTime?: string;
    vipId?: number;
    shareCode?: string;
    inviteUser?: number;
    editTime?: string;
    createTime?: string;
    updateTime?: string;
  };
}
