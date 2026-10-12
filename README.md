# MemoNest｜AI 角色陪伴式生活手帐

AI Companion & Personal Memory Journal

以原创 AI 角色陪伴为入口，将用户授权保存的生活经历转化为个人记忆，并支持时间线整理与 AI 回顾。本项目用于 AI 产品经理求职作品集，按阶段建设完整产品。

## 最新增量：小栖对话、聊天整理与阶段回顾

本分支保留已有搜索分页修复和单篇 AI 回顾，新增真实模型接口与界面；没有新增数据库迁移。**实现代码与工程测试不等于真实服务已验收。** 本次环境没有 Supabase/OpenAI 凭据，公网部署、真实模型效果及完整托管账号闭环仍待验证。

- `/chat`：同意当次处理 → 原创小栖对话 → 选择用户原话整理 → 可编辑候选 → 确认日期及私人保存。
- `/review`：选择最多 8 篇真实记录 → 单次全文处理同意 → 有原文引用和来源入口的阶段回顾。
- 原有记录详情单篇回顾继续使用 `/api/ai/review`；新增多篇接口为 `/api/ai/period-review`，不替换原契约。
- 聊天仅当前页面保存；正常角色调用只用有效授权摘要；生成前后检查来源，缺模型不提供假回复。
- 配置服务端 `OPENAI_API_KEY` 和 `OPENAI_MODEL`；Key 不进浏览器或 GitHub。现有 Supabase 配置和迁移保持不变。

实现、设计取舍、接口、验证边界及非 Vercel 部署路径见 [本轮交付](docs/COMPANION_DELIVERY.md)。历史检查与最新结果见 [交付清单](docs/DELIVERY_CHECKLIST.md)，求职展示见 [作品说明](docs/PORTFOLIO_CASE_STUDY.md)。

以下为上阶段实现记录，历史“聊天禁用/尚未接入”等描述由上述最新范围更新。

## 当前项目状态：核心全栈与单篇 AI 回顾代码，真实闭环待验收

沿用 Next.js App Router、TypeScript、Tailwind CSS，保留原创小栖介绍、首页和独立 UX Lab。Supabase 核心迁移已由项目负责人执行，只读连接检查通过。新增单篇日记的 OpenAI 服务端回顾接口，但当前没有 API Key，未执行真实模型生成；角色聊天仍未开放。

| 路径 | 页面 | 代码能力 |
| --- | --- | --- |
| `/` | 小屋首页 | 产品介绍、角色与直接记录入口 |
| `/account` | 账号 | Supabase 注册、登录、邮箱确认、退出与会话 |
| `/chat` | 角色聊天 | 原创角色介绍；AI 发送仍禁用 |
| `/journal` | 生活记录 | 输入、预览、真实服务端保存、失败重试、撤销入口 |
| `/journal/:id` | 记录详情 | 读取、编辑、二次确认删除、独立摘要授权与撤回；单篇 AI 回顾需 Key 和当次处理许可 |
| `/memories` | 记忆管理 | 私人时间线/关键词与角色记忆分区、分页和权限管理 |
| `/ux-lab` | 研究原型 | 保留 B1 八方案，虚构数据与正式数据库隔离 |

**缺少服务配置时，账号与正式数据页明确显示未配置，数据接口返回 503，不提供假登录或假持久化。** 已实现的代码不代表外部 Supabase、邮件或部署已通过验收。认证/记录接口不使用 localStorage；研究员主动保存的匿名研究数据仍只在 UX Lab 独立命名空间。

最终交付边界：真实邮箱注册/登录、托管日记新增/编辑/删除/刷新持久化、双用户隔离仍待验收；现有真实 E2E 脚本仅支持本地 Supabase 自动确认账号，不能替代托管邮箱流程。没有自动关闭邮箱确认或重建数据库。Vercel 部署暂停。

## 安装、配置、数据库初始化与启动

