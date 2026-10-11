# 真实 Supabase 项目接入与验收

本阶段复用 main 已有的 B2 实现：两个 Supabase SDK、服务端 SSR 客户端、Next.js 16 `proxy.ts` 会话刷新、Auth 接口、日记 CRUD、记忆授权与 PostgreSQL 迁移。没有替换首页、聊天、研究原型或增加官方示例的 todos 表。这里区分配置、连通、迁移与完整业务验收，任何一项通过都不能代替后者。

## 1. 连接配置

```bash
npm ci
cp .env.example .env.local
# 在本机填写配置；不要把 .env.local 提交到 Git
npm run supabase:check
npm run dev
```

官方 Quickstart 的变量与本项目对应关系：

| 官方变量 | MemoNest 使用的变量 | 说明 |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | SUPABASE_URL | 填写同一个项目 URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | SUPABASE_PUBLISHABLE_KEY | 填写同一个 publishable key |
| 无 | APP_URL | 实际浏览器访问 origin，不带路径；用于同源写校验及邮箱跳转 |

保留服务端读取方式：浏览器通过已有同源 API 操作，不需要重复创建 browser client。认证由 Supabase 管理，服务端 `getUser()` 验证身份；`proxy.ts` 在正式数据页面刷新 Cookie。页面缺少配置或服务不可访问时显示真实错误。不要把 Quickstart 示例中 Server Component 忽略 Cookie 写入异常的逻辑复制到登录接口。

环境变量或 `.env.local` 修改后重启 Next.js。生产 APP_URL 必须 HTTPS；云端预览使用平台实际转发域名，不能沿用 localhost。禁止使用数据库密码、service role 或 `sb_secret_` key。`.env.example` 保持空值，本机文件被 Git 忽略。

`supabase:check` 使用 Node.js 24 的环境代理支持，读取本机配置但不输出值。它只 GET Auth settings 和三个业务表的零行匿名请求，不创建账号、不读取私人正文、不改数据库。Auth 200 及预期权限拒绝只表示基础探测通过；退出码 0 **不代表**登录、RLS 行级隔离或持久化验收通过。缺失配置、错误响应、网络失败或异常匿名开放返回非零。每次请求限时 10 秒，无自动重试。

## 2. 初始化正确的项目

仅凭 URL 和 publishable key 无法安装数据库结构，这是权限边界，不应通过 service role 绕过。

1. 在 Supabase Dashboard 确认目标项目。若项目已有表或旧迁移，先核查兼容性，勿盲目重放或 reset。
2. 首次安装执行 [核心迁移](../supabase/migrations/202610110001_core.sql)。迁移在单个事务中创建 characters、journal_entries、memories、memory_consents、owner RLS、受限 RPC 与必要索引；仅有原创角色种子，没有生活记录种子。
3. 执行 [运维函数](../supabase/maintenance.sql)，管理员另行安排每日清理，应用客户端无执行权限。
4. 在 SQL Editor 执行 [只读核查](../supabase/verify.sql)。13 项元数据检查都应 `passed=true`；它检查表/RLS/策略存在、表权限、函数签名/执行权限/固定 search_path，不读取私人内容。策略的实际语义仍须两用户测试，不能只凭元数据宣布安全。
5. 配置 Authentication 的 Email/Password、邮箱确认、SMTP、Site URL 和 `APP_URL/auth/confirm` redirect；确认邮件 token-hash 模板见 [README](../README.md#托管-supabase实际使用前必需)。迁移不会替你配置这些设置。

已关联 CLI 的项目可按正式迁移流程升级；未关联时使用上述 SQL Editor。不要为了接入把数据库管理员凭据放进前端、仓库或聊天。

## 3. 托管项目手动验收（尚未执行）

使用项目负责人控制的两个测试邮箱和虚构事件；不借用真实生活隐私，不在生产库自动批量注册账号。新账号是否可注册取决于项目 Auth 设置与邮件服务。

| 操作 | 必须观察的结果 |
| --- | --- |
| `/account` 注册 A；确认邮件后登录 | 真实 Supabase 用户与会话；刷新保持状态；错误密码被拒绝 |
| A 在 `/journal` 保存虚构记录并刷新 | `/memories` 时间线与详情仍存在；数据库关联 A，默认无角色记忆 |
| A 编辑、刷新，取消后再确认删除 | 更新持久化；取消不删；确认删除后页面和接口不能读取正文 |
| A 对另一记录单独确认摘要授权，再撤回 | 默认不勾选；10 秒撤销窗口后才可授权；撤回保留私人记录，`/api/memories/context` 不再包含摘要 |
| A 授权后修改源记录 | 旧摘要失效，必须重新确认授权 |
| 退出 A 后，未登录访问数据接口 | 返回 401；不得显示上一个用户的数据 |
| 注册/确认/登录 B，尝试 A 的记录 ID | 页面及 GET/PATCH/DELETE 接口均不能访问 A；授权/撤回同样被拒绝 |
| A/B 切换账号，返回旧标签页操作草稿 | 会话边界清空旧私人界面；旧身份写入标记被服务端拒绝 |
| 手机 390px 与桌面 1280px 完成上述主流程 | 输入、预览、确认、返回、错误重试均可操作 |

接口写入还要求 Origin=APP_URL、可信会话和当前用户操作标记。测试 PATCH/DELETE 时采用 DevTools 中 B 自己合法请求的格式替换为 A 的 ID，不通过缺少 CSRF header 的失败替代身份隔离测试。不要分享 Cookie、请求凭据或正文截图。

自动化 `test:core:live` 目前仅支持真实**本地** Supabase（自动确认测试邮箱），不会自动对托管项目关闭确认或创建测试用户。托管邮件确认及实际跨设备持久化须按表记录结果；未做的保持“待验证”。

## 4. 本次环境证据与阻塞

- 本机连接配置已写入忽略的 `.env.local`；提交内容不包含项目实际 key。
- 云端项目域名请求被出口代理拒绝：curl 报 `CONNECT tunnel failed, response 403`，项目端点 HTTP 状态为 000。这不是 Supabase 返回的认证失败。
- 只读 `supabase:check` 非零退出；未确认连接成功，未执行远端迁移、注册、CRUD 或真实 E2E。
- 已保存项目域名网络放行与启动说明草稿。需要在云环境设置中审核、保存并发布；草稿保存本身不改变当前网络。
- 放行后执行一次 `supabase:check`，再在 Dashboard 完成迁移/只读核查和邮件设置，然后执行上表。若检查失败，按具体原因修复，避免不变条件下反复重试。

云环境通过 HTTP(S) 出口代理访问服务时，使用 Node.js 24 的 `NODE_USE_ENV_PROXY=1 npm run dev` 启动，让 SDK 的 fetch 使用环境代理；本机直接联网不需要此选项。只读检查命令已显式启用环境代理。该选项不会绕过域名放行规则。

本次独立验证：`lint`、`typecheck`、`build` 通过；`test:server` 5 项、`test:core` 15 项通过。生产启动检查在 3102 端口完成：首页、账号页、UX Lab 返回 200，未登录日记/记忆接口返回 401。3000 端口已有进程，未停止或覆盖。未运行托管注册、邮件、CRUD、真实双用户 E2E；没有新增参与者研究数据。

本地 PostgreSQL/组件/服务端测试验证代码与权限契约，不能当作托管 Supabase 实测。实际测试结果以执行输出及 PR 描述为准。
