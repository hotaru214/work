# 课程学习助手 Agent 平台

大型程序设计实践 2026 课题项目。详见 `docx/大型程序设计实践2026.pdf`（第 28-29 页）。

## 目录结构

```
.
├── client/   # React + Vite + TypeScript + Tailwind
└── server/   # FastAPI + SQLAlchemy + SQLite
```

## 启动后端

```bash
cd server
python -m venv .venv && source .venv/Scripts/activate    # Windows Git Bash
pip install -r requirements.txt
cp .env.example .env      # 可选
python -m app.seed        # 建表 + 种子数据 demo/demo123, 3 门课程
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

## 主要 API

- `POST /api/auth/register` `/api/auth/login` `/api/auth/me`
- `GET/POST /api/courses/` `GET/PUT/DELETE /api/courses/{id}`
- `GET/POST /api/materials/course/{course_id}` `GET/DELETE /api/materials/{id}`
- `GET/POST /api/chat/sessions` `GET/POST /api/chat/sessions/{id}/messages`
- `GET/POST /api/plans/` `DELETE /api/plans/{id}`
- `GET/POST /api/tasks/` `PATCH /api/tasks/{id}/done` `DELETE /api/tasks/{id}`

## Agent 与资料检索

`server/app/services/llm.py` 与 `retrieval.py` 为抽象层，当前为 mock 实现。
后续接入真实大模型 / 向量库只需替换这两个文件，路由无需改动。