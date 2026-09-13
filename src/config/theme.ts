import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'

/**
 * 全站视觉令牌 —— 唯一真值源（single source of truth）。
 *
 * 分两层消费：
 *  1. antd 组件：`antdTheme` 走 ConfigProvider，覆盖主色、底色、圆角等
 *     （在 App.vue 里挂载，见 ANTD_THEME_CONFIG）；
 *  2. 自有 CSS：`themeVars` 的键名与 `src/styles/tokens.css` 的 `--color-*`
 *     自定义属性一一对应，CSS 侧用 var(--color-primary) 取值。
 *
 * 因此「换肤」只需要改这个文件 + tokens.css 里的镜像值，不许在组件里写死色值。
 */

/** 品牌主色：暖陶土（替代旧的全站绿色 #00b894） */
export const BRAND_PRIMARY = '#DA7757'

export const themeColors = {
  /** 品牌主色 */
  primary: BRAND_PRIMARY,
  /** 主色 hover（antd 4 色板 5 号位，比主色亮一档） */
  primaryHover: '#E0906F',
  /** 主色 active（按下态，比主色暗一档） */
  primaryActive: '#C05F41',
  /** 主色浅底：选中项、浅色标签、示例标签底色 */
  primarySoft: '#FBF0EB',
  /** 主色描边：浅底配的边线 */
  primaryBorder: '#F0D3C7',

  /** 页面底色：暖米白 */
  pageBg: '#FAF9F6',
  /** 首页品牌区（hero）渐变的起止两端，中间过渡到 pageBg。
      比页面底色略深一档的暖色洗色，用来把首屏和内容区拉开层次 */
  brandWashFrom: '#F5EFE6',
  brandWashTo: '#F7ECE5',
  /** 卡片 / 表格 / 弹窗底色：纯白，与页面底色形成层次 */
  surface: '#FFFFFF',
  /** 次级面：表头、输入框灰卡、封面占位等 */
  surfaceSubtle: '#F4F2ED',
  /** 深一档的次级面：hover 态 */
  surfaceSubtleHover: '#EBE8E1',

  /** 暖中性灰：标签用的「不抢焦点」中性色。
      与 tokens.css 的 --color-neutral-strong（#595959 冷灰，开关未选中态用）
      刻意区分：这个带暖调，摆在米白底上不发蓝 */
  neutralWarm: '#57534E',
  /** 琥珀强调色：应用标签「个人主页」专用的第三强调色（antd gold 6 / 1 / 3） */
  accentAmber: '#D48806',
  accentAmberSoft: '#FFFBE6',
  accentAmberBorder: '#FFE58F',

  /** 主描边 */
  border: '#E7E4DC',
  /** 次级描边 / 分割线 */
  borderSecondary: 'rgba(20, 20, 19, 0.08)',

  /** 正文墨色的基准值（不透明）。下面各档 text* 都是它的不同 alpha，
      antd 的 colorTextBase 也取这里，避免在 antdTheme 里再写一遍字面量 */
  textBase: '#141413',
  /** 正文文字 */
  text: 'rgba(20, 20, 19, 0.88)',
  /** 次级文字 / 标签 */
  textSecondary: 'rgba(20, 20, 19, 0.65)',
  /** 弱化文字：占位、说明 */
  textTertiary: 'rgba(20, 20, 19, 0.45)',
  /** 失效 / 极弱文字 */
  textQuaternary: 'rgba(20, 20, 19, 0.35)',
  /** 品牌标题色：比正文更暖的墨色，用于大标题 */
  textHeading: '#3D3929',
} as const

/**
 * 标签（应用标签 / 用户角色）的展示元信息形状。
 *
 * 刻意用「字色 + 底色 + 描边」三件套而不是 antd 预设色名：
 * antd 的预设色板是冷色高饱和的，摆在 #FAF9F6 暖底 + #DA7757 陶土主色旁边会打架。
 * 三件套同时让配置与 CSS 令牌能对齐（见 src/config/appTag.ts 的取值）。
 */
export interface TagMeta {
  /** 中文名 */
  label: string
  /** 文字色 */
  color: string
  /** 底色 */
  background: string
  /** 描边色 */
  borderColor: string
}

/**
 * 把标签元信息转成 antd Tag 的 style。
 *
 * antd 的 `color` prop 只认预设色名或单一色值（会走内置调色板），
 * 想同时定「字色 + 底色 + 描边」必须用 style。集中在这里是为了让
 * 表格、下拉选项、详情弹窗三处的标签渲染口径完全一致。
 */
export const tagStyle = (meta: TagMeta) => ({
  color: meta.color,
  backgroundColor: meta.background,
  borderColor: meta.borderColor,
})

/**
 * 字体族 —— 三档梯队，全部走系统字体栈，不加载任何 webfont。
 *
 * serif 用于标题层级，模仿 Anthropic 的 Copernicus：
 * Copernicus 是 Anthropic 的私有字体，无公开授权、无法从 CDN 取得，
 * 因此这里用观感最接近的暖衬线系统字体替代（macOS 上是 Apple New York）。
 */
export const themeFonts = {
  serif:
    "'New York', 'Iowan Old Style', Georgia, 'Songti SC', 'Source Han Serif SC', 'Noto Serif SC', 'Times New Roman', serif",
  sans: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "'SF Mono', Monaco, Consolas, 'Courier New', monospace",
} as const

/**
 * antd 全局主题配置。
 *
 * 关键 token：
 *  - colorPrimary  ：主按钮、选中态、链接、分页激活项等
 *  - colorBgLayout ：a-layout 内容区底色（旧值 #f5f5f5 冷灰）
 *  - colorBgContainer：卡片 / 表格 / 弹窗的白色容器
 *  - colorFillAlter：**表格表头 / 行 hover / 排序底色 / 展开行** 同源（实测
 *    antd 4.2.6 table/style/index.js:229 起把 tableHeaderBg、tableRowHoverBg、
 *    tableBodySortBg、tableFooterBg 全指向这个 token，默认 #fafafa 是冷灰），
 *    以及 Select 下拉里填充块等次级面
 *  - colorSplit / colorBorderSecondary：分割线与描边，冷灰换成暖灰避免与米白底打架
 */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: themeColors.primary,
    colorLink: themeColors.primary,
    colorLinkHover: themeColors.primaryHover,
    colorLinkActive: themeColors.primaryActive,
    colorInfo: themeColors.primary,
    colorBgLayout: themeColors.pageBg,
    colorBgContainer: themeColors.surface,
    colorFillAlter: themeColors.surfaceSubtle,
    colorFillSecondary: themeColors.surfaceSubtleHover,
    colorBorder: themeColors.border,
    colorBorderSecondary: themeColors.borderSecondary,
    colorSplit: themeColors.borderSecondary,
    colorTextBase: themeColors.textBase,
    colorTextHeading: themeColors.textHeading,
    borderRadius: 8,
    fontFamily: themeFonts.sans,
  },
}
