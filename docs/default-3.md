# OpenAPI definition


**简介**:OpenAPI definition


**HOST**:http://localhost:58080/api


**联系人**:


**Version**:v0


**接口路径**:/api/v3/api-docs/default


[TOC]






# user-controller


## getInfo


**接口地址**:`/api/users/admin/{id}`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|id|用户ID|path|true|String||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseUser|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||User|User|
|&emsp;&emsp;id|用户主键ID|string||
|&emsp;&emsp;userAccount||string||
|&emsp;&emsp;userPassword||string||
|&emsp;&emsp;userName||string||
|&emsp;&emsp;userAvatar||string||
|&emsp;&emsp;userProfile||string||
|&emsp;&emsp;userRole||string||
|&emsp;&emsp;vipExpireTime||string(date-time)||
|&emsp;&emsp;vipCode||string||
|&emsp;&emsp;vipId|会员ID|string||
|&emsp;&emsp;shareCode||string||
|&emsp;&emsp;inviteUser|邀请人ID|string||
|&emsp;&emsp;editTime||string(date-time)||
|&emsp;&emsp;createTime||string(date-time)||
|&emsp;&emsp;updateTime||string(date-time)||
|&emsp;&emsp;isDelete||integer(int32)||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": {
		"id": "",
		"userAccount": "",
		"userPassword": "",
		"userName": "",
		"userAvatar": "",
		"userProfile": "",
		"userRole": "",
		"vipExpireTime": "",
		"vipCode": "",
		"vipId": "",
		"shareCode": "",
		"inviteUser": "",
		"editTime": "",
		"createTime": "",
		"updateTime": "",
		"isDelete": 0
	}
}
```


## update


**接口地址**:`/api/users/admin/{id}`


**请求方式**:`PUT`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`application/json`


**接口描述**:


**请求示例**:


```javascript
{
  "userAccount": "",
  "userPassword": "",
  "userName": "",
  "userAvatar": "",
  "userProfile": "",
  "userRole": ""
}
```


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|id|用户ID|path|true|String||
|userUpdateRequestDTO|UserUpdateRequestDTO|body|true|UserUpdateRequestDTO|UserUpdateRequestDTO|
|&emsp;&emsp;userAccount|||false|string||
|&emsp;&emsp;userPassword|||false|string||
|&emsp;&emsp;userName|||false|string||
|&emsp;&emsp;userAvatar|||false|string||
|&emsp;&emsp;userProfile|||false|string||
|&emsp;&emsp;userRole|||false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseupdate|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||boolean||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": true
}
```


## removeUserById


**接口地址**:`/api/users/admin/{id}`


**请求方式**:`DELETE`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|id|用户ID|path|true|String||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseremoveUserById|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||boolean||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": true
}
```


## userLogout


**接口地址**:`/api/users/user/logout`


**请求方式**:`POST`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


暂无


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseuserLogout|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||boolean||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": true
}
```


## userRegister


**接口地址**:`/api/users/guest/register`


**请求方式**:`POST`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`application/json`


**接口描述**:


**请求示例**:


```javascript
{
  "userAccount": "",
  "password": "",
  "confirmPassword": ""
}
```


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|userRegisterRequestDTO|UserRegisterRequestDTO|body|true|UserRegisterRequestDTO|UserRegisterRequestDTO|
|&emsp;&emsp;userAccount|||true|string||
|&emsp;&emsp;password|||true|string||
|&emsp;&emsp;confirmPassword|||true|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseuserRegister|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||integer(int64)|integer(int64)|


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": 0
}
```


## userLogin


**接口地址**:`/api/users/guest/login`


**请求方式**:`POST`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`application/json`


**接口描述**:


**请求示例**:


```javascript
{
  "userAccount": "",
  "password": ""
}
```


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|userLoginRequestDTO|UserLoginRequestDTO|body|true|UserLoginRequestDTO|UserLoginRequestDTO|
|&emsp;&emsp;userAccount|||true|string||
|&emsp;&emsp;password|||true|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseUserVO|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||UserVO|UserVO|
|&emsp;&emsp;id|用户主键ID|string||
|&emsp;&emsp;userAccount||string||
|&emsp;&emsp;userName||string||
|&emsp;&emsp;userAvatar||string||
|&emsp;&emsp;userProfile||string||
|&emsp;&emsp;userRole||string||
|&emsp;&emsp;vipExpireTime||string(date-time)||
|&emsp;&emsp;vipId|会员ID|string||
|&emsp;&emsp;shareCode||string||
|&emsp;&emsp;inviteUser|邀请人ID|string||
|&emsp;&emsp;editTime||string(date-time)||
|&emsp;&emsp;createTime||string(date-time)||
|&emsp;&emsp;updateTime||string(date-time)||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": {
		"id": "",
		"userAccount": "",
		"userName": "",
		"userAvatar": "",
		"userProfile": "",
		"userRole": "",
		"vipExpireTime": "",
		"vipId": "",
		"shareCode": "",
		"inviteUser": "",
		"editTime": "",
		"createTime": "",
		"updateTime": ""
	}
}
```


