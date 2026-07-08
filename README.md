# 课程学习助手 Agent 平台

一个面向课程学习的工作台：把课程资料、学习对话、学习计划、知识库、讨论区和个人资料集中到同一个应用里。前端侧重清爽、严肃但有质感的交互体验；后端提供 FastAPI REST 接口和本地/远程数据库支持。

## 技术栈

- 前端：React 18、TypeScript、Vite、Tailwind CSS、React Router、TanStack Query
- UI 与动效：motion、animejs、lucide-react、Tabler Icons、shadcn 风格组件
- 后端：FastAPI、SQLAlchemy、Pydantic、python-jose
- 数据库：本地 SQLite，团队/部署环境可切换 PostgreSQL 或 Supabase
- 文件：上传文件保存在 `server/uploads/`，通过 `/uploads` 访问

## 主要功能

- 登录注册、头像上传、个人资料
- 仪表盘、课程管理、资料上传/预览/下载
- 课程对话、学习计划、任务管理
- 知识库目录、富文本/Markdown 编辑、标签、分享、回收站
- 讨论区帖子、评论、点赞、标签和相关帖子
- 语雀与 Trilium 连接入口

## 快速启动

后端：

```bash
cd server
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
copy .env.example .env
python -m app.seed
uvicorn main:app --reload --port 8000
```

PowerShell 也可以使用：

```powershell
.\.venv\Scripts\Activate.ps1
```

前端：

```bash
cd client
npm install
npm run dev
```

默认地址：

- 前端：http://localhost:5173
- 后端：http://localhost:8000
- Swagger：http://localhost:8000/docs

演示账号：

```text
用户名：demo
密码：demo123
```

## 环境变量

后端读取 `server/.env`，从 `server/.env.example` 复制即可。

本地 SQLite：

```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=10080
LLM_PROVIDER=mock
UPLOAD_DIR=uploads
```

远程 PostgreSQL/Supabase：

```env
DATABASE_URL=postgresql://...
```

不要提交 `.env`、数据库文件、上传文件、构建产物或密钥。

## 常用命令

前端：

```bash
cd client
npm run dev
npm run build
npm run analyze
```

后端：

```bash
cd server
uvicorn main:app --reload --port 8000
python -m app.seed
pytest
```

## 开发约定

- 前端 API 请求放在 `client/src/api/client.ts`。
- TanStack Query hooks 放在 `client/src/hooks/api.ts`。
- 页面动态导入统一放在 `client/src/pageLoaders.ts`，需要 hover/focus 预加载时复用这些 loader。
- 页面结构优先复用 `client/src/components/PageScaffold.tsx`。
- 加载态、错误边界、Toast、骨架屏和本地草稿逻辑不要随意绕开。
- 大列表或树形内容优先使用虚拟列表。
- UI 文案默认使用中文。
- 后端路由在 `server/app/routers/`，模型在 `server/app/models.py`，schema 在 `server/app/schemas.py`。
- 修改前后端契约时，两边必须同步更新。

## 验证要求

- 前端改动：`cd client && npm run build`
- 后端接口、模型或服务改动：`cd server && pytest`
- 路由、懒加载、预加载、缓存或页面入口交互改动后，还要在浏览器里从侧边导航和页面内链接各切换一次，确认没有空白页、错误边界或明显重复请求。

## 协作

本仓库同时供人类开发者和 AI 编程助手协作。开始任务前阅读：

- `AGENTS.md`
- `CLAUDE.md`

核心原则：不覆盖他人未提交改动，不提交本地私有文件，保持改动范围清晰，完成后说明改了什么和验证了什么。
