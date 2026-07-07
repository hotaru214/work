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
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def ensure_schema() -> None:
    """Auto-migrate missing columns (works with both SQLite and PostgreSQL)."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    with engine.begin() as conn:
        user_cols = {c["name"] for c in inspector.get_columns("users")}
        if "nickname" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN nickname VARCHAR(64) DEFAULT '学习者'"))
        if "avatar_url" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512)"))

        if "kb_notes" in inspector.get_table_names():
            kb_cols = {c["name"] for c in inspector.get_columns("kb_notes")}
            if "share_token" not in kb_cols:
                conn.execute(text("ALTER TABLE kb_notes ADD COLUMN share_token VARCHAR(64)"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()