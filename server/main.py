from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine, ensure_local_schema
from app.routers.core import auth, courses, materials, chat, plans, tasks
from app.routers.forum import posts, comments, tags
from app.routers.kb import notebooks, knowledge_base
from app.routers.integrations import yuque, trilium
from app.routers.misc import dashboard

Base.metadata.create_all(bind=engine)
ensure_local_schema()

app = FastAPI(title="课程学习助手 Agent 平台", version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(courses.router, prefix="/api/courses", tags=["courses"])
app.include_router(materials.router, prefix="/api/materials", tags=["materials"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(plans.router, prefix="/api/plans", tags=["plans"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(tags.router, prefix="/api/tags", tags=["tags"])
app.include_router(posts.router, prefix="/api/posts", tags=["posts"])
app.include_router(comments.router, prefix="/api/comments", tags=["comments"])
app.include_router(notebooks.router, prefix="/api/notebooks", tags=["notebooks"])
app.include_router(yuque.router, prefix="/api", tags=["yuque"])
app.include_router(trilium.router, prefix="/api", tags=["trilium"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(knowledge_base.router, prefix="/api", tags=["kb"])
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {"name": "course-helper-agent", "version": "0.4.0"}