## saveUser


**接口地址**:`/api/users/admin`


**请求方式**:`POST`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`application/json`


**接口描述**:


**请求示例**:


```javascript
{
  "userAccount": "",
  "userPassword": "",
  "userName": "",
  "userAvatar": "",
  "userProfile": "",
  "userRole": "",
  "vipExpireTime": "",
  "vipCode": "",
  "vipId": "",
  "shareCode": "",
  "inviteUser": ""
}
```


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|userAddRequestDTO|UserAddRequestDTO|body|true|UserAddRequestDTO|UserAddRequestDTO|
|&emsp;&emsp;userAccount|||true|string||
|&emsp;&emsp;userPassword|||true|string||
|&emsp;&emsp;userName|||false|string||
|&emsp;&emsp;userAvatar|||false|string||
|&emsp;&emsp;userProfile|||false|string||
|&emsp;&emsp;userRole|||false|string||
|&emsp;&emsp;vipExpireTime|||false|string(date-time)||
|&emsp;&emsp;vipCode|||false|string||
|&emsp;&emsp;vipId|会员ID||false|string||
|&emsp;&emsp;shareCode|||false|string||
|&emsp;&emsp;inviteUser|邀请人ID||false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponsesaveUser|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||boolean||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": true
}
```


## getCurrentUser


**接口地址**:`/api/users/user/login-status`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


暂无


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseUserVO|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||UserVO|UserVO|
|&emsp;&emsp;id|用户主键ID|string||
|&emsp;&emsp;userAccount||string||
|&emsp;&emsp;userName||string||
|&emsp;&emsp;userAvatar||string||
|&emsp;&emsp;userProfile||string||
|&emsp;&emsp;userRole||string||
|&emsp;&emsp;vipExpireTime||string(date-time)||
|&emsp;&emsp;vipId|会员ID|string||
|&emsp;&emsp;shareCode||string||
|&emsp;&emsp;inviteUser|邀请人ID|string||
|&emsp;&emsp;editTime||string(date-time)||
|&emsp;&emsp;createTime||string(date-time)||
|&emsp;&emsp;updateTime||string(date-time)||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": {
		"id": "",
		"userAccount": "",
		"userName": "",
		"userAvatar": "",
		"userProfile": "",
		"userRole": "",
		"vipExpireTime": "",
		"vipId": "",
		"shareCode": "",
		"inviteUser": "",
		"editTime": "",
		"createTime": "",
		"updateTime": ""
	}
}
```


## getUserByPage


