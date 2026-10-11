# B2 核心全栈实现与验收边界

本文件描述 B2 代码；第二阶段 A 文档保留原始设计提案，B1 `/ux-lab` 仍是隔离的研究原型。真实服务验证结果以本次交付报告为准，不把测试身份夹具当真实认证。

## 实现范围与取舍

- 沿用 Next.js App Router、TypeScript、Tailwind。Supabase Auth 管理密码与会话，Supabase PostgreSQL 存储记录和精确授权。
- User 使用 `auth.users`，本阶段不另建用户画像表。不创建 Conversation、Message 或 AI 队列，没有真实模型调用。
- 手写 → 预览 → 私人保存 → 10 秒撤销入口 → 详情编辑/删除 → 单独填写摘要并授权小栖。
- 标题可空，正文 1–10000 字符，日期 1900–2100 年。列表按事件日期、创建时间、ID 倒序，每页 30 条；关键词按原文大小写无关的子串匹配，`%` 不作通配符，不宣称中文语义检索。
- 草稿仅当前页面内存，失败保留输入、相同请求重试使用同一 UUID；离开提示丢失。浏览器前进/后退和强制关闭的确认受浏览器能力限制，不承诺恢复草稿。
- 改原记录：乐观版本检查，同事务撤回旧授权、清摘要。改授权摘要：用户重新确认，新 Memory/GRANT，旧授权失效。撤回不删记录；删除原记录清正文/事件日期并撤回派生授权。
- 源记录锁优先于记忆锁；授权、撤回、编辑和删除有统一锁顺序。无向量索引或异步任务，本阶段不用 outbox；以后增加任务时必须补齐版本栅栏。

## 身份和数据隔离

浏览器 → 同源 Next.js Route Handler → `auth.getUser()` 验证真实身份 → 校验输入 → 带用户 JWT 的 Supabase 请求 → PostgreSQL。

应用只用 publishable/anon key，**不使用 service_role**。所有环境变量在 server-only 模块读取，浏览器无 Supabase SDK 客户端、令牌 localStorage 或数据库凭证；认证会话保存在 HttpOnly、SameSite=Lax Cookie，生产 Secure。proxy 刷新正式数据页面会话，不应用到 UX Lab。

接口有 no-store，数据页动态渲染；写请求校验 Origin 等于 APP_URL，大小限制 64 KiB。业务写及退出会话还要求 `X-MemoNest-User` 等于服务端验证的用户 ID，用于拒绝同一浏览器其他标签切换账号后的旧草稿。该头不代替身份验证，也不能提升权限。恢复焦点时检查会话变化并卸载私人视图。

Supabase JWT/刷新令牌寿命由服务配置控制；全局退出清本浏览器 Cookie、撤销刷新会话，已签发访问 JWT 的绝对失效时间仍受供应商 JWT expiry 控制，不承诺被复制的令牌即时失效。生产应采用合适的较短 JWT 时间，核实供应商会话策略。

数据库防御：owner RLS、复合归属外键、认证角色只读表；所有写通过固定 search_path 的受限事务函数。撤回内部函数不给 authenticated/anon 执行权限。对象不存在或越权统一 NOT_FOUND，不暴露另一用户对象存在性。

## 接口契约

写请求 JSON，Origin 必须精确匹配 APP_URL。业务写提供 `X-MemoNest-User`。接口不接受客户端 `user_id`。

