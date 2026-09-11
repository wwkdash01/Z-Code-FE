# 应用平台重构实施报告

> 需求来源：`plan/重构.md`、`plan/精选应用行为.md`；实施计划：`plan/app-refactor-plan.md`
> 完成日期：2026-09-11

## 一、实现内容

### 1. 主页（原型图 1、2）— `src/views/HomeView.vue` + 卡片组件

- 品牌区 + 提示词输入卡（上传/优化为 TODO 占位）+ 示例提示词标签
- 输入提示词 → 应用信息 Modal（名称/生成类型/标签）→ `saveApp` 创建应用 → 跳转对话页（无 `view` 参数，触发自动发送初始提示词）
- **我的应用**（`MyAppCard.vue`，仅登录态显示）：名称搜索 + `a-pagination` 分页（每页 10 条）+ 卡片操作按钮
- **精选应用**（`FeaturedAppCard.vue`）：名称搜索 + 排序下拉 + 标签过滤 + `a-pagination` 分页（每页 10 条）+ 卡片操作按钮
- 卡片操作按钮（两个列表逻辑一致）：
  - 「查看对话」始终显示 → 跳转 `/app/app-edit?id=<id>&view=1`（查看模式，不自动发消息）
  - 「查看作品」仅当 `deployKey` 存在时显示 → 新页面打开部署地址 `${API_BASE}/deployments/${deployKey}/`

### 2. 应用生成对话页（原型图 3）— `src/pages/app/AppEditPage.vue`（重构）

- 无顶部栏；左上为应用信息卡：封面头像 + 应用名称 + 创建时间 + `DownOutlined` 按钮
- `DownOutlined` 弹出应用详情 card：展示全部 AppVO 字段（ID/名称/封面/生成类型/标签/部署Key/创建时间/创建者/初始提示词）；可编辑字段按权限用无边框 input、失焦调更新接口（owner：应用名称；admin：名称+封面+优先级），不可编辑字段正常文本展示；非本人作品不显示编辑按钮
- 左侧核心内容：
  - `ChatBoard` 多轮对话组件：游标分页加载历史消息（「加载更多历史」）、SSE 流式输出（`useStreaming` composable）、用户消息在右 / AI 消息在左（气泡字号 13px）
  - 创建流（无 `view` 参数且本人作品）：历史为空时自动将 `initPrompt` 作为第一条消息发送（页面不展示初始提示词）
  - 查看流（`?view=1`）：不自动发送；非本人作品禁用输入框，hover 提示「无法在别人的作品下对话哦~」
- 右侧网页展示区域（左右面板占比 1:4）：
  - 工具栏（刷新 / 只读 URL 栏 / 新窗口打开 / 最右侧部署按钮）
  - AI 回复流结束（`stream-complete` 事件）后调用 `previewApp` 获取预览 URL，iframe 内嵌展示；进入页面时也会静默尝试加载一次
- 部署：`deployApp` 成功后弹窗展示后端返回的部署 URL（可复制、可新窗口打开）

### 3. 应用管理页（仅管理员）— `src/pages/admin/AppManagePage.vue`（新建）

- 路由 `/admin/app-manager`，菜单项「应用管理」（`config/menu.ts`，GlobalHeader 按 `/admin` 前缀自动仅管理员可见；`access.ts` 路由守卫校验角色）
- 样式与用户管理页一致：inline 搜索表单（应用ID/名称/标签/生成类型/优先级）+ `a-table` + 分页（默认 10/页，可切换每页数量）
- 操作栏：
  - 编辑：新开页面跳转 `/app/app-info?id=<id>`
  - 精选：popconfirm 后 `updateAppByAdmin` 将优先级置为 99（列表中以「精选」tag 标识）
  - 删除：popconfirm 后 `removeAppByAdmin`
- 更多：详情弹窗（`getAppByAdmin` 全字段 `a-descriptions`）

### 4. 应用信息修改页 — `src/pages/app/AppInfoEditPage.vue`（新建）

- 路由 `/app/app-info?id=<id>`，用户与管理员均可进入
- 普通用户：仅可编辑应用名称（`updateAppById`）；非本人应用展示 403 结果页（后端为最终校验）
- 管理员：可编辑应用名称、封面 URL（含缩略预览）、优先级（`updateAppByAdmin`），数据来自 `getAppByAdmin`

### 5. 聊天组件升级

