# WWK Z-Code Platform — 前端项目上手指南

## 项目概览

**wwk z-code platform** 是一款 AI 驱动的无代码应用/网站生成平台。用户通过输入自然语言描述，即可由后端 AI 生成代码并部署为可运行的 Web 应用。

- **技术栈**: Vue 3.5 + TypeScript 5.8 + Vite 7 + Pinia + Ant Design Vue 4.2
- **API 层**: OpenAPI 自动生成（`@umijs/openapi`），Swagger v3 定义
- **构建工具**: Vite 7
- **包管理**: npm (worktree: `wwk_frontend`)

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器 (http://localhost:5173)
npm run dev

# 类型检查
npm run type-check

# 构建生产版本
npm run build

# 代码格式化 &  lint
npm run format
npm run lint
```

> **后端地址**: 前端默认请求 `http://localhost:58080/api`，请确保后端服务已启动。

---

## 目录结构

```
src/
├── api/                    # API 层（OpenAPI 自动生成）
│   ├── index.ts            # 统一导出各 controller
│   ├── typings.d.ts        # TypeScript 类型定义（所有接口 / DTO / 响应类型）
│   ├── userController.ts   # 用户相关 API（登录/注册/登出/CRUD）
│   ├── appController.ts    # 应用相关 API（创建/查询/流式代码生成/部署）
│   ├── deploymentController.ts  # 部署静态资源服务
│   └── healthController.ts     # 健康检查
├── config/
│   ├── site.ts             # 站点配置（title 等全局常量）
│   └── menu.ts             # 导航菜单配置（NavItem[]）
├── stores/
│   └── loginUser.ts        # 登录用户信息 Pinia Store
├── utils/
│   └── getImgDegradation.ts  # 图片兜底工具函数
├── router/
│   └── index.ts            # 路由定义（5 条路由）
├── access.ts               # 全局权限校验（beforeEach 钩子）
├── request.ts              # Axios 实例 + 拦截器
├── main.ts                 # 入口文件
├── App.vue                 # 根组件
├── layouts/
│   └── BasicLayout.vue     # 基础布局（Header + Content + Footer）
├── components/
│   ├── GlobalHeader.vue    # 顶部导航栏
│   ├── GlobalFooter.vue    # 底部页脚
│   ├── FeaturedAppCard.vue # 精选应用卡片组件
│   └── MyAppCard.vue       # 我的应用卡片组件
├── pages/
│   ├── HomePage.vue         # 首页主视图（提示词输入区 + 卡片区域）
│   ├── admin/
│   │   ├── UserManagePage.vue      # 用户管理页
│   │   ├── UserInfoDetailCard.vue  # 用户详情弹窗
│   │   └── UserInfoEditCard.vue    # 用户编辑弹窗
│   └── user/
│       ├── UserLoginPage.vue       # 登录页
│       └── UserRegisterPage.vue    # 注册页
└── views/
    ├── HomeView.vue          # 首页视图（含 HomePage）
    └── AboutView.vue         # 关于页
```

---

## 核心架构说明

### 1. 网络请求与拦截器 (`request.ts`)

- 基于 **Axios** 封装，baseURL: `http://localhost:58080/api`
- 携带 cookies（`withCredentials: true`），用于会话认证
- **响应拦截器**处理 `code === 40100` 时自动跳转登录页（排除用户相关接口和已在登录页的请求）

### 2. 状态管理 (`stores/loginUser.ts`)

- Pinia store，key 为 `'counter'`
- 维护 `loginUser: API.UserVO`，记录当前登录用户信息
- `fetchLoginUser()`: 调用 `getCurrentUser` 接口获取用户信息
- `setLoginUser()`: setter，用于登录后或注销后手动更新

### 3. 全局权限控制 (`access.ts`)

- 挂载于 `router.beforeEach` 钩子
- **首次导航**时等待后端返回用户信息后再做权限判断
- `/admin/**` 路径：需 `userRole === 'admin'`，否则跳转到登录页并携带 redirect 参数
- 用户相关接口不触发全局跳转（由页面自行处理 401）

### 4. 路由 (`router/index.ts`)

| 路径 | 名称 | 组件 | 说明 |
|------|------|------|------|
| `/` | 主页 | HomeView | 首页，包含 Hero + Prompt + 应用卡片 |
| `/about` | 关于 | AboutView | 静态展示 |
| `/admin/user-manager` | 用户管理 | UserManagePage | 管理员专属，含角色权限控制 |
| `/user/login` | 用户登录 | UserLoginPage | 登录表单 |
| `/user/register` | 用户注册 | UserRegisterPage | 注册表单 |

### 5. 布局体系

```
App.vue
 └── BasicLayout.vue
      ├── GlobalHeader    ← 顶部导航（Logo + 菜单 + 用户头像）
      ├── <router-view /> ← 内容区（padding 24px, #f5f5f5 背景）
      └── GlobalFooter    ← 底部页脚
```

### 6. API 层架构

API 代码通过 `openapi2ts` 从后端 Swagger 生成（`schemaPath: http://localhost:58080/api/v3/api-docs`）。

按权限分为三条路径：

| 路径前缀 | 控制器 | 功能 |
|----------|--------|------|
| `/users/admin/*` | userController | 管理员操作用户（增删改查、分页） |
| `/apps/admin/*` | appController | 管理员操作应用 |
| `/users/guest/*` | userController | 未登录用户的登录/注册 |
| `/users/user/*` | userController | 已登录用户的状态操作（登出/查看自己） |
| `/apps/guest/*` | appController | 浏览公开应用（featured 精选列表） |
| `/apps/user/*` | appController | 用户个人应用 CRUD、代码流生成、部署、预览 |
| `/deployments/*` | deploymentController | 部署静态资源加载 |
| `/health` | healthController | 后端健康检查 |

> 类型定义集中在 `src/api/typings.d.ts`，修改后端 Swagger 后运行 `npm run openapi2ts` 重新生成。

### 7. 图片兜底机制 (`utils/getImgDegradation.ts`)

- `getImgDegradation(url?)`: 验证 URL 合法性，非法则返回默认占位图 `anno.png`
- 被 `FeaturedAppCard`, `MyAppCard`, `UserInfoDetailCard`, `UserInfoEditCard` 复用

---

## 数据模型速查

所有类型定义在 `src/api/typing s.d.ts` 的 `API` 命名空间下。

### 核心实体

| 类型 | 说明 |
|------|------|
| `API.User` | 完整用户对象（含密码等敏感字段） |
| `API.UserVO` | 用户可见对象（不含密码） |
| `API.App` | 应用完整对象 |
| `API.AppVO` | 应用可见对象（含创建者信息） |
| `API.PageUser` / `API.PageApp` / `API.PageAppVO` | 分页对象（records + pagination meta） |

### 通用响应包装

所有接口返回类似结构：

```typescript
type BaseResponseXXX = {
  code?: number    // 200 = 成功, 40100 = 未登录
  message?: any
  data?: XXXType
}
```

---

## 待实现功能 (TODO)

以下功能标记了 TODO，需要后续完善：

1. **应用详情/预览** — `FeaturedAppCard` & `MyAppCard` 点击卡片仅为 placeholder
2. **图片上传** — `HomePage` handleUpload
3. **提示词优化** — `HomePage` handleOptimize（应调用 prompt/optimize API）
4. **提交/代码生成/部署** — `HomePage` handleSubmit（应对接 code-stream / deploy 接口）
5. **更多应用页** — `MyAppCard` "更多"按钮

---

## 开发规范

- **ESLint**: `@vue/eslint-config-typescript` + `plugin-vue` flat config
- **Prettier**: 3.5.3，通过 `npm run format` 格式化
- **TypeScript**: 严格模式，`.vue` 文件使用 `<script setup lang="ts">`
- **路径别名**: `@/*` → `src/*`, `~/*` → 项目根目录
- **Git 工作流**: 分支 `main`，当前开发者 `wwk1`

---

## 配置文件一览

| 文件 | 用途 |
|------|------|
| `vite.config.ts` | Vite 配置（alias: @, ~） |
| `tsconfig.json` | TS 聚合配置 |
| `tsconfig.app.json` | 前端 TS 编译选项 |
| `eslint.config.ts` | ESLint flat config |
| `openapi2ts.config.ts` | OpenAPI → TS 代码生成配置 |

---

## 原型参考

设计稿原型位于 `prototype/` 目录：

- `主页.png` — 首页设计
- `我的作品卡片.png` — 我的作品卡片样式
- `AppEdit.png` — 应用编辑页面设计
