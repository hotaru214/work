# 课程学习助手 Agent 平台

大型程序设计实践 2026 课题项目。

一个面向大学生的课程学习助手 Agent 平台：管理课程与资料、Agent 问答、学习计划、待办任务、知识库、论坛。

## 目录结构

```
.
├── client/   # React + Vite + TypeScript + Tailwind
├── server/   # FastAPI + SQLAlchemy + PostgreSQL (Neon)
```

## 快速开始

### 首次使用（克隆后第一次）

**后端：**

```bash
cd server
python -m venv .venv && source .venv/Scripts/activate    # Windows Git Bash
pip install -r requirements.txt
cp .env.example .env
```

打开 `server/.env`，填入 Neon 数据库连接串（找项目所有者获取）：
```env
DATABASE_URL=postgresql://用户名:密码@xxx.neon.tech/数据库名?sslmode=require
```

启动后端：
```bash
uvicorn main:app --reload --port 8000
```

**前端（另一个终端）：**

```bash
cd client
npm install
npm run dev
```

打开 http://localhost:5173，使用 `demo` / `demo123` 登录。

### 日常使用

**后端：**
```bash
cd server
.venv/Scripts/python -m uvicorn main:app --reload --port 8000
```

**前端：**
```bash
cd client
npm run dev
```

> 无需重复 `pip install`、`npm install`、`seed`、`migrate`，除非依赖有变动。

### 连接远程数据库

项目默认使用 Neon (PostgreSQL)。如需切换回 SQLite 本地开发，修改 `server/.env`：
```env
DATABASE_URL=sqlite:///./app.db
```

从 SQLite 迁移到 PostgreSQL：
```bash
cd server
.venv/Scripts/python migrate_to_pg.py
```

## 功能模块

- **认证**：JWT 登录/注册
- **仪表盘**：`/dashboard` 学习数据汇总
- **课程管理**：课程 CRUD，资料上传/预览/下载
- **Agent 对话**：基于课程资料的 AI 问答
- **学习计划**：目标 + 截止时间 + 每日可用时间
- **知识库**：富文本 / Markdown 文档编辑器，目录树管理
- **讨论区**：帖子发布、评论、标签、精华/热门排序
- **标签系统**：帖子与知识库的统一标签管理

## API 文档

启动后端后访问 http://localhost:8000/docs

## 离线安装

如果网络受限，可以配置国内镜像：

```bash
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
npm install --registry=https://registry.npmmirror.com
```