**接口地址**:`/api/users/admin/page`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|userQueryRequestDTO||query|true|UserQueryRequestDTO|UserQueryRequestDTO|
|&emsp;&emsp;pageNum|||false|integer(int32)||
|&emsp;&emsp;pageSize|||false|integer(int32)||
|&emsp;&emsp;sortField|||false|string||
|&emsp;&emsp;sortOrder|||false|string||
|&emsp;&emsp;id|用户主键ID||false|string||
|&emsp;&emsp;userAccount|||false|string||
|&emsp;&emsp;userRole|||false|string||
|&emsp;&emsp;userName|||false|string||
|&emsp;&emsp;vipId|会员ID||false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponsePageUser|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||PageUser|PageUser|
|&emsp;&emsp;records||array|User|
|&emsp;&emsp;&emsp;&emsp;id|用户主键ID|string||
|&emsp;&emsp;&emsp;&emsp;userAccount||string||
|&emsp;&emsp;&emsp;&emsp;userPassword||string||
|&emsp;&emsp;&emsp;&emsp;userName||string||
|&emsp;&emsp;&emsp;&emsp;userAvatar||string||
|&emsp;&emsp;&emsp;&emsp;userProfile||string||
|&emsp;&emsp;&emsp;&emsp;userRole||string||
|&emsp;&emsp;&emsp;&emsp;vipExpireTime||string(date-time)||
|&emsp;&emsp;&emsp;&emsp;vipCode||string||
|&emsp;&emsp;&emsp;&emsp;vipId|会员ID|string||
|&emsp;&emsp;&emsp;&emsp;shareCode||string||
|&emsp;&emsp;&emsp;&emsp;inviteUser|邀请人ID|string||
|&emsp;&emsp;&emsp;&emsp;editTime||string(date-time)||
|&emsp;&emsp;&emsp;&emsp;createTime||string(date-time)||
|&emsp;&emsp;&emsp;&emsp;updateTime||string(date-time)||
|&emsp;&emsp;&emsp;&emsp;isDelete||integer(int32)||
|&emsp;&emsp;pageNumber||integer(int64)||
|&emsp;&emsp;pageSize||integer(int64)||
|&emsp;&emsp;totalPage||integer(int64)||
|&emsp;&emsp;totalRow||integer(int64)||
|&emsp;&emsp;optimizeCountQuery||boolean||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": {
		"records": [
			{
				"id": "",
				"userAccount": "",
				"userPassword": "",
				"userName": "",
				"userAvatar": "",
				"userProfile": "",
				"userRole": "",
				"vipExpireTime": "",
				"vipCode": "",
				"vipId": "",
				"shareCode": "",
				"inviteUser": "",
				"editTime": "",
				"createTime": "",
				"updateTime": "",
				"isDelete": 0
			}
		],
		"pageNumber": 0,
		"pageSize": 0,
		"totalPage": 0,
		"totalRow": 0,
		"optimizeCountQuery": true
	}
}
```


# app-controller


## getAppById


**接口地址**:`/api/apps/user/{id}`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|id|应用ID|path|true|String||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseAppVO|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||AppVO|AppVO|
|&emsp;&emsp;id|应用主键ID|string||
|&emsp;&emsp;appName||string||
|&emsp;&emsp;cover||string||
|&emsp;&emsp;initPrompt||string||
|&emsp;&emsp;codeGenType|可用值:singleton,multifile|string||
|&emsp;&emsp;appTag|可用值:tool,webPage,profile|string||
|&emsp;&emsp;deployKey||string||
|&emsp;&emsp;createTime||string(date-time)||
|&emsp;&emsp;userName||string||
|&emsp;&emsp;userAvatar||string||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": {
		"id": "",
		"appName": "",
		"cover": "",
		"initPrompt": "",
		"codeGenType": "",
		"appTag": "",
		"deployKey": "",
		"createTime": "",
		"userName": "",
		"userAvatar": ""
	}
}
```


## updateAppById


**接口地址**:`/api/apps/user/{id}`


**请求方式**:`PUT`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`application/json`


**接口描述**:


**请求示例**:


```javascript
{
  "appName": ""
}
```


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|id|应用ID|path|true|String||
|appUpdateRequestDTO|AppUpdateRequestDTO|body|true|AppUpdateRequestDTO|AppUpdateRequestDTO|
|&emsp;&emsp;appName|||true|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseupdateAppById|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||boolean||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": true
}
```


## removeAppById


**接口地址**:`/api/apps/user/{id}`


**请求方式**:`DELETE`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|id|应用ID|path|true|String||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseremoveAppById|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||boolean||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": true
}
```


## getAppByAdmin


