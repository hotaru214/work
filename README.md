# 课程学习助手 Agent 平台

课程学习助手 Agent 平台是一个面向课程学习与资料整理的 Web 应用。项目将课程管理、资料上传、学习对话、学习计划、知识库和讨论区整合到同一个工作台中，帮助学习者围绕课程内容沉淀资料、拆解任务并持续复盘。

本仓库采用前后端分离架构，适合多人协作开发，也兼容 Codex、Claude Code 等 AI 编程助手参与日常迭代。

## 功能概览

- 用户认证：注册、登录、头像上传、个人资料维护。
- 学习仪表盘：课程、资料、计划、任务和最近对话的概览入口。
- 课程管理：课程列表、课程详情、资料上传、资料预览和下载。
- 课程对话：围绕课程和资料进行学习问答。
- 学习计划：创建阶段目标、设置截止时间和每日投入，跟踪计划状态。
- 知识库：维护笔记结构、正文内容、标签、分享和回收站。
- 讨论区：发布帖子、编辑帖子、评论、点赞、浏览标签和相关内容。
- 第三方集成：预留语雀、Trilium 等知识工具的连接入口。

## 技术栈

前端：

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- motion / animejs
- shadcn 风格组件、Magic UI、Aceternity、React Bits 等组件

后端：

- FastAPI
- SQLAlchemy
- Pydantic
- python-jose
- python-multipart
- pypdf

数据与存储：

- SQLite：本地开发默认可用
- PostgreSQL / Supabase：团队共享环境或部署环境推荐
- 上传文件：默认存储在 `server/uploads/`，通过 `/uploads` 对外访问

## 目录结构

```text
.
├── client/                 # 前端应用
│   ├── src/
│   │   ├── api/            # API 客户端
│   │   ├── components/     # 通用组件
│   │   ├── hooks/          # React hooks 与数据请求 hooks
│   │   ├── pages/          # 页面组件
│   │   ├── router.tsx      # 前端路由
│   │   └── pageLoaders.ts  # 路由懒加载与预加载入口
│   └── vite.config.ts
├── server/                 # 后端应用
│   ├── app/
│   │   ├── routers/        # FastAPI 路由模块
│   │   ├── services/       # 服务层逻辑
│   │   ├── config.py       # 应用配置
│   │   ├── database.py     # 数据库连接与 schema 兼容逻辑
│   │   ├── models.py       # SQLAlchemy 模型
│   │   ├── schemas.py      # Pydantic schema
│   │   └── seed.py         # 初始化数据
│   ├── tests/              # 后端测试
│   └── requirements.txt
├── AGENTS.md               # AI Agent 协作规范
├── CLAUDE.md               # Claude Code 协作规范
└── README.md
```

## 本地开发

### 首次运行

首次运行需要分别安装后端和前端依赖，并初始化环境变量与演示数据。

后端：

```bash
cd server
python -m venv .venv
```

激活虚拟环境：

```bash
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Windows cmd
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

安装依赖、复制配置并初始化数据：

```bash
pip install -r requirements.txt

# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env

python -m app.seed
```

前端：

```bash
cd ../client
npm install
```

### 日常运行

日常开发需要同时启动后端和前端。建议开两个终端窗口分别运行。

终端 1：启动后端

```bash
cd server

# 如未激活虚拟环境，先执行对应平台的激活命令
.\.venv\Scripts\Activate.ps1

uvicorn main:app --reload --port 8000
```

终端 2：启动前端

```bash
cd client
npm run dev
```

默认访问地址：

- 前端：http://localhost:5173
- 后端：http://localhost:8000
- API 文档：http://localhost:8000/docs

### 演示账号

运行 `python -m app.seed` 后可使用默认演示账号登录：

```text
用户名：demo
密码：demo123
```

## 环境变量

后端从 `server/.env` 读取配置。首次启动时复制 `server/.env.example` 后按本地环境调整。

常用配置：

```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=10080
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-v4-pro
UPLOAD_DIR=uploads
```

数据库说明：

- 本地开发可使用 `sqlite:///./app.db`。
- 团队共享或部署环境推荐使用 PostgreSQL / Supabase 连接串。
- 不要提交 `.env`、数据库文件、上传目录或任何密钥。

## 常用命令

前端：

```bash
cd client
npm run dev       # 启动开发服务器
npm run build     # TypeScript 与生产构建检查
npm run analyze   # 构建并生成包体积分析
npm run preview   # 预览生产构建
```

后端：

```bash
cd server
uvicorn main:app --reload --port 8000
python -m app.seed
pytest
```

## API 模块

后端接口统一以 `/api` 为前缀，主要模块包括：

- `/api/auth`
- `/api/dashboard`
- `/api/courses`
- `/api/materials`
- `/api/chat`
- `/api/plans`
- `/api/tasks`
- `/api/posts`
- `/api/comments`
- `/api/tags`
- `/api/yuque`
- `/api/trilium`

完整接口以运行时 Swagger 文档为准：http://localhost:8000/docs

## 开发规范

前端：

- API 请求集中放在 `client/src/api/client.ts`。
- 可复用数据请求逻辑放在 `client/src/hooks/api.ts`。
- 页面路由和懒加载入口维护在 `client/src/router.tsx` 与 `client/src/pageLoaders.ts`。
- 加载态优先复用 `client/src/components/skeleton/`。
- 异步数据优先通过 TanStack Query 管理，变更后使用 query invalidation 更新缓存。
- 页面文案默认使用中文。

后端：

- 路由模块放在 `server/app/routers/`。
- SQLAlchemy 模型放在 `server/app/models.py`。
- Pydantic schema 放在 `server/app/schemas.py`。
- 通用配置放在 `server/app/config.py`。
- 新增或修改接口时保持 REST 语义清晰，并同步更新前端调用。
- 涉及用户数据的接口需要校验当前用户权限。

## 协作流程

多人协作时请遵守以下约定：

1. 开始前先拉取最新代码，并确认当前工作区状态。
2. 修改前阅读相关文件，不覆盖他人未提交改动。
3. 保持改动范围清晰，避免顺手重构无关模块。
4. 前后端契约发生变化时，前端、后端和文档需要同步更新。
5. 提交前运行与改动相关的最小验证命令。
6. 不提交 `.env`、本地数据库、上传文件、构建产物、缓存目录或密钥。

AI 编程助手参与开发时还应阅读：

- `AGENTS.md`
- `CLAUDE.md`

## 质量检查

推荐在提交前运行：

```bash
cd client
npm run build
```

涉及后端模型、接口、服务或数据库逻辑时运行：

```bash
cd server
pytest
```

涉及路由、导航、懒加载、缓存或页面入口时，还需要在浏览器中手动检查主要页面是否能正常进入、刷新和返回。

## Git 忽略建议

以下内容不应进入版本库：

- `.env`
- `server/app.db`
- `server/uploads/`
- `client/dist/`
- `node_modules/`
- Python 虚拟环境和缓存目录
- 日志文件和本地编辑器缓存

具体规则以 `.gitignore` 为准。

## License

当前仓库未声明开源许可证。对外发布或开源前，请先补充许可证和版权说明。