推荐 Node.js 24 LTS、npm 11。版本由 `package-lock.json` 锁定。

```bash
npm ci
cp -n .env.example .env.local
# 配置下面三项，并初始化数据库后启动
npm run dev
```

默认开发端口 3000；保留已有 `.env.local`，不要覆盖。若默认 npm 缓存不可写，使用 `npm ci --cache /tmp/memonest-npm-cache`。没有服务配置也能预览首页、角色介绍和 UX Lab。

`localhost` 只指运行服务的机器：Codex 云端启动后，你电脑上的 localhost 无法直接访问。当前任务界面没有提供预览/端口转发入口，不能把云端地址当作公网链接。开发体验验证可在自己电脑检出现有仓库、单独安全配置环境变量后运行；若其他开发环境提供端口转发，则使用其真实地址并匹配 APP_URL。Vercel 部署目前暂停，不影响现有 Supabase 数据库。

### 托管 Supabase（实际使用前必需）

项目已有 Supabase SDK、Auth 和真实数据库接口；接入现有真实项目请先阅读 [接入与验收指南](docs/SUPABASE_SETUP.md)，包含官方环境变量映射、只读连接探测、迁移核查与两用户验收步骤。不要直接覆盖客户端或复制 todos 示例。

1. 创建自己的 Supabase 项目，选择适合数据所在地的区域。在项目 API 设置读取 URL 和 publishable key（旧 anon key 也支持）。在 `.env.local` 或部署平台安全设置填写，**不要将值发到聊天或提交 Git**。
2. 在新项目 SQL Editor 按顺序执行 [核心迁移](supabase/migrations/202610110001_core.sql)、[清理运维函数](supabase/maintenance.sql)。已应用的迁移不要重复执行。已有 CLI 关联项目可以使用 `supabase db push`，先核对目标项目，不用 reset 覆盖现有数据库。
3. 在 Authentication 启用 Email/Password 和邮箱确认；配置自己控制的 SMTP、Site URL 为 APP_URL、Redirect URLs 包含 `APP_URL/auth/confirm`。Sign up 邮件模板使用下面的 token-hash 链接；缺少 SMTP/确认模板不能宣称邮件注册闭环可用。
4. 设置注册速率限制与部署需要的反滥用措施。当前页面没有 CAPTCHA 集成，公开生产发布前需验证防滥用方案。
5. 由管理员每日调度 `select public.mn_purge_expired_metadata();`（Supabase Cron/受控运维任务）。未调度就不会自动清理；备份、恢复策略与地区另行验收。

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">确认 MemoNest 邮箱</a>
```

| 环境变量 | 用途 |
| --- | --- |
| `SUPABASE_URL` | 项目 HTTPS URL，服务端读取 |
| `SUPABASE_PUBLISHABLE_KEY` | publishable key 或旧 anon key；不接受 service_role/secret key |
| `APP_URL` | 浏览器实际访问的 origin；用于同源校验和邮件返回，生产必填 HTTPS |

本应用不需要 DATABASE_URL 或管理员数据库密钥。**没有 NEXT_PUBLIC 凭证，也不使用 service_role 绕过 RLS**。本机开发 APP_URL 可为 `.env.example` 中默认值；云端端口转发需要改成实际浏览器域名。生产使用 HTTPS。

### 可选单篇 AI 回顾

在忽略的 `.env.local` 或运行环境安全设置填写 `OPENAI_API_KEY`，`OPENAI_MODEL` 默认 `gpt-4.1-mini`。不要发到聊天、提交 Git 或使用 NEXT_PUBLIC 前缀。重启应用后，在已登录的日记详情页阅读 OpenAI 处理范围，主动勾选当次同意并生成回顾。缺 Key 返回明确错误，不发送日记或展示假回复。

此功能只处理当前记录，最多 6000 字符、三个片刻；每段附正文原句。25 秒超时，可停止；回顾仅临时显示，刷新清除，不保存新日记或长期授权。生成后重新核查来源版本，修改/删除后丢弃结果。`store:false` 不意味着供应商零留存，供应商条款与费用需负责人核实。公开使用前还需预算及跨实例限流评估。

云端调用需允许 `api.openai.com`；代理环境使用 Node.js 24 的 `NODE_USE_ENV_PROXY=1 npm run dev`，不改变本机直接联网的要求。完整 API、错误路径与未执行的效果测试见 [AI 回顾说明](docs/AI_REVIEW.md)。当前不提供真实模型成功或质量结论。

### 可选真实本地 Supabase

已有 Docker 和官方 Supabase CLI 时，仓库提供本地配置与迁移：

```bash
supabase start -x studio,imgproxy,storage-api,realtime,postgres-meta,logflare,vector,edge-runtime,supavisor
# 从 CLI 本地状态安全复制 API URL 和 anon/publishable key 到 .env.local，不提交输出
# 本地数据库首次启动应用 migrations；若已有数据库，按 CLI migration up 升级，勿盲目 reset
npm run dev
```

`supabase/config.toml` **只用于本地开发**，关闭邮件确认以便真实本地注册自动化，不改变托管项目的邮件设置。本地库没有用户或生活记录种子，仅有原创角色小栖。服务重启由 Docker/Supabase 保留卷持久化；停止用 `supabase stop`，不要添加删除数据选项。

本次云环境尝试启动真实本地服务时，镜像仓库 `public.ecr.aws` 返回 Forbidden，因此本地认证/持久化 E2E 未运行。若在该云环境继续验证，需开放官方镜像域名及其实际下载依赖，或配置可访问的托管项目域名；不要用假服务替代。

## 质量检查与生产运行

```bash
npm run lint
npm run typecheck
npm run build
npm run start
```

`lint` 不允许警告，`typecheck` 开启 TypeScript 严格检查，`build` 验证生产构建。核心测试分为输入/组件契约、PostgreSQL 权限、未配置页面和真实服务 E2E。每层验证范围不同，不以构建通过替代真实持久化验收。

配置真实项目后可运行 `npm run supabase:check`（Node.js 24）：仅做有时限的只读 Auth/匿名拒绝探测，缺失配置或连接失败返回非零，不输出凭据。管理员另在 SQL Editor 运行 [verify.sql](supabase/verify.sql) 核查迁移元数据。通过探测不代表登录、行级隔离或持久化已验收。

安装提示：当前 Next.js ESLint 插件链的 peer dependency 范围仍限定 ESLint 9，因此暂使用兼容的 9.39.5。npm 会提示该版本已停止维护；待插件链支持 ESLint 10 后再整体升级，避免强制忽略依赖兼容性。

## UX Lab · 可交互研究原型

独立入口 `/ux-lab`，不改变正式产品页面。使用统一虚构素材、固定脚本和原型专属内存状态：

| 实验 | 方案路径 | 实际交互 |
| --- | --- | --- |
| E1 记录方式 | `/ux-lab/e1/a`、`/ux-lab/e1/b` | 手动与脚本对话；输入、编辑、预览、私人保存 |
| E2 保存时机 | `/ux-lab/e2/a`、`/ux-lab/e2/b`、`/ux-lab/e2/c` | 弹窗、轻提示、主动整理；忽略/放弃、保存、10 秒撤销、独立模拟授权与撤回 |
| E3 回顾方式 | `/ux-lab/e3/a`、`/ux-lab/e3/b`、`/ux-lab/e3/c` | 时间线、主题、固定故事卡；日期/关键词、来源详情、无结果确认 |

对话与故事等待固定 3 秒，**不是真实 AI，也不理解任意输入**。模拟保存只存在当前方案页面，刷新或离开丢失；无数据库、AI API、分析上传。私人保存与角色长期授权明显分开，编辑原记录使模拟旧授权失效。

研究员工具支持明确开始/暂停/结束、结果分类、打扰与负担评分、单次故障演练。默认仅内存保留；可主动将匿名任务元数据保存到独立 localStorage 命名空间或导出 JSON，**不保存/导出正文、聊天、搜索词或真实身份**。匿名任务数不是参与人数。退出共享设备时清空，下载文件另行删除。

请先阅读 [可用性测试主持指南](docs/USABILITY_TEST_GUIDE.md)。三组采用同一素材会产生学习效应，当前原型用于探索流程问题；未执行真实参与者研究，不宣称方案胜出或效果提升。

### 原型浏览器检查

```bash
# 首次在没有浏览器的本机安装 Chromium
npx playwright install chromium
npm run build
npm run test:ux
```

若环境已有系统 Chromium，可用以下方式，无需再下载：

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:ux
```