**接口地址**:`/api/apps/admin/{id}`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|id|应用ID|path|true|String||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseApp|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||App|App|
|&emsp;&emsp;id|应用主键ID|string||
|&emsp;&emsp;appName||string||
|&emsp;&emsp;cover||string||
|&emsp;&emsp;appTag|可用值:tool,webPage,profile|string||
|&emsp;&emsp;initPrompt||string||
|&emsp;&emsp;codeGenType|可用值:singleton,multifile|string||
|&emsp;&emsp;codeGenDir||string||
|&emsp;&emsp;priority||integer(int32)||
|&emsp;&emsp;deployKey||string||
|&emsp;&emsp;deployDir||string||
|&emsp;&emsp;deployTime||string(date-time)||
|&emsp;&emsp;createUserId|创建者ID|string||
|&emsp;&emsp;editTime||string(date-time)||
|&emsp;&emsp;createTime||string(date-time)||
|&emsp;&emsp;updateTime||string(date-time)||
|&emsp;&emsp;isDelete||integer(int32)||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": {
		"id": "",
		"appName": "",
		"cover": "",
		"appTag": "",
		"initPrompt": "",
		"codeGenType": "",
		"codeGenDir": "",
		"priority": 0,
		"deployKey": "",
		"deployDir": "",
		"deployTime": "",
		"createUserId": "",
		"editTime": "",
		"createTime": "",
		"updateTime": "",
		"isDelete": 0
	}
}
```


## updateAppByAdmin


**接口地址**:`/api/apps/admin/{id}`


**请求方式**:`PUT`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`application/json`


**接口描述**:


**请求示例**:


```javascript
{
  "appName": "",
  "cover": "",
  "priority": 0,
  "appTag": ""
}
```


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|id|应用ID|path|true|String||
|appAdminUpdateRequestDTO|AppAdminUpdateRequestDTO|body|true|AppAdminUpdateRequestDTO|AppAdminUpdateRequestDTO|
|&emsp;&emsp;appName|||false|string||
|&emsp;&emsp;cover|||false|string||
|&emsp;&emsp;priority|||false|integer(int32)||
|&emsp;&emsp;appTag|可用值:tool,webPage,profile||false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseupdateAppByAdmin|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||boolean||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": true
}
```


## removeAppByAdmin


**接口地址**:`/api/apps/admin/{id}`


**请求方式**:`DELETE`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|id|应用ID|path|true|String||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseremoveAppByAdmin|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||boolean||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": true
}
```


## saveApp


**接口地址**:`/api/apps/user`


**请求方式**:`POST`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`application/json`


**接口描述**:


**请求示例**:


```javascript
{
  "appName": "",
  "cover": "",
  "initPrompt": "",
  "codeGenType": "",
  "appTag": ""
}
```


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|appAddRequestDTO|AppAddRequestDTO|body|true|AppAddRequestDTO|AppAddRequestDTO|
|&emsp;&emsp;appName|||true|string||
|&emsp;&emsp;cover|||false|string||
|&emsp;&emsp;initPrompt|||true|string||
|&emsp;&emsp;codeGenType|可用值:singleton,multifile||true|string||
|&emsp;&emsp;appTag|可用值:tool,webPage,profile||false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponsesaveApp|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||integer(int64)|integer(int64)|


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": 0
}
```


## deployApp


**接口地址**:`/api/apps/user/deployment`


**请求方式**:`POST`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`application/json`


**接口描述**:


**请求示例**:


```javascript
{
  "appId": ""
}
```


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|appDeployRequestDTO|AppDeployRequestDTO|body|true|AppDeployRequestDTO|AppDeployRequestDTO|
|&emsp;&emsp;appId|应用主键ID||true|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponsedeployApp|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||string||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": ""
}
```


## previewApp


**接口地址**:`/api/apps/user/preview/{appId}`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|appId|应用ID|path|true|String||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponsepreviewApp|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||string||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": ""
}
```


## getMyAppByPage


