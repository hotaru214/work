from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, true

from app.database import get_db
from app.models import Post, PostTag, PostVote, Tag, User
from app.schemas import PostCreate, PostOut, PostListItem, PostUpdate, PostVoteOut
from app.security import get_current_user

router = APIRouter()


def _post_to_item(post: Post, tags: list[Tag] = None) -> dict:
    data = {
        "id": post.id,
        "user_id": post.user_id,
        "course_id": post.course_id,
        "title": post.title,
        "is_essence": post.is_essence,
        "status": post.status,
        "view_count": post.view_count,
        "like_count": post.like_count,
        "comment_count": post.comment_count,
        "created_at": post.created_at,
        "author_name": post.user.username if post.user else "",
        "tags": tags or [],
    }
    return data


@router.get("/", response_model=list[PostListItem])
def list_posts(
    sort: str = Query("latest", pattern="^(latest|hot|essence)$"),
    course_id: int | None = None,
    tag_id: int | None = None,
    page: int = Query(1, ge=1),
    search: str | None = None,
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Post).filter(Post.status == "published")
    if course_id is not None:
        q = q.filter(Post.course_id == course_id)
    if tag_id is not None:
        q = q.join(PostTag).filter(PostTag.tag_id == tag_id)

    if search:
        from sqlalchemy import exists
        tag_match = exists().where(PostTag.post_id == Post.id, Tag.id == PostTag.tag_id, Tag.name.ilike(f"%{search}%"))
        q = q.filter(Post.title.ilike(f"%{search}%") | tag_match)

    if sort == "essence":
        q = q.filter(Post.is_essence == True).order_by(desc(Post.like_count), desc(Post.created_at))
    elif sort == "hot":
        q = q.order_by(desc(Post.like_count + Post.comment_count + Post.view_count), desc(Post.created_at))
    else:
        q = q.order_by(desc(Post.created_at))

    total = q.count()
    posts = q.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for p in posts:
        tags = [pt.tag for pt in p.tags]
        item = _post_to_item(p, tags)
        items.append(item)
    return items


@router.post("/", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(body: PostCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = Post(
        user_id=user.id,
        course_id=body.course_id,
        title=body.title,
        content=body.content,
        session_id=body.session_id,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    for tid in body.tag_ids:
        tag = db.query(Tag).filter(Tag.id == tid).first()
        if tag:
            db.add(PostTag(post_id=post.id, tag_id=tid))
    db.commit()
    db.refresh(post)

    tags = [pt.tag for pt in post.tags]
    result = PostOut(
        **{c.name: getattr(post, c.name) for c in Post.__table__.columns},
        author_name=user.username,
        tags=tags,
    )
    return result


@router.get("/{post_id}", response_model=PostOut)
def get_post(post_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="post not found")
    post.view_count += 1
    db.commit()
    tags = [pt.tag for pt in post.tags]
    result = PostOut(
        **{c.name: getattr(post, c.name) for c in Post.__table__.columns},
        author_name=post.user.username if post.user else "",
        tags=tags,
    )
    return result


@router.put("/{post_id}", response_model=PostOut)
def update_post(post_id: int, body: PostUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="post not found")
    if body.title is not None:
        post.title = body.title
    if body.content is not None:
        post.content = body.content
    if body.tag_ids is not None:
        db.query(PostTag).filter(PostTag.post_id == post.id).delete()
        for tid in body.tag_ids:
            tag = db.query(Tag).filter(Tag.id == tid).first()
            if tag:
                db.add(PostTag(post_id=post.id, tag_id=tid))
    db.commit()
    db.refresh(post)
    tags = [pt.tag for pt in post.tags]
    result = PostOut(
        **{c.name: getattr(post, c.name) for c in Post.__table__.columns},
        author_name=post.user.username if post.user else "",
        tags=tags,
    )
    return result


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="post not found")
    db.delete(post)
    db.commit()


@router.post("/{post_id}/vote", response_model=PostVoteOut)
def vote_post(post_id: int, value: int = 1, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="post not found")
    existing = db.query(PostVote).filter(PostVote.post_id == post_id, PostVote.user_id == user.id).first()
    if existing:
        db.delete(existing)
        post.like_count = max(0, post.like_count - existing.value)
        db.commit()
        return PostVoteOut(id=0, post_id=post_id, user_id=user.id, value=0)
    vote = PostVote(post_id=post_id, user_id=user.id, value=value)
    db.add(vote)
    post.like_count += value
    db.commit()
    db.refresh(vote)
    return vote


@router.get("/{post_id}/related", response_model=list[PostListItem])
def related_posts(post_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="post not found")
    my_tags = [pt.tag_id for pt in post.tags]
    related = (
        db.query(Post)
        .join(PostTag)
        .filter(
            Post.id != post_id,
            Post.status == "published",
            PostTag.tag_id.in_(my_tags) if my_tags else true(),
        )
        .group_by(Post.id)
        .order_by(desc(Post.like_count))
        .limit(5)
        .all()
    )
    items = []
    for p in related:
        tags = [pt.tag for pt in p.tags]
        items.append(_post_to_item(p, tags))
    return items
