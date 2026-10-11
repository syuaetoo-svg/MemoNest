# MemoNest｜AI 角色陪伴式生活手帐

AI Companion & Personal Memory Journal

以原创 AI 角色陪伴为入口，将用户授权保存的生活经历转化为个人记忆，并支持时间线整理与 AI 回顾。本项目用于 AI 产品经理求职作品集，按阶段建设完整产品。

## 当前项目状态：第二阶段 B1 可交互 UX 研究原型

已建立 Next.js App Router、TypeScript、Tailwind CSS 和 ESLint 基础，以及手机端优先的四个页面：

| 路径 | 页面 | 当前能力 |
| --- | --- | --- |
| `/` | 小屋首页 | 产品介绍与页面导航 |
| `/chat` | 角色聊天 | 原创角色「小栖」介绍、对话空态 |
| `/journal` | 生活记录 | 记录与授权流程的界面结构 |
| `/memories` | 记忆管理 | 时间线空态与保存边界说明 |

**正式页面尚未接入 AI API、数据库或身份认证。** 对话和记录表单禁用，不生成回复、不提交内容、不保存个人数据；记忆页面没有伪造数据。当前界面结构不表示相关功能已经完成。

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

`lint` 不允许警告，`typecheck` 开启 TypeScript 严格检查，`build` 验证生产构建。已新增 UX Lab 的 Playwright 工程测试；上述基础检查与原型测试均不代表正式聊天、保存等业务功能已经实现或通过测试。

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
    ux-lab/             # 独立研究目录、8 个方案页与局部样式
  components/
    navigation.tsx      # 当前路由导航
    ui.tsx              # 卡片、页面标题、空态、阶段提示
    ux-lab/             # 记录/回顾交互、匿名工具、计时模拟器
  lib/
    navigation.ts       # 导航配置
    ux-lab/fixtures.ts  # 共用虚构素材、版本和任务配置
```

正式页面默认使用 Server Components；路由高亮导航和 UX Lab 交互组件使用 Client Component。统一颜色在 `globals.css` 的 `@theme` 中维护。页面使用系统字体，不依赖外部字体服务。公共组件负责跨页面视觉一致性，页面保留各自的业务结构。

## 安全与数据边界

- 不把真实密钥提交到仓库；`.env*` 默认忽略，仅 `.env.example` 可提交。
- 后续 AI 调用应通过服务器端接口，不向浏览器暴露凭据。
- 记忆保存必须明确授权；后续需实现撤回、删除和用户数据隔离。
- 无分析追踪、AI 请求或数据库写入。

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
| [可用性测试主持指南](docs/USABILITY_TEST_GUIDE.md) | B1 原型入口、同意、顺序、任务、采集口径与空白观察模板 |

主要取舍：手写和聊天是平行入口；自动弹窗只进入研究，轻量卡片要通过测试才启用，主动整理始终保留；回顾先证明能找回原文，再考虑 AI 故事。私人保存不等于授权角色长期记住，私人内容在用户发起单次 AI 处理时另行说明范围。

## 下一阶段建议

使用现有 UX Lab 先试跑两位，再按计划开展六位探索，执行 E1–E3 并记录失败与相反证据；这些人数是计划，不是完成数量。正式比较前补齐平衡材料与实机验证。未通过隐私理解门槛前，不开启真实长期记忆。

工程先做 P0-a：身份与用户隔离、私人生活记录 CRUD、时间线/关键词、错误恢复、幂等与删除闭环。P0-b 再做真实模型选型、角色对话、用户确认提取、逐条长期授权与撤回竞态测试；轻量建议依赖 E2 结果。主题回顾 P1、故事卡 P2 后置，不一次性开发全部功能。
