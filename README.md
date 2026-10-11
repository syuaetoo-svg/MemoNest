# MemoNest · 记忆小屋

AI Companion & Personal Memory Journal

以原创 AI 角色陪伴为入口，将用户授权保存的生活经历转化为个人记忆，并支持时间线整理与 AI 回顾。本项目用于 AI 产品经理求职作品集，按阶段建设完整产品。

## 当前阶段：正式项目初始化

已建立 Next.js App Router、TypeScript、Tailwind CSS 和 ESLint 基础，以及手机端优先的四个页面：

| 路径 | 页面 | 当前能力 |
| --- | --- | --- |
| `/` | 小屋首页 | 产品介绍与页面导航 |
| `/chat` | 角色聊天 | 原创角色「小栖」介绍、对话空态 |
| `/journal` | 生活记录 | 记录与授权流程的界面结构 |
| `/memories` | 记忆管理 | 时间线空态与保存边界说明 |

**尚未接入 AI API、数据库或身份认证。** 对话和记录表单禁用，不生成回复、不提交内容、不保存个人数据；记忆页面没有伪造数据。当前界面结构不表示相关功能已经完成。

## 本地开发

推荐 Node.js 24 LTS、npm 11。依赖版本由 `package-lock.json` 锁定。

```bash
npm ci
npm run dev
```

在本机浏览器访问 `http://localhost:3000`。开发服务器绑定 `0.0.0.0`；部署或云端预览需使用平台支持的端口转发。目前没有环境变量要求，`.env.example` 仅记录此约定。

若环境的默认 npm 缓存目录不可写，可以使用：

```bash
npm ci --cache /tmp/memonest-npm-cache
```

## 质量检查与生产运行

```bash
npm run lint
npm run typecheck
npm run build
npm run start
```

`lint` 不允许警告，`typecheck` 开启 TypeScript 严格检查，`build` 验证生产构建。当前没有自动化单元或端到端测试套件；这些命令不代表聊天、保存等业务功能已通过测试。

安装提示：当前 Next.js ESLint 插件链的 peer dependency 范围仍限定 ESLint 9，因此暂使用兼容的 9.39.5。npm 会提示该版本已停止维护；待插件链支持 ESLint 10 后再整体升级，避免强制忽略依赖兼容性。

## 项目结构

```text
src/
  app/
    globals.css         # Tailwind、设计 token 与基础样式
    layout.tsx          # 全局布局、导航、元数据
    page.tsx            # 首页
    chat/page.tsx       # 角色聊天
    journal/page.tsx    # 生活记录
    memories/page.tsx   # 记忆管理
  components/
    navigation.tsx      # 当前路由导航
    ui.tsx              # 卡片、页面标题、空态、阶段提示
  lib/
    navigation.ts       # 导航配置
```

默认使用 Server Components；仅路由高亮导航使用 Client Component。统一颜色在 `globals.css` 的 `@theme` 中维护。页面使用系统字体，不依赖外部字体服务。公共组件负责跨页面视觉一致性，页面保留各自的业务结构。

## 安全与数据边界

- 不把真实密钥提交到仓库；`.env*` 默认忽略，仅 `.env.example` 可提交。
- 后续 AI 调用应通过服务器端接口，不向浏览器暴露凭据。
- 记忆保存必须明确授权；后续需实现撤回、删除和用户数据隔离。
- 无分析追踪、AI 请求或数据库写入。

## 下一阶段建议

先明确用户与数据模型，接入身份认证和持久化生活记录，实现可验证的新增、查询、修改、删除与授权保存流程，配套功能测试。再接入真实 AI 对话、受控记忆提取、时间线及 AI 回顾；避免一次性展开全部功能。
