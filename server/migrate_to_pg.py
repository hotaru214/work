"""SQLite -> PostgreSQL data migration tool.
Usage: python migrate_to_pg.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from app.config import settings
from app.database import Base, engine as pg_engine, SessionLocal as PgSession
from app.models import *

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "app.db")
if not os.path.exists(SQLITE_PATH):
    print("ERROR: app.db not found")
    sys.exit(1)

print("Reading SQLite data...")
sqlite_engine = create_engine("sqlite:///" + SQLITE_PATH, connect_args={"check_same_thread": False})
inspector = inspect(sqlite_engine)
SqliteSession = sessionmaker(bind=sqlite_engine)
sqlite_db = SqliteSession()

all_data = {}
for table_name in inspector.get_table_names():
    if table_name == "alembic_version": continue
    cols = [c["name"] for c in inspector.get_columns(table_name)]
    rows = sqlite_db.execute(text("SELECT * FROM [" + table_name + "]")).fetchall()
    all_data[table_name] = {"columns": cols, "rows": [dict(zip(cols, r)) for r in rows]}
    print("  " + table_name + ": " + str(len(all_data[table_name]["rows"])) + " rows")
sqlite_db.close()
sqlite_engine.dispose()

print("\nConnecting PostgreSQL...")
print("  creating tables...")
Base.metadata.create_all(bind=pg_engine)

print("  importing data...")
pg_db = PgSession()

# Insert order: parent tables first, child tables last
TABLE_ORDER = [
    "users", "courses", "tags", "materials",
    "chat_sessions", "chat_messages",
    "plans", "tasks",
    "posts", "post_tags", "post_votes",
    "kb_notes", "kb_branches", "kb_attributes", "kb_revisions", "kb_note_tags",
    "comments",
]

MODEL_MAP = {
    "users": User, "courses": Course, "materials": Material,
    "chat_sessions": ChatSession, "chat_messages": ChatMessage,
    "plans": Plan, "tasks": Task, "tags": Tag,
    "posts": Post, "post_tags": PostTag, "post_votes": PostVote,
    "comments": Comment,
    "kb_notes": KBNote, "kb_branches": KBBranch,
    "kb_attributes": KBAttribute, "kb_revisions": KBRevision,
    "kb_note_tags": KBNoteTag,
}

try:
    # Disable FK triggers temporarily
    pg_db.execute(text("SET session_replication_role = 'replica'"))
    pg_db.commit()

    for table_name in TABLE_ORDER:
        info = all_data.get(table_name)
        if not info or not info["rows"]: continue
        model = MODEL_MAP.get(table_name)
        if not model: continue

        for row in info["rows"]:
            pg_db.add(model(**row))
        pg_db.commit()
        print("  " + table_name + ": " + str(len(info["rows"])) + " rows")

    # Re-enable FK triggers
    pg_db.execute(text("SET session_replication_role = 'origin'"))
    pg_db.commit()
    print("\nDone! All data migrated.")

except Exception as e:
    pg_db.rollback()
    print("\nFAILED: " + str(e))
    raise
finally:
    pg_db.close()
    pg_engine.dispose()