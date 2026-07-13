"""初始化数据库并写入种子数据。
用法：python -m app.seed
"""
from app.database import Base, SessionLocal, engine, ensure_schema
from app.models import Course, User
from app.security import hash_password

Base.metadata.create_all(bind=engine)
ensure_schema()


def run():
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == "demo").first():
            user = User(username="demo", password_hash=hash_password("demo123"))
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user = db.query(User).filter(User.username == "demo").first()

        if not db.query(Course).filter(Course.user_id == user.id).first():
            db.add_all([
                Course(user_id=user.id, name="高等数学", intro="微积分与极限基础", teacher="张老师", semester="2025 秋"),
                Course(user_id=user.id, name="数据结构", intro="线性表、树、图与算法入门", teacher="李老师", semester="2025 秋"),
                Course(user_id=user.id, name="操作系统", intro="进程、内存、文件系统", teacher="王老师", semester="2026 春"),
            ])
            db.commit()
        print("seeded: user=demo/demo123, 3 courses created")
    finally:
        db.close()


if __name__ == "__main__":
    run()
