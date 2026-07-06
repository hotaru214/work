# 课程学习助手 Agent 平台

大型程序设计实践 2026 课题项目。详见 `docx/大型程序设计实践2026.pdf`（第 28-29 页）。

一个面向大学生的课程学习助手 Agent 平台：管理课程与资料、Agent 问答、学习计划、待办任务、知识库、论坛、外部笔记集成（语雀 / Trilium），以及围绕学习行为数据的仪表盘。

## 目录结构

```
.
├── client/   # React + Vite + TypeScript + Tailwind + animejs + motion + ogl
│   └── src/
│       ├── api/client.ts          # 统一 fetch 封装 + 全部 API 方法 + token 管理
│       ├── components/
│       │   ├── Layout.tsx           # 侧边栏 + Outlet 主布局
│       │   ├── ProtectedRoute.tsx  # 未登录跳走 /login
│       │   ├── BorderGlow.tsx      # 边缘光晕卡片容器（登录卡片用）
│       │   ├── GlareHover.tsx      # 鼠标悬停光扫效果
│       │   ├── GooeyNav.tsx        # 粒子融合导航
│       │   ├── SideRays.tsx        # WebGL 点阵波动背景
│       │   └── ui/                  # shadcn CLI 拉下来的组件（interactive-hover-button 等）
│       ├── contexts/SidebarContext.tsx  # 侧边栏开合状态
│       ├── lib/utils.ts           # cn 工具
│       ├── pages/
│       │   ├── Login.tsx            # 登录/注册切换 + 头像 + 显示密码 + 切换非线性动画
│       │   ├── Dashboard.tsx        # /dashboard 学习数据总览
│       │   ├── Courses.tsx / CourseDetail.tsx
│       │   ├── Chat.tsx             # Agent 对话
│       │   ├── Plan.tsx / Profile.tsx
│       │   ├── kb/                  # 知识库（KBList / KBDetail 含文档树编辑器）
│       │   ├── forum/               # 论坛（ForumList / PostDetail / PostEditor，WIP）
│       │   └── explore/             # 公开知识探索（WIP）
│       ├── utils/markdown.ts       # md ↔ html 互转
│       └── router.tsx
└── server/   # FastAPI + SQLAlchemy + SQLite
    └── app/
        ├── routers/
        │   ├── core/              # auth / courses / materials / chat / plans / tasks
        │   ├── forum/             # posts / comments / tags
        │   ├── kb/                # notebooks / knowledge_base
        │   ├── integrations/      # yuque / trilium（外部笔记代理）
        │   └── misc/              # dashboard
        ├── services/              # llm / retrieval / yuque_client / trilium_client
        ├── database.py            # engine + SQLite 轻量级 schema 补丁（nickname / avatar_url）
        ├── models.py / schemas.py / security.py / config.py / seed.py
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
上传文件目录 `server/uploads/` 由 `main.py` 挂载到 `/uploads/*` 静态服务。

## 启动前端

```bash
cd client
npm install
npm run dev
```

打开 http://localhost:5173 ，使用 `demo / demo123` 登录。
Vite 已配置 `/api` / `/uploads` 代理到 `http://localhost:8000`，无需 CORS。

## 功能模块

### 已接入主路由
- **认证**：JWT 登录/注册；登录页切换动画（容器高度用 cubicBezier 非线性过渡，子元素 stagger 入场）；密码显示/隐藏小眼睛；注册两段密码一致校验；注册可上传头像（`/api/auth/register/avatar` + `/uploads/avatars/`）
- **仪表盘**：`/dashboard`，学习数据汇总
- **课程管理**：课程 CRUD，每门课有资料、对话入口、关联讨论
- **课程资料**：上传 / 下载 / 删除文件，类型标注，下载直链
- **Agent 对话**：会话列表 + 消息流；后端 `services/llm.py` 为 mock，接真实大模型只需替换该文件
- **学习计划**：目标 + 截止时间 + 每日可用时间
- **个人中心**：用户信息（含头像 / 昵称）+ 待办任务（增删 / 完成态）
- **知识库**：`/kb`，富文本文档树 + 编辑器，支持 markdown 与富文本互转
- **登录页视觉**：BorderGlow 卡片 + SideRays 点阵波动背景 + 切换非线性动画 + Interactive Hover Button

### 外部集成（后端代理）
- **语雀** (`/api/yuque/*`)：前端 `X-Yuque-Token` 头转发，`services/yuque_client.py`
- **Trilium Notes** (`/api/trilium/*`)：前端 `X-Trilium-Url` / `X-Trilium-Token` 头转发，`services/trilium_client.py`

### WIP（未接入 router）
- `pages/forum/`：帖子列表、详情、编辑
- `pages/explore/`：公开知识探索
- 后端 `routers/forum/`（posts、comments、tags）已就绪，待前端接入

## 可视化 / 动效组件

| 组件 | 用途 | 来源 |
| --- | --- | --- |
| `BorderGlow.tsx` | 边缘光晕卡片容器 | Aceternity 风格 copy-paste |
| `GlareHover.tsx` | 鼠标悬停光扫 | Aceternity 风格 copy-paste |
| `GooeyNav.tsx` | 粒子融合导航 | Aceternity 风格 copy-paste |
| `SideRays.tsx` | WebGL 点阵波动背景 | 基于 ogl 自实现 |
| `ui/interactive-hover-button.tsx` | 文字滑动悬停按钮 | shadcn CLI 拉 Magic UI |

`components.json` 已注册 Aceternity / Magic UI / react-bits 三个第三方 registry，可继续 `npx shadcn@latest add @xxx/yyy` 拉新组件。

## 主要 API 一览

按模块分组，详见 `http://localhost:8000/docs`：

- **core**: `/api/auth/*` `/api/courses/*` `/api/materials/*` `/api/chat/*` `/api/plans/*` `/api/tasks/*`
- **forum**: `/api/posts/*` `/api/comments/*` `/api/tags/*`
- **kb**: `/api/notebooks/*` `/api/kb/*`
- **integrations**: `/api/yuque/*` `/api/trilium/*`
- **misc**: `/api/dashboard/*`
- **静态资源**: `/uploads/avatars/*` 用户头像，`/uploads/course_*/*` 课程资料

## Agent 与资料检索

`server/app/services/llm.py` 与 `retrieval.py` 为抽象层，当前为 mock 实现。
- `LLMClient.chat(history, context)` → 基于课程资料上下文的回复
- `LLMClient.summarize(title, content)` / `suggest(...)` → 文档摘要 / 改进建议
- `retrieval.search(course_id, query, k)` → 资料片段

后续接入真实 OpenAI / Anthropic / 向量库只需替换这两个文件，路由无需改动。

## 数据库说明

SQLite 单文件 `server/app.db`。`app/database.py` 提供 `ensure_local_schema()`，启动时自动给 `users` 表补 `nickname` / `avatar_url` 列（无 migration 工具时的轻量级补丁）。后续若上 PostgreSQL 或频繁改字段，建议引入 Alembic。