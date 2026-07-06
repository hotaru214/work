import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def ensure_local_schema() -> None:
    """Small SQLite-friendly schema patching until a real migration tool is added."""
    if not settings.DATABASE_URL.startswith("sqlite"):
        return
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("users")}
    with engine.begin() as conn:
        if "nickname" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN nickname VARCHAR(64) DEFAULT '学习者'"))
        if "avatar_url" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512)"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