**接口地址**:`/api/apps/user/page/my-apps`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|appName||query|false|string||
|appTag|应用标签：tool/webPage/profile|query|false|string||
|sortField||query|false|string||
|pageNum||query|false|integer(int32)||
|pageSize||query|false|integer(int32)||
|sortOrder||query|false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponsePageAppVO|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||PageAppVO|PageAppVO|
|&emsp;&emsp;records||array|AppVO|
|&emsp;&emsp;&emsp;&emsp;id|应用主键ID|string||
|&emsp;&emsp;&emsp;&emsp;appName||string||
|&emsp;&emsp;&emsp;&emsp;cover||string||
|&emsp;&emsp;&emsp;&emsp;initPrompt||string||
|&emsp;&emsp;&emsp;&emsp;codeGenType|可用值:singleton,multifile|string||
|&emsp;&emsp;&emsp;&emsp;appTag|可用值:tool,webPage,profile|string||
|&emsp;&emsp;&emsp;&emsp;deployKey||string||
|&emsp;&emsp;&emsp;&emsp;createTime||string(date-time)||
|&emsp;&emsp;&emsp;&emsp;userName||string||
|&emsp;&emsp;&emsp;&emsp;userAvatar||string||
|&emsp;&emsp;pageNumber||integer(int64)||
|&emsp;&emsp;pageSize||integer(int64)||
|&emsp;&emsp;totalPage||integer(int64)||
|&emsp;&emsp;totalRow||integer(int64)||
|&emsp;&emsp;optimizeCountQuery||boolean||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": {
		"records": [
			{
				"id": "",
				"appName": "",
				"cover": "",
				"initPrompt": "",
				"codeGenType": "",
				"appTag": "",
				"deployKey": "",
				"createTime": "",
				"userName": "",
				"userAvatar": ""
			}
		],
		"pageNumber": 0,
		"pageSize": 0,
		"totalPage": 0,
		"totalRow": 0,
		"optimizeCountQuery": true
	}
}
```


## getCodeGenStream


**接口地址**:`/api/apps/user/code-stream`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`text/event-stream`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|appId|应用主键ID|query|true|string||
|userPrompt||query|true|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|ServerSentEventString|


**响应参数**:


暂无


**响应示例**:
```javascript
[
	null
]
```


## getFeaturedAppByPage


**接口地址**:`/api/apps/guest/page/featured`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|appName||query|false|string||
|appTag|应用标签：tool/webPage/profile|query|false|string||
|sortField||query|false|string||
|pageNum||query|false|integer(int32)||
|pageSize||query|false|integer(int32)||
|sortOrder||query|false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponsePageAppVO|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||PageAppVO|PageAppVO|
|&emsp;&emsp;records||array|AppVO|
|&emsp;&emsp;&emsp;&emsp;id|应用主键ID|string||
|&emsp;&emsp;&emsp;&emsp;appName||string||
|&emsp;&emsp;&emsp;&emsp;cover||string||
|&emsp;&emsp;&emsp;&emsp;initPrompt||string||
|&emsp;&emsp;&emsp;&emsp;codeGenType|可用值:singleton,multifile|string||
|&emsp;&emsp;&emsp;&emsp;appTag|可用值:tool,webPage,profile|string||
|&emsp;&emsp;&emsp;&emsp;deployKey||string||
|&emsp;&emsp;&emsp;&emsp;createTime||string(date-time)||
|&emsp;&emsp;&emsp;&emsp;userName||string||
|&emsp;&emsp;&emsp;&emsp;userAvatar||string||
|&emsp;&emsp;pageNumber||integer(int64)||
|&emsp;&emsp;pageSize||integer(int64)||
|&emsp;&emsp;totalPage||integer(int64)||
|&emsp;&emsp;totalRow||integer(int64)||
|&emsp;&emsp;optimizeCountQuery||boolean||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": {
		"records": [
			{
				"id": "",
				"appName": "",
				"cover": "",
				"initPrompt": "",
				"codeGenType": "",
				"appTag": "",
				"deployKey": "",
				"createTime": "",
				"userName": "",
				"userAvatar": ""
			}
		],
		"pageNumber": 0,
		"pageSize": 0,
		"totalPage": 0,
		"totalRow": 0,
		"optimizeCountQuery": true
	}
}
```


## getAppByAdminPage


