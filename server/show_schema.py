import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import engine, SessionLocal
from sqlalchemy import inspect, text

inspector = inspect(engine)
tables = inspector.get_table_names()
db = SessionLocal()

for t in sorted(tables):
    cols = inspector.get_columns(t)
    pk = [c["name"] for c in cols if c.get("primary_key")]
    fks = inspector.get_foreign_keys(t)
    cnt = db.execute(text("SELECT COUNT(*) FROM " + t)).scalar() or 0
    max_id = 0
    try:
        max_id = db.execute(text("SELECT COALESCE(MAX(id), 0) FROM " + t)).scalar() or 0
    except:
        pass
    
    print()
    print("[%s]  (%d rows, max id=%d)" % (t, cnt, max_id))
    for c in cols:
        flags = []
        if c["name"] in pk: flags.append("PK")
        for fk in fks:
            for col_ref in fk["constrained_columns"]:
                if col_ref == c["name"]:
                    flags.append("FK->" + fk["referred_table"] + "." + fk["referred_columns"][0])
        nullable = "NULL" if c.get("nullable") else "NOT NULL"
        fstr = "  " + c["name"].ljust(22) + str(c["type"]).ljust(28) + nullable.ljust(10) + " ".join(flags)
        print(fstr)
    print("  FKs: %d" % len(fks))

db.close()