| 接口 | 内容 / 返回 |
| --- | --- |
| POST `/api/auth/signup` | email、password；真实注册，必要时提示确认邮件 |
| POST `/api/auth/login` | email、password；真实会话 Cookie |
| GET `/api/auth/session` | 服务端验证后只返回当前 userId |
| POST `/api/auth/logout` | 退出所有刷新会话 |
| POST `/api/auth/confirm` | tokenHash；主动确认邮件 OTP，不在 GET 中自动登录 |
| GET `/api/journal-entries?q=&cursor=` | 私人记录与下一页游标 |
| POST `/api/journal-entries` | title、body、eventDate、requestId；私人保存，不产生授权 |
| GET `/api/journal-entries/:id` | 当前用户的活记录 |
| PATCH `/api/journal-entries/:id` | title、body、eventDate、expectedVersion |
| DELETE `/api/journal-entries/:id` | expectedVersion；UI 二次确认后删除 |
| GET `/api/memories?entryId=&cursor=` | 授权与已清摘要的失效元信息 |
| POST `/api/memories` | entryId、sourceVersion、summary、requestId、confirmed=true |
| PATCH `/api/memories/:id` | 同授权字段 + expectedMemoryVersion；重新授权精确摘要 |
| POST `/api/memories/:id/revoke` | 撤回且清在线摘要，保留私人记录 |
| GET `/api/memories/context` | 仅有效、当前小栖、源版本和匹配 GRANT/hash、无 REVOKE 的摘要；不读取私人全文、不调用 AI |

401 表示需登录；404 表示不存在或无权；409 表示版本/账号/幂等冲突或撤销窗口；503 表示配置/外部服务不可用。缺少服务时不是登录成功，不返回伪造空数据库。原始数据库错误、密码、文本和密钥不写应用日志。

## 部署与上线前事项

按 [README](../README.md) 配置托管或真实本地 Supabase，并应用迁移。邮件必须使用自己控制的 SMTP 和确认模板，启用注册速率限制与适合部署的反滥用策略；这不是默认已经上线的生产服务。

删除会立即清在线正文/有效摘要，最小 tombstone 与失效审计用于阻止重放。`supabase/maintenance.sql` 提供超过 90 天清理的运维函数，需管理员实际执行/调度，不宣称已经自动运行。有效 GRANT 不按失效保留期删除。Supabase 备份、恢复后的撤回重放和部署地区需另行配置评估；当前不承诺备份 30 天或逐条即时擦除。

无 AI 供应商、无正文遥测、无生产运营数据与 UX Lab 研究日志混用；没有真实用户研究结论。

## 验证分层

1. `test:server` 校验配置拒绝、CSRF 与请求限制；`test:core`：输入契约和嵌入式 PostgreSQL 迁移/RLS/事务。测试建立临时 auth.uid/users 夹具，不证明真实注册。
2. `test:core:browser`：未配置时的诚实页面、接口拒绝、手机桌面布局。
3. `test:core:live`：仅显式连接真实本地 Supabase 后运行；自动注册 A/B、刷新后读取、编辑/删除、直接接口越权、授权与撤回、退出、响应式。没有配置则明确失败，不静默跳过或通过。
4. `test:ux`：既有研究原型回归，不代表生产业务或研究结论。

托管环境邮件确认、真实设备软键盘/屏幕阅读器、供应商地区与备份恢复、跨设备持久化需要另行验收。自动化虚构测试账号与事件不是用户数据或参与者反馈。

### 本次 B2 实际执行结果

| 检查 | 实际结果与范围 |
| --- | --- |
| npm ci、lint、typecheck、build | 通过；依赖安装、严格检查与生产构建 |
| test:server | 4 通过：配置、同源、请求上限、错误脱敏与账号标记 |
| test:core | 14 通过（含父/子测试）：输入、mock 组件、PostgreSQL 权限和事务；不是真实认证 |
| test:core:browser | 桌面/手机共 4 通过：未配置页、接口诚实拒绝、保留路由 |
| test:ux | 首轮 36 通过，2 因并行套件共享追踪目录在 teardown 失败；分离目录后仅复测失败 2 项，均通过 |
| test:core:live | 配置检查退出，未执行测试：没有真实本地 Supabase URL/key；服务启动被 public.ecr.aws Forbidden 阻塞 |

未完成外部服务注册/邮件确认、登录后的刷新持久化与跨用户浏览器端到端验收，不宣称这些通过。测试不包含真实访谈或生产用户数据。
