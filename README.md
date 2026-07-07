# 课程学习助手 Agent 平台

面向课程学习场景的一体化学习助手。项目提供课程与资料管理、课程对话、学习计划、知识库、讨论区和个人资料等功能，前端使用 React + Vite，后端使用 FastAPI + SQLAlchemy。

## 功能概览

- 账户系统：注册、登录、JWT 鉴权、个人资料与头像管理。
- 仪表盘：汇总课程、任务、学习计划和近期动态。
- 课程管理：课程增删改查，课程资料上传、预览、下载和删除。
- 课程对话：按课程创建对话，支持基于资料内容的问答入口。
- 学习计划：维护学习目标、截止时间和任务进度。
- 知识库：知识库目录、富文本/Markdown 编辑、标签、回收站、分享链接。
- 讨论区：帖子发布、详情、评论、点赞、标签和相关帖子。
- 前端体验优化：路由懒加载、TanStack Query 缓存、骨架屏、Error Boundary、Toast、Hover Prefetch、知识库虚拟列表、本地草稿和 Bundle Analyzer。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端 | React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query |
| 后端 | FastAPI, SQLAlchemy, Pydantic, python-jose |
| 数据库 | 默认支持 SQLite，本地/团队环境可切换 PostgreSQL/Supabase |
| 文件存储 | 后端本地 `uploads/` 目录 |

## 目录结构

```text
.
├── client/                 # 前端应用
│   ├── src/api/            # API 客户端
│   ├── src/components/     # 公共组件
│   ├── src/hooks/          # Query hooks 和业务 hooks
│   ├── src/pages/          # 页面
│   └── vite.config.ts      # Vite 配置、manualChunks、分析配置
├── server/                 # 后端服务
│   ├── app/models.py       # SQLAlchemy 模型
│   ├── app/routers/        # REST API 路由
│   ├── app/services/       # LLM、检索等服务层
│   ├── app/seed.py         # 演示数据初始化
│   └── main.py             # FastAPI 入口
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

PowerShell 如果不能执行 `activate`，可以改用：

```powershell
.\.venv\Scripts\Activate.ps1
```

后端启动后访问：

- API 根路径：http://localhost:8000
- Swagger 文档：http://localhost:8000/docs

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

后端读取 `server/.env`。常用配置如下：

```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=10080
LLM_PROVIDER=mock
UPLOAD_DIR=uploads
```

如果使用 Supabase/PostgreSQL，将 `DATABASE_URL` 改为 PostgreSQL 连接串：

```env
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

本地开发使用 SQLite 即可；切换数据库后建议重新执行一次：

```bash
cd server
python -m app.seed
```

## 常用命令

### 前端

```bash
cd client
npm run dev        # 本地开发
npm run build      # TypeScript 检查 + 生产构建
npm run preview    # 预览生产构建
npm run analyze    # 构建并生成 dist/stats.html 包体积报告
```

### 后端

```bash
cd server
uvicorn main:app --reload --port 8000
python -m app.seed
pytest
```

## API 分组

后端路由统一挂在 `/api` 下：

- `/api/auth`：注册、登录、当前用户
- `/api/courses`：课程
- `/api/materials`：资料上传、下载、预览
- `/api/chat`：课程对话
- `/api/plans`：学习计划
- `/api/tasks`：任务
- `/api/posts`：讨论区帖子
- `/api/comments`：评论
- `/api/tags`：标签
- `/api/dashboard`：仪表盘
- `/api/kb`、`/api/kb/notes`：知识库
- `/api/yuque`、`/api/trilium`：第三方知识库集成入口

完整接口以 http://localhost:8000/docs 为准。

## 开发说明

- 前端开发接口通过 Vite proxy 转发到 `http://localhost:8000`，见 `client/vite.config.ts`。
- 登录态保存在浏览器本地，后端通过 JWT 校验请求。
- 上传文件默认保存在 `server/uploads/`，并通过 `/uploads` 静态路径访问。
- 前端数据请求优先使用 `client/src/hooks/api.ts` 中的 TanStack Query hooks，避免页面内重复写请求和缓存逻辑。
- 新增页面时优先使用路由懒加载、骨架屏和 Error Boundary 的现有模式。

## 常见问题

### 前端请求 404 或 Network Error

先确认后端已经启动在 `8000` 端口：

```bash
curl http://localhost:8000
```

再确认前端通过 `npm run dev` 启动，且访问的是 Vite 地址 `http://localhost:5173`。

### 数据库连接失败

本地开发建议先用 SQLite：

```env
DATABASE_URL=sqlite:///./app.db
```

如果使用 PostgreSQL/Supabase，确认连接串、密码、网络和 SSL 参数正确。

### 没有演示数据

执行：

```bash
cd server
python -m app.seed
```

### 依赖安装慢

可以临时使用国内镜像：

```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
npm install --registry=https://registry.npmmirror.com
```
