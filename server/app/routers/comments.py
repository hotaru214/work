from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Comment, Post, User
from app.schemas import CommentCreate, CommentOut
from app.security import get_current_user

router = APIRouter()


@router.get("/", response_model=list[CommentOut])
def list_comments(
    post_id: int = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at)
    total = q.count()
    comments = q.offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for c in comments:
        items.append(CommentOut(
            id=c.id, post_id=c.post_id, user_id=c.user_id,
            parent_id=c.parent_id, content=c.content,
            created_at=c.created_at,
            author_name=c.user.username if c.user else "",
        ))
    return items


@router.post("/", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(body: CommentCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == body.post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="post not found")

    if body.parent_id is not None:
        parent = db.query(Comment).filter(Comment.id == body.parent_id).first()
        if not parent or parent.post_id != body.post_id:
            raise HTTPException(status_code=400, detail="invalid parent_id")

    comment = Comment(
        post_id=body.post_id,
        user_id=user.id,
        parent_id=body.parent_id,
        content=body.content,
    )
    db.add(comment)
    post.comment_count += 1
    db.commit()
    db.refresh(comment)
    return CommentOut(
        id=comment.id, post_id=comment.post_id, user_id=comment.user_id,
        parent_id=comment.parent_id, content=comment.content,
        created_at=comment.created_at,
        author_name=user.username,
    )


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(comment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.user_id == user.id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="comment not found")
    post = db.query(Post).filter(Post.id == comment.post_id).first()
    if post:
        post.comment_count = max(0, post.comment_count - 1)
    db.delete(comment)
    db.commit()
