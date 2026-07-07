# 课程学习助手 Agent 平台

面向课程学习场景的一体化学习助手。项目把课程资料、对话问答、学习计划、知识库、讨论区和个人资料放在同一个工作台里，适合个人本地使用，也适合小组协作继续扩展。

前端使用 React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query。后端使用 FastAPI + SQLAlchemy + Pydantic。开发环境默认可用 SQLite 快速启动，共享环境可切换到 PostgreSQL 或 Supabase。

## 功能概览

- 账户与资料：注册、登录、JWT 鉴权、头像上传、昵称修改、个人中心。
- 仪表盘：汇总课程、任务、学习计划和近期动态。
- 课程与资料：课程列表、课程详情、资料上传、预览、下载和删除确认。
- 课程对话：按课程创建学习对话，支持会话列表、消息记录和相关帖子入口。
- 学习计划：创建目标、设置截止时间和每日投入，支持计划删除确认。
- 知识库：目录树、富文本/Markdown 编辑、标签、分享、回收站和本地草稿。
- 讨论区：帖子列表、发帖、详情、评论、点赞、标签和相关帖子。
- 外部知识库：语雀与 Trilium 连接入口。
- 前端体验：路由懒加载、TanStack Query 缓存、骨架屏、Error Boundary、Toast、Hover Prefetch、虚拟列表、Autosave Draft 和 Bundle Analyzer。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端 | React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query |
| UI 动效 | motion, animejs, lucide-react, Tabler Icons, shadcn 风格组件 |
| 后端 | FastAPI, SQLAlchemy, Pydantic, python-jose |
| 数据库 | SQLite 本地开发, PostgreSQL/Supabase 共享部署 |
| 文件上传 | `server/uploads/`, 通过 `/uploads` 静态访问 |

## 目录结构

```text
.
├── client/                 # 前端应用
│   ├── src/api/            # API 客户端
│   ├── src/components/     # 公共组件、布局、动效组件
│   ├── src/hooks/          # TanStack Query hooks 和业务 hooks
│   ├── src/pages/          # 页面
│   └── vite.config.ts      # Vite、代理、manualChunks、分析配置
├── server/                 # 后端服务
│   ├── app/config.py       # 环境配置
│   ├── app/database.py     # 数据库连接和兼容逻辑
│   ├── app/models.py       # SQLAlchemy 模型
│   ├── app/routers/        # REST API 路由
│   ├── app/schemas.py      # Pydantic schema
│   ├── app/seed.py         # 演示数据
│   ├── main.py             # FastAPI 入口
│   └── uploads/            # 本地上传文件
├── AGENTS.md               # AI 协作规范
├── CLAUDE.md               # Claude Code 协作规范
└── README.md
```

## 快速启动

### 1. 启动后端

```bash
cd server
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
copy .env.example .env
python -m app.seed
uvicorn main:app --reload --port 8000
```

PowerShell 如果不能执行 `activate`，使用：

```powershell
.\.venv\Scripts\Activate.ps1
```

后端地址：

- API 根路径：http://localhost:8000
- Swagger 文档：http://localhost:8000/docs
- 上传文件静态路径：http://localhost:8000/uploads

### 2. 启动前端

另开一个终端：

```bash
cd client
npm install
npm run dev
```

前端默认地址：http://localhost:5173

演示账号：

```text
用户名：demo
密码：demo123
```

## 环境变量

后端读取 `server/.env`。建议从 `server/.env.example` 复制后再修改。

本地快速开发可使用 SQLite：

```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=10080
LLM_PROVIDER=mock
UPLOAD_DIR=uploads
```

共享环境可使用 PostgreSQL 或 Supabase：