测试配置启动生产服务到 3100 端口，需要先构建，且该端口不能被占用。包含桌面 1280px 和手机 390px 项目，以及 320px 布局边界检查；`test-results/` 和 `playwright-report/` 为忽略的生成文件。软件测试不等于参与者研究，也不是正式数据库/AI 的安全验收。

## 核心测试与验收

```bash
npm run test:server       # 配置 fail-closed、CSRF、请求大小与错误脱敏
npm run test:core         # 输入、隔离组件 mock、嵌入式 PostgreSQL 迁移/RLS/事务
npm run build
npm run test:core:browser # 未配置服务时的桌面/手机页面与接口拒绝
# 仅在真实本地 Supabase 已启动、迁移已应用且 .env.local 已配置后：
npm run test:core:live
```

浏览器首次需 `npx playwright install chromium`，或给测试命令设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`。核心浏览器配置使用 3101 端口；未配置套件主动清空服务变量，真实本地套件显式读取 .env.local、要求 localhost/127.0.0.1 Supabase，无配置则失败，不伪装通过。测试服务 APP_URL 自动设为其浏览器 origin。自动化用新建的虚构测试账号/事件，勿在生产库运行。

`test:core` 中 PGlite 执行真实 PostgreSQL 引擎 SQL，但 auth.uid/users 是临时夹具；组件测试 mock 网络只验证输入保留、默认未授权和重试逻辑。两者均不证明 Supabase 登录。`test:core:live` 检查真实注册/登录/退出、刷新后读取、A/B 越权、编辑/删除、默认私人、独立授权/修改/撤回和页面交互；当前因镜像阻塞未执行。托管邮件确认、跨设备持久化、屏幕阅读器和实机软键盘仍待验收。

详细接口、事务和权限范围见 [B2 全栈说明](docs/CORE_FULLSTACK.md)。

## 项目结构

```text
src/app/                   # 保留首页、聊天、记录、记忆、UX Lab
  account/                 # 真实账号入口
  auth/confirm/            # 邮箱主动确认
  api/                     # 同源认证、记录 CRUD、记忆授权与资格接口
  journal/[id]/            # 记录详情
