from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Tag, PostTag, KBNoteTag
from app.schemas import TagCreate, TagOut

router = APIRouter()


@router.get("/", response_model=list)
def list_tags(
    search: str = Query(""),
    db: Session = Depends(get_db),
):
    q = db.query(Tag, func.count(PostTag.tag_id).label("post_count"), func.count(KBNoteTag.tag_id).label("note_count"))
    q = q.outerjoin(PostTag, Tag.id == PostTag.tag_id)
    q = q.outerjoin(KBNoteTag, Tag.id == KBNoteTag.tag_id)
    if search:
        q = q.filter(Tag.name.ilike(f"%{search}%"))
    q = q.group_by(Tag.id).order_by(Tag.name)
    results = q.all()

    return [{
        "id": tag.id,
        "name": tag.name,
        "color": tag.color,
        "created_at": tag.created_at,
        "post_count": post_count,
        "note_count": note_count,
        "usage_count": post_count + note_count,
    } for tag, post_count, note_count in results]


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_tag(body: TagCreate, db: Session = Depends(get_db)):
    existing = db.query(Tag).filter(Tag.name == body.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="标签已存在")
    tag = Tag(name=body.name, color=body.color)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return {"id": tag.id, "name": tag.name, "color": tag.color, "created_at": tag.created_at, "post_count": 0, "note_count": 0, "usage_count": 0}


@router.put("/{tag_id}", response_model=dict)
def update_tag(tag_id: int, body: TagCreate, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="标签未找到")
    tag.name = body.name
    tag.color = body.color
    db.commit()
    db.refresh(tag)
    
    post_count = db.query(PostTag).filter(PostTag.tag_id == tag_id).count()
    note_count = db.query(KBNoteTag).filter(KBNoteTag.tag_id == tag_id).count()
    return {"id": tag.id, "name": tag.name, "color": tag.color, "created_at": tag.created_at, "post_count": post_count, "note_count": note_count, "usage_count": post_count + note_count}


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="标签未找到")
    db.delete(tag)
    db.commit()
