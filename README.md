# 课程学习助手 Agent 平台

大型程序设计实践 2026 课题项目。详见 `docx/大型程序设计实践2026.pdf`（第 28-29 页）。

## 目录结构

```
.
├── client/   # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── api/client.ts        # 统一 fetch 封装 + 所有 API 方法
│       ├── components/           # Layout / ProtectedRoute / SideRays 背景
│       ├── contexts/             # SidebarContext
│       ├── pages/                # Login / Courses / CourseDetail / Chat / Plan / Profile / Dashboard
│       │   ├── kb/                #   知识库相关页面（KBList / KBDetail / DocEditor / TriliumDetail）
│       │   ├── forum/             #   论坛 WIP（未接入 router）
│       │   └── explore/           #   探索页 WIP（未接入 router）
│       ├── utils/markdown.ts     # md <-> html 转换
│       └── router.tsx
└── server/   # FastAPI + SQLAlchemy + SQLite
    └── app/
        ├── routers/
        │   ├── core/              # auth / courses / materials / chat / plans / tasks
        │   ├── forum/             # posts / comments / tags
        │   ├── kb/                # notebooks / knowledge_base
        │   ├── integrations/      # yuque / trilium
        │   └── misc/              # dashboard
        ├── services/              # llm / retrieval / yuque_client / trilium_client
        ├── models.py / schemas.py / security.py / config.py / database.py / seed.py
        └── ...
```

## 启动后端

```bash
cd server
python -m venv .venv && source .venv/Scripts/activate    # Windows Git Bash
pip install -r requirements.txt
cp .env.example .env      # 可选
python -m app.seed         # 建表 + 种子数据 demo/demo123, 3 门课程
uvicorn main:app --reload --port 8000
```

OpenAPI 文档：http://localhost:8000/docs

## 启动前端

```bash
cd client
npm install
npm run dev
```

打开 http://localhost:5173 ，使用 `demo / demo123` 登录。
Vite 已配置 `/api` 代理到 `http://localhost:8000`，无需 CORS。

## 功能模块

### 核心模块（已接入主路由）
- **认证**：JWT 登录/注册，登录页支持显示/隐藏密码、loading 态、注册入口
- **课程管理**：课程 CRUD，每门课含资料、对话入口
- **课程资料**：上传/下载/删除文件，类型标注
- **Agent 对话**：会话列表 + 消息流，调服务端 mock LLM；后续接真实大模型只需替换 `app/services/llm.py`
- **学习计划**：目标 + 截止时间 + 每日可用时间
- **个人中心**：用户信息 + 待办任务（增删 / 完成态切换）
- **仪表盘**：`/dashboard`，汇总数据展示
- **知识库**：`/kb`，富文本文档树 + 编辑器，支持 markdown 与富文本互转
- **SideRays 背景**：登录页动画点阵背景（`components/SideRays.tsx` + `.css`）

### 外部集成（无后端入口的 proxy 路由）
- **语雀** (`/api/yuque/*`)：前端通过 `X-Yuque-Token` 头转发，后端 `services/yuque_client.py`
- **Trilium Notes** (`/api/trilium/*`)：前端通过 `X-Trilium-Url` / `X-Trilium-Token` 头转发，后端 `services/trilium_client.py`

### WIP（未接入 router）
- `pages/forum/`：论坛列表、帖子详情、帖子编辑
- `pages/explore/`：公开知识探索
- 后端 `routers/forum/`（posts、comments、tags）已就绪，待前端接入

## 主要 API 一览

按模块分组，详见 `http://localhost:8000/docs`：

- **core**: `/api/auth/*` `/api/courses/*` `/api/materials/*` `/api/chat/*` `/api/plans/*` `/api/tasks/*`
- **forum**: `/api/posts/*` `/api/comments/*` `/api/tags/*`
- **kb**: `/api/notebooks/*` `/api/kb/*`
- **integrations**: `/api/yuque/*` `/api/trilium/*`
- **misc**: `/api/dashboard/*`

## Agent 与资料检索

`server/app/services/llm.py` 与 `retrieval.py` 为抽象层，当前为 mock 实现。
后续接入真实大模型 / 向量库只需替换这两个文件，路由无需改动。