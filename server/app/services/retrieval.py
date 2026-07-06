"""资料检索抽象层。

当前为 mock 实现，返回空片段。后续可替换为向量库（Chroma 等）+ 嵌入模型。
"""
from typing import List

from sqlalchemy.orm import Session

from app.models import Material
from app.schemas import Snippet


def search(course_id: int, query: str, k: int = 3, db: Session | None = None) -> List[Snippet]:
    """根据 query 在指定课程的资料中检索最相关的 top-k 片段。

    mock 实现：返回空列表。真实实现需先对 Material 做向量化索引。
    """
    if db is None:
        return []
    # 占位：返回该课程最近上传的若干资料名，便于演示"引用来源"链路。
    materials = (
        db.query(Material)
        .filter(Material.course_id == course_id)
        .order_by(Material.uploaded_at.desc())
        .limit(k)
        .all()
    )
    return [Snippet(material_id=m.id, filename=m.filename, text="") for m in materials]