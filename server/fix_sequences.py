import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text

tables = [
    "users", "courses", "materials", "chat_sessions", "chat_messages",
    "plans", "tasks", "tags", "posts", "post_tags", "post_votes", "comments",
    "kb_notes", "kb_branches", "kb_attributes", "kb_revisions", "kb_note_tags"
]

with engine.connect() as conn:
    for t in tables:
        try:
            seq_name = t + "_id_seq"
            sql = text("SELECT setval(:seq, (SELECT COALESCE(MAX(id), 1) FROM " + t + "))")
            conn.execute(sql, {"seq": seq_name})
            conn.commit()
            print("OK: " + seq_name)
        except Exception as e:
            msg = str(e).split("\n")[0][:80]
            print("SKIP: " + t + " -> " + msg)