src/components/core/       # 表单、详情、时间线、授权面板、会话边界
src/lib/core/              # 共享运行时 schema、类型和客户端请求
src/lib/server/            # server-only 配置、认证、服务与错误处理
src/proxy.ts               # 正式数据页面的会话刷新，不作用于 UX Lab
supabase/migrations/       # PostgreSQL 表、RLS、受限事务 RPC
supabase/maintenance.sql   # 管理员 90 天失效元信息清理（需实际调度）
tests/core/                # 契约、组件与嵌入式 PostgreSQL 测试
tests/core-browser/        # 未配置验证 / 显式真实本地 E2E
```

## 安全与数据边界

- `.env*` 忽略，仅 `.env.example` 可提交。配置值只由 server-only 模块读取。
- Supabase Auth 管理密码；HttpOnly 会话 Cookie，生产 Secure，同源写校验、服务端 getUser 验证、RLS 与 owner 外键。
- 业务写带当前操作用户标记并与可信会话比对，拒绝其他标签切换账号后的旧草稿；该标记不能代替认证。
- 私人记录与 Memory/MemoryConsent 分离；授权精确摘要/来源版本/小栖范围，撤回清摘要，编辑失效，删除同事务撤回。
- 10 秒撤销窗口由数据库校验；失败不显示成功，重复创建同请求 UUID 不重复写入，版本冲突要求重新确认。
- 数据动态/no-store，不缓存授权上下文；AI 只在用户单次确认后处理指定日记，无全文日志或生产分析追踪。
- 在线删除不代表备份即时擦除；有效 GRANT 与失效元信息分开保留，运维调度/备份政策须实际配置。

## 产品设计文档

第二阶段 A 只交付产品研究计划、交互方案与未来技术设计；未改动核心页面，未接入数据库、登录或 AI。未开展真实访谈、用户测试或 Figma 原型制作，不能把文档中的门槛当实际效果。竞品资料因网络访问受限未能核实，相关具体功能保持待验证。

| 文档 | 重点 |
| --- | --- |
| [产品需求](docs/PRD.md) | 用户问题、假设 H1–H5、MVP 优先级、用户故事 U1–U8 与验收 |
| [用户研究计划](docs/USER_RESEARCH.md) | 5–8 位成年人招募、访谈、观察、指标与空白记录模板 |
| [竞品分析](docs/COMPETITOR_ANALYSIS.md) | BIMOBIMO、XinDiary 类与传统记录路径，证据边界和查证任务 |
| [UX 实验](docs/UX_EXPERIMENTS.md) | E1 手动/对话成本、E2 保存时机 A/B/C、E3 回顾 T/G/S |
| [用户流程](docs/USER_FLOW.md) | 角色进入、记录、确认、授权、撤销、删除与异常 |
| [设计系统](docs/DESIGN_SYSTEM.md) | 现有 token、未来组件规范、手机优先布局、Figma 制作清单 |
| [架构方案](docs/ARCHITECTURE.md) | 未来 Next.js、PostgreSQL、AI 服务的数据流与权限边界 |
| [数据模型](docs/DATA_MODEL.md) | 私人 JournalEntry 与授权 Memory/MemoryConsent 分离 |
| [AI 工作流](docs/AI_WORKFLOW.md) | 提取候选不自动保存、逐条授权、受限召回与技术测试计划 |
| [单篇 AI 回顾](docs/AI_REVIEW.md) | 当前接口、单次处理边界、缺 Key/取消/错误与效果评估方案 |
| [求职作品说明](docs/PORTFOLIO_CASE_STUDY.md) | 用户假设、产品取舍、页面说明、展示顺序与最小收尾计划 |
| [最终交付清单](docs/DELIVERY_CHECKLIST.md) | 本次实际检查、外部阻塞与只需完成的三项收尾 |
| [B2 核心全栈说明](docs/CORE_FULLSTACK.md) | 实际代码范围、API、权限与验收边界 |
| [真实 Supabase 接入](docs/SUPABASE_SETUP.md) | 环境配置、只读探测、迁移核查、托管项目验收与阻塞 |
| [可用性测试主持指南](docs/USABILITY_TEST_GUIDE.md) | B1 原型入口、同意、顺序、任务、采集口径与空白观察模板 |

主要取舍：手写和聊天是平行入口；自动弹窗只进入研究，轻量卡片要通过测试才启用，主动整理始终保留；回顾先证明能找回原文，再考虑 AI 故事。私人保存不等于授权角色长期记住，私人内容在用户发起单次 AI 处理时另行说明范围。

## 下一阶段建议

先补完托管邮件、持久化、越权与会话验收，再安全配置真实模型 Key 并运行虚构材料评测，最后用真实操作录制求职演示。停止堆功能：角色聊天、多篇故事、多角色与后台任务留到独立阶段。没有实际研究就不声称降低负担或提升效果。
