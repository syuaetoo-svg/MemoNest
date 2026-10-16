# 邮箱注册与确认排查记录

## 已知事实与证据边界

本轮只发起过一次真实注册，之后没有再次注册、使用别名或重发邮件。该响应记录于 2026-10-16 14:55:42 UTC（UTC+9：23:55:42）。未记录测试密码、确认令牌、邮件链接或配置凭据。

| 阶段 | 实际结论 |
|---|---|
| 浏览器 POST /api/auth/signup | HTTP 200，authenticated=false；应用请求被受理 |
| Supabase 公开 Auth 设置 GET | HTTP 200；email provider=true；disable_signup=false；mailer_autoconfirm=false |
| 是否新建用户 | 未确认；应用没有管理权限，旧响应没有保留用户创建信息；已有账号也可能得到掩蔽响应 |
| 邮件是否交给发送服务 | 未确认；无法访问 Auth/SMTP 投递日志 |
| 是否送达收件箱 | 用户确认收件箱和垃圾邮件均未收到 |
| 邮箱验证、登录会话 | 未完成；不能将 HTTP 200 等同于注册/投递/验证成功 |
| 应用侧回调 | 当前运行 APP_URL=http://localhost:3108；emailRedirectTo=http://localhost:3108/auth/confirm |
| 托管 Site URL / Redirect URLs / SMTP / 发送配额 | 公开 Auth 设置不暴露这些配置；无控制台/Management API 权限，未验证、未修改 |

现有项目只具备应用运行所需的公开 Auth 客户端权限，不使用管理员密钥查询用户。由于服务端为防止账号枚举可能掩蔽已有账号，不能凭用户对象或 200 推断一定新建用户。根因尚未由投递日志证实；不得直接断言 SMTP 未配置或地址错误。

原注册路由在 Supabase SDK 返回显式错误时会返回 400/429；本次为 200，因此没有观察到该次请求的同步显式拒绝。已有账号的掩蔽响应、发送服务接受后未投递等仍待管理侧证据区分。Site URL/模板兼容性影响收到邮件后的确认路径，不能据此断言它导致未收到邮件。

本地应用启动日志处于独占锁定状态，没有读取成功；不将日志读取失败解释为“没有错误”。此处的 HTTP 200 来自此前浏览器捕获的响应，而非日志猜测。

## 代码修复

- 注册响应保留 authenticated，并新增明确的 registrationStatus 和 emailDelivery=unverified。未登录时不宣称邮件已发出、账户已创建或邮箱已验证。
- 将 SMTP 收件人限制、邮件发送限额、全局注册关闭及服务端异常映射为独立安全错误类别。失败日志只记录应用类别和状态，不记录邮箱、密码、上游原文或令牌。
- /auth/confirm 同时接受 email token_hash 和标准 PKCE code；仍需主动点击，通过 POST 验证，不在 GET 中自动登录。
- 严格拒绝混合确认方式、过长参数、恢复链接以及 provider error；不接受任意 next 跳转。
- 只有 Supabase 实际返回 session 才报告确认成功。PKCE 缺少同浏览器 verifier 或令牌验证失败时保留明确失败状态。
- 这些修复改善状态表达和收到邮件之后的回调兼容性，并不证明已修复邮件投递。

## 需要项目管理员在控制台核查

1. **Authentication → Users**：查找专用测试邮箱，核对 Created at 与本次请求时间、Email Confirmed 状态。只反馈“是否存在/是否已确认”，无需共享用户详情、密码或链接。
2. **Logs → Auth**（或 Logs Explorer 的 auth_logs 数据源）：查看本次时间前后 /signup 请求，核对错误类别与 SMTP handover 结果。关注 email_address_not_authorized、over_email_send_rate_limit、unexpected_failure、gomail/SMTP、模板解析错误。只反馈脱敏错误类别，不复制带令牌/地址的完整日志。
3. **Authentication → Email → SMTP settings**：[SMTP 控制台](https://supabase.com/dashboard/project/_/auth/smtp)。检查自定义 SMTP 是否启用、发件人域名验证、host/port 与服务商侧投递/退信/抑制日志。所有凭据直接在控制台填写，不发送给开发助手。默认 SMTP 仅允许组织成员邮箱且配额很低；这是待核查的可能限制，并非本次已确认根因。
4. **Authentication → Rate Limits**：[发送限制](https://supabase.com/dashboard/project/_/auth/rate-limits)。检查当前邮件额度、发送间隔和服务商限额，避免反复注册/重发。
5. **Authentication → URL Configuration**：[URL 配置](https://supabase.com/dashboard/project/_/auth/url-configuration)。当前本地验收需允许精确的 http://localhost:3108/auth/confirm。若该项目已有生产站点，保留生产 Site URL，仅添加本地回调；若项目仅用于本地验收，Site URL 可为 http://localhost:3108。不要把回调配置问题当成未投递的既定原因。
6. **Authentication → Email Templates → Confirm signup**：本项目 emailRedirectTo 已包含 /auth/confirm。若使用 token-hash 模板，示例为：

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email">确认邮箱</a>
```

不要再向 .RedirectTo 追加一次 /auth/confirm。若选择标准 PKCE code 跳转，新代码已支持，但必须在发起注册的同一浏览器/设备中交换 code；跨浏览器使用 token-hash 模板更适合现有主动确认流程。不要为绕过问题关闭生产邮箱验证。

## 实际检查结果

- 只读 Auth 设置诊断已执行，无注册、发信、私有用户读取或迁移。
- 浏览器实际渲染确认页：两种回调格式可识别；缺失、恢复和混合参数被禁用；GET 不发起确认请求。
- 显式模拟失败仅用于检查错误提示和重试状态，不作为真实邮箱验证证明。真实 API 的混合确认输入返回 400 INVALID_INPUT，未调用验证服务。
- 新增回归覆盖：请求受理不等于邮件送达、错误脱敏、确认方式选择、实际 session 必需、PKCE 失败、主动点击，以及真实首页草稿保存后的记录刷新。
- 全量 Lint、TypeScript 和生产 Webpack 构建通过；核心组件/契约 23 项、服务端/AI 38 项，共 61 项回归通过。这些回归不等于真实邮箱确认成功。
- 真实供应商诊断另行执行：chat/draft/review 均为 HTTP 200、有实质结果；该诊断使用虚构内容及隔离的认证/数据库 fixture，不等于登录后的保存、授权或阶段回顾 E2E。
- 真实登录、持久化 CRUD、记忆授权/撤回及登录后的阶段回顾仍被邮箱确认阻塞，未冒称通过。

## 官方依据

- [未收到 Auth 邮件的排查顺序](https://supabase.com/docs/guides/troubleshooting/not-receiving-auth-emails-from-the-supabase-project-OFSNzw)
- [默认 SMTP 限制及自定义 SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [signUp 与已有账号的掩蔽响应](https://supabase.com/docs/reference/javascript/auth-signup)
- [回调白名单和邮件模板 RedirectTo](https://supabase.com/docs/guides/auth/redirect-urls)
- [PKCE 的同浏览器 verifier 要求](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