- `Chat/ChatBoard.vue`：新增 `initialPrompt` / `disabled` / `disabledTip` props 与 `streamComplete` 事件；修复登录用户头像取值 bug（pinia ref 解包）；空历史 + `initialPrompt` 自动发送；输入区禁用时 tooltip 提示
- `Chat/MessageRow.vue`：消息对齐互换为用户在右、AI 在左（符合需求与原型图）
- `composables/useStreaming.ts`：补齐缺失的 `import { ref } from 'vue'`（原文件无法通过 type-check）

### 6. 清理

- 删除 `src/components/Chat/ChatContainer.vue`（被 ChatBoard 取代的旧单轮组件）
- 删除 `src/pages/HomePage.vue`（0 行空文件）

## 二、文件结构

```
src/
├── api/                        # openapi2ts 生成，未改动（AppVO 已含 deployKey）
├── components/
│   ├── Chat/
│   │   ├── ChatBoard.vue       # 改：多轮对话核心（历史/流式/自动发送/只读模式）
│   │   └── MessageRow.vue      # 改：用户右 / AI 左对齐
│   ├── MyAppCard.vue           # 改：分页 + 搜索 + 查看对话/查看作品
│   └── FeaturedAppCard.vue     # 改：分页 + 搜索 + 卡片按钮（保留排序/标签）
├── composables/
│   └── useStreaming.ts         # 改：补 ref 导入（SSE 通用工具，复用）
├── config/
│   ├── api.ts                  # 改：新增 deployUrlOf(deployKey)
│   └── menu.ts                 # 改：新增「应用管理」菜单项
├── pages/
│   ├── admin/
│   │   └── AppManagePage.vue   # 新：管理员应用管理页
│   └── app/
│       ├── AppEditPage.vue     # 改：对话页重构（顶部栏/对话/预览/部署）
│       └── AppInfoEditPage.vue # 新：应用信息修改页
├── router/index.ts             # 改：/admin/app-manager、/app/app-info
└── views/HomeView.vue          # 未改动（主页骨架，引用上述卡片组件）
```

## 三、接口映射

| 页面/组件 | 接口（src/api） | 用途 |
|---|---|---|
| HomeView | `saveApp` | 创建应用并跳转对话页 |
| MyAppCard | `getMyAppByPage` | 我的应用分页（10/页）+ 名称搜索 |
| FeaturedAppCard | `getFeaturedAppByPage` | 精选应用分页 + 名称/标签/排序 |
| 卡片「查看作品」 | 无（前端拼接） | `deployUrlOf(deployKey)` → `/deployments/{deployKey}/` |
| AppEditPage | `getAppById` / `previewApp` / `deployApp` | 应用信息 / 预览 URL / 部署 URL |
| ChatBoard | `queryChatHistoryByCursor` + SSE `/apps/user/code-stream`（`useStreaming`） | 历史消息游标分页 / 流式生成（后端自动落库） |
| AppManagePage | `getAppByAdminPage` / `getAppByAdmin` / `updateAppByAdmin` / `removeAppByAdmin` | 管理端查询/详情/精选/删除 |
| AppInfoEditPage | `getAppById`+`updateAppById`（用户）；`getAppByAdmin`+`updateAppByAdmin`（管理员） | 应用信息修改 |

## 四、验证情况

- `npm run type-check`：通过
- `npx eslint`（本次改动文件）：0 error（仓库其余 lint 报错为既有问题，未在本次范围）
- 手动走查清单（需后端 `localhost:58080` 运行）：
  1. 主页创建应用 → 对话页自动发送 initPrompt → 流式回复 → 结束后右侧 iframe 自动展示预览
  2. 部署 → 弹窗展示部署 URL，复制/打开可用
  3. 我的应用/精选：搜索、翻页、「查看对话」（?view=1 不自动发送）、「查看作品」（有 deployKey 才显示）
  4. 他人作品对话页：输入框禁用 + hover 提示
  5. 管理员「应用管理」：搜索/翻页/编辑(新页)/精选/删除/详情
  6. `/app/app-info`：用户改自己应用名；他人应用 403；管理员改封面/优先级

## 五、未实现（明确排除）

- 上传、提示词优化按钮（维持 TODO）
- 对话页代码页/设置页 tab（移除不重建）
- TestPage / test 组件 / useSSE* 沙箱文件未动
- 聊天历史管理页、生产部署配置
