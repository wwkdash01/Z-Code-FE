declare namespace API {
  type BaseResponsegetHealthStatus = {
    code?: number
    message?: any
    data?: string
  }

  type BaseResponsePageUser = {
    code?: number
    message?: any
    data?: PageUser
  }

  type BaseResponseremoveUserById = {
    code?: number
    message?: any
    data?: boolean
  }

  type BaseResponsesaveUser = {
    code?: number
    message?: any
    data?: boolean
  }

  type BaseResponseupdate = {
    code?: number
    message?: any
    data?: boolean
  }

  type BaseResponseUser = {
    code?: number
    message?: any
    data?: User
  }

  type BaseResponseuserLogout = {
    code?: number
    message?: any
    data?: boolean
  }

  type BaseResponseuserRegister = {
    code?: number
    message?: any
    data?: number
  }

  type BaseResponseUserVO = {
    code?: number
    message?: any
    data?: UserVO
  }

  type getInfoParams = {
    id: number
  }

  type getUserByPageParams = {
    userQueryRequestDTO: UserQueryRequestDTO
  }

  type PageUser = {
    records?: User[]
    pageNumber?: number
    pageSize?: number
    totalPage?: number
    totalRow?: number
    optimizeCountQuery?: boolean
  }

  type removeUserByIdParams = {
    id: number
  }

  type updateParams = {
    id: number
  }

  type User = {
    id?: number
    userAccount?: string
    userPassword?: string
    userName?: string
    userAvatar?: string
    userProfile?: string
    userRole?: string
    vipExpireTime?: string
    vipCode?: string
    vipId?: number
    shareCode?: string
    inviteUser?: number
    editTime?: string
    createTime?: string
    updateTime?: string
    isDelete?: number
  }

  type UserAddRequestDTO = {
    userAccount: string
    userPassword: string
    userName?: string
    userAvatar?: string
    userProfile?: string
    userRole?: string
    vipExpireTime?: string
    vipCode?: string
    vipId?: number
    shareCode?: string
    inviteUser?: number
  }

  type UserLoginRequestDTO = {
    userAccount: string
    password: string
  }

  type UserQueryRequestDTO = {
    pageNum?: number
    pageSize?: number
    sortField?: string
    sortOrder?: string
    id?: number
    userAccount?: string
    userRole?: string
    userName?: string
    vipId?: number
  }

  type UserRegisterRequestDTO = {
    userAccount: string
    password: string
    confirmPassword: string
  }

  type UserUpdateRequestDTO = {
    userAccount?: string
    userPassword?: string
    userName?: string
    userAvatar?: string
    userProfile?: string
    userRole?: string
  }

  type UserVO = {
    id?: number
    userAccount?: string
    userName?: string
    userAvatar?: string
    userProfile?: string
    userRole?: string
    vipExpireTime?: string
    vipId?: number
    shareCode?: string
    inviteUser?: number
    editTime?: string
    createTime?: string
    updateTime?: string
  }
}