**接口地址**:`/api/apps/admin/page`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|id|应用主键ID|query|false|string||
|appName||query|false|string||
|cover||query|false|string||
|initPrompt||query|false|string||
|codeGenType||query|false|string||
|priority||query|false|integer(int32)||
|appTag||query|false|string||
|deployKey||query|false|string||
|deployTime||query|false|string(date-time)||
|pageNum||query|false|integer(int32)||
|pageSize||query|false|integer(int32)||
|sortField||query|false|string||
|sortOrder||query|false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponsePageApp|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||PageApp|PageApp|
|&emsp;&emsp;records||array|App|
|&emsp;&emsp;&emsp;&emsp;id|应用主键ID|string||
|&emsp;&emsp;&emsp;&emsp;appName||string||
|&emsp;&emsp;&emsp;&emsp;cover||string||
|&emsp;&emsp;&emsp;&emsp;appTag|可用值:tool,webPage,profile|string||
|&emsp;&emsp;&emsp;&emsp;initPrompt||string||
|&emsp;&emsp;&emsp;&emsp;codeGenType|可用值:singleton,multifile|string||
|&emsp;&emsp;&emsp;&emsp;codeGenDir||string||
|&emsp;&emsp;&emsp;&emsp;priority||integer(int32)||
|&emsp;&emsp;&emsp;&emsp;deployKey||string||
|&emsp;&emsp;&emsp;&emsp;deployDir||string||
|&emsp;&emsp;&emsp;&emsp;deployTime||string(date-time)||
|&emsp;&emsp;&emsp;&emsp;createUserId|创建者ID|string||
|&emsp;&emsp;&emsp;&emsp;editTime||string(date-time)||
|&emsp;&emsp;&emsp;&emsp;createTime||string(date-time)||
|&emsp;&emsp;&emsp;&emsp;updateTime||string(date-time)||
|&emsp;&emsp;&emsp;&emsp;isDelete||integer(int32)||
|&emsp;&emsp;pageNumber||integer(int64)||
|&emsp;&emsp;pageSize||integer(int64)||
|&emsp;&emsp;totalPage||integer(int64)||
|&emsp;&emsp;totalRow||integer(int64)||
|&emsp;&emsp;optimizeCountQuery||boolean||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": {
		"records": [
			{
				"id": "",
				"appName": "",
				"cover": "",
				"appTag": "",
				"initPrompt": "",
				"codeGenType": "",
				"codeGenDir": "",
				"priority": 0,
				"deployKey": "",
				"deployDir": "",
				"deployTime": "",
				"createUserId": "",
				"editTime": "",
				"createTime": "",
				"updateTime": "",
				"isDelete": 0
			}
		],
		"pageNumber": 0,
		"pageSize": 0,
		"totalPage": 0,
		"totalRow": 0,
		"optimizeCountQuery": true
	}
}
```


# chat-history-controller


## addChatHistory


**接口地址**:`/api/chatHistories/user`


**请求方式**:`POST`


**请求数据类型**:`application/x-www-form-urlencoded,application/json`


**响应数据类型**:`application/json`


**接口描述**:


**请求示例**:


```javascript
{
  "appId": "",
  "message": "",
  "messageType": ""
}
```


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|chatHistoryAddRequestDTO|ChatHistoryAddRequestDTO|body|true|ChatHistoryAddRequestDTO|ChatHistoryAddRequestDTO|
|&emsp;&emsp;appId|关联应用ID||true|string||
|&emsp;&emsp;message|消息内容||true|string||
|&emsp;&emsp;messageType|消息类型：user=用户消息，ai=AI回复||true|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseaddChatHistory|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||integer(int64)|integer(int64)|


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": 0
}
```


## getChatHistoryById


**接口地址**:`/api/chatHistories/user/{id}`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|id|聊天记录ID|path|true|String||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseChatHistoryVO|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||ChatHistoryVO|ChatHistoryVO|
|&emsp;&emsp;appId|关联应用ID|string||
|&emsp;&emsp;userId|关联用户ID|string||
|&emsp;&emsp;message|消息内容|string||
|&emsp;&emsp;messageType|消息类型：user=用户消息，ai=AI回复|string||
|&emsp;&emsp;createTime|创建时间|string(date-time)||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": {
		"appId": "",
		"userId": "",
		"message": "",
		"messageType": "",
		"createTime": ""
	}
}
```


## queryChatHistoryByCursor


**接口地址**:`/api/chatHistories/user/cursor`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|appId|关联应用ID|query|false|string||
|messageType|消息类型过滤：user/ai|query|false|string||
|cursor|翻页游标，首次加载不传|query|false|string||
|pageNum||query|false|integer(int32)||
|pageSize||query|false|integer(int32)||
|sortField||query|false|string||
|sortOrder||query|false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseChatHistoryUserCursorPageVO|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||ChatHistoryUserCursorPageVO|ChatHistoryUserCursorPageVO|
|&emsp;&emsp;records|当前页消息列表|array|ChatHistoryVO|
|&emsp;&emsp;&emsp;&emsp;appId|关联应用ID|string||
|&emsp;&emsp;&emsp;&emsp;userId|关联用户ID|string||
|&emsp;&emsp;&emsp;&emsp;message|消息内容|string||
|&emsp;&emsp;&emsp;&emsp;messageType|消息类型：user=用户消息，ai=AI回复|string||
|&emsp;&emsp;&emsp;&emsp;createTime|创建时间|string(date-time)||
|&emsp;&emsp;hasMore|是否有更多数据|boolean||
|&emsp;&emsp;nextCursor|下一页游标|string||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": {
		"records": [
			{
				"appId": "",
				"userId": "",
				"message": "",
				"messageType": "",
				"createTime": ""
			}
		],
		"hasMore": true,
		"nextCursor": ""
	}
}
```