```env
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

注意：

- 不要提交真实 `.env`、数据库文件、上传文件或密钥。
- 切换数据库后建议重新执行 `python -m app.seed`。
- `UPLOAD_DIR` 默认相对 `server/` 目录，文件会通过 `/uploads` 暴露给前端。

## 常用命令

### 前端

```bash
cd client
npm run dev        # 本地开发
npm run build      # TypeScript 检查 + 生产构建
npm run preview    # 预览生产构建
npm run analyze    # 生成包体积分析
```

### 后端

```bash
cd server
uvicorn main:app --reload --port 8000
python -m app.seed
pytest
```

## API 分组

后端统一挂载在 `/api` 下，实际接口以 Swagger 文档为准。

- `/api/auth`：注册、登录、当前用户、头像上传。
- `/api/courses`：课程。
- `/api/materials`：课程资料上传、下载、删除。
- `/api/chat`：课程对话和消息。
- `/api/plans`：学习计划。
- `/api/tasks`：任务。
- `/api/dashboard`：仪表盘汇总。
- `/api/posts`：讨论区帖子。
- `/api/comments`：评论。
- `/api/tags`：标签。
- `/api/kb`、`/api/kb/notes`：知识库。
- `/api/yuque`：语雀集成。
- `/api/trilium`：Trilium 集成。

## 前端开发约定

- API 请求统一放在 `client/src/api/client.ts`。
- 复用数据访问逻辑优先放在 `client/src/hooks/api.ts`。
- 路由页面保持懒加载，见 `client/src/router.tsx`。
- 加载态优先复用 `client/src/components/skeleton/`。
- 异常态优先使用现有 `ErrorBoundary` 和 Toast。
- 页面结构优先复用 `client/src/components/PageScaffold.tsx` 的 `PageShell`、`Surface`、`MetricCard`、`EmptyState` 等组件。
- 列表卡片和按钮需要有清晰 hover/focus/active 状态。
- 详情入口尽量加 hover/focus prefetch，减少页面切换等待。
- 长列表或树形结构优先使用虚拟列表。
- 编辑器类页面需要保留本地草稿或自动保存行为。
- UI 文案默认使用中文。

## 后端开发约定

- 路由模块位于 `server/app/routers/`。
- SQLAlchemy 模型位于 `server/app/models.py`。
- Pydantic schema 位于 `server/app/schemas.py`。
- 配置统一位于 `server/app/config.py`。
- 新增接口时保持 REST 方法语义清晰。
- 涉及用户资源时需要校验登录态和资源归属。
- 上传逻辑需要考虑文件名、存储路径和清理策略。
- 保持 SQLite 本地开发可用，除非任务明确要求 PostgreSQL 专用能力。

## 开发与验证流程

修改前：

```bash
git status --short
```

前端改动后：

```bash
cd client
npm run build
```

后端模型、接口或服务改动后：

```bash
cd server
pytest
```

文档或配置改动后，至少检查 README、`.env.example` 和实际启动命令是否一致。

## 常见问题

### 前端请求 404 或 Network Error

确认后端已经启动在 8000 端口：

```bash
curl http://localhost:8000
```

确认前端通过 Vite 启动并访问 `http://localhost:5173`。开发环境下 `/api` 和 `/uploads` 会由 `client/vite.config.ts` 代理到后端。

### 数据库连接失败

本地开发先使用 SQLite：

```env
DATABASE_URL=sqlite:///./app.db
```

使用 PostgreSQL/Supabase 时，检查连接串、密码、网络、连接池端口和 SSL 要求。

### 没有演示数据

执行：

```bash
cd server
python -m app.seed
```

脚本会创建 `demo/demo123` 和三门示例课程。

### 依赖安装慢

可以临时使用国内镜像：

```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
npm install --registry=https://registry.npmmirror.com
```

## 协作说明

本仓库同时供人类开发者和 AI 编程助手协作。开始任务前请阅读：

- `AGENTS.md`
- `CLAUDE.md`

核心原则：

- 不重置或覆盖他人未提交改动。
- 不提交 `.env`、数据库、上传文件、构建产物、缓存或 `node_modules`。
- 同时改前后端合同时，需要同步更新两侧。
- 完成后报告改动内容、验证命令和剩余风险。