## getChatHistoryByAdminPage


**接口地址**:`/api/chatHistories/admin/page`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|id|记录主键ID|query|false|string||
|appId|关联应用ID|query|false|string||
|userId|关联用户ID|query|false|string||
|messageType|消息类型过滤：user/ai|query|false|string||
|pageNum||query|false|integer(int32)||
|pageSize||query|false|integer(int32)||
|sortField||query|false|string||
|sortOrder||query|false|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponsePageChatHistory|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||PageChatHistory|PageChatHistory|
|&emsp;&emsp;records||array|ChatHistory|
|&emsp;&emsp;&emsp;&emsp;id|会话记录主键ID|string||
|&emsp;&emsp;&emsp;&emsp;appId|关联应用ID|string||
|&emsp;&emsp;&emsp;&emsp;userId|关联用户ID|string||
|&emsp;&emsp;&emsp;&emsp;message||string||
|&emsp;&emsp;&emsp;&emsp;messageType|消息类型：user=用户消息，ai=AI回复|string||
|&emsp;&emsp;&emsp;&emsp;editTime||string(date-time)||
|&emsp;&emsp;&emsp;&emsp;createTime||string(date-time)||
|&emsp;&emsp;&emsp;&emsp;updateTime||string(date-time)||
|&emsp;&emsp;&emsp;&emsp;isDelete||integer(int32)||
|&emsp;&emsp;pageNumber||integer(int64)||
|&emsp;&emsp;pageSize||integer(int64)||
|&emsp;&emsp;totalPage||integer(int64)||
|&emsp;&emsp;totalRow||integer(int64)||
|&emsp;&emsp;optimizeCountQuery||boolean||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": {
		"records": [
			{
				"id": "",
				"appId": "",
				"userId": "",
				"message": "",
				"messageType": "",
				"editTime": "",
				"createTime": "",
				"updateTime": "",
				"isDelete": 0
			}
		],
		"pageNumber": 0,
		"pageSize": 0,
		"totalPage": 0,
		"totalRow": 0,
		"optimizeCountQuery": true
	}
}
```


## removeChatHistoryByAdmin


**接口地址**:`/api/chatHistories/admin/{id}`


**请求方式**:`DELETE`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|id|聊天记录ID|path|true|String||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseremoveChatHistoryByAdmin|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||boolean||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": true
}
```


# health-controller


## getHealthStatus


**接口地址**:`/api/health`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


暂无


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponsegetHealthStatus|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||string||


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": ""
}
```


# deployment-controller


## serveStaticResource


**接口地址**:`/api/deployments/{deployKey}/**`


**请求方式**:`GET`


**请求数据类型**:`application/x-www-form-urlencoded`


**响应数据类型**:`application/json`


**接口描述**:


**请求参数**:


| 参数名称 | 参数说明 | 请求类型    | 是否必须 | 数据类型 | schema |
| -------- | -------- | ----- | -------- | -------- | ------ |
|deployKey||path|true|string||


**响应状态**:


| 状态码 | 说明 | schema |
| -------- | -------- | ----- | 
|200|OK|BaseResponseString|


**响应参数**:


| 参数名称 | 参数说明 | 类型 | schema |
| -------- | -------- | ----- |----- | 
|code||string(int32)|string(int32)|
|message||string||
|data||string(binary)|string(binary)|


**响应示例**:
```javascript
{
	"code": {},
	"message": {},
	"data": ""
}
```