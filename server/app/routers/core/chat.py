from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChatMessage, ChatSession, Course, Post, PostTag, Tag, User
from app.schemas import ChatMessageIn, ChatMessageOut, ChatSessionOut, PostOut
from app.security import get_current_user
from app.services.llm import LLMClient
from app.services.retrieval import search as retrieve

router = APIRouter()
llm = LLMClient()


@router.get("/sessions", response_model=list[ChatSessionOut])
def list_sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ChatSession).filter(ChatSession.user_id == user.id).order_by(ChatSession.created_at.desc()).all()


@router.post("/sessions", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED)
def create_session(course_id: int | None = None, title: str = "新对话",
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if course_id is not None:
        course = db.query(Course).filter(Course.id == course_id, Course.user_id == user.id).first()
        if not course:
            raise HTTPException(status_code=404, detail="course not found")
    session = ChatSession(user_id=user.id, course_id=course_id, title=title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageOut])
def list_messages(session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="session not found")
    return db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).all()


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageOut)
def send_message(session_id: int, body: ChatMessageIn,
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="session not found")

    user_msg = ChatMessage(session_id=session_id, role="user", content=body.content)
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    context = []
    if session.course_id is not None:
        context = retrieve(course_id=session.course_id, query=body.content, k=3, db=db)

    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    reply_text = llm.chat(history=history, context=context)
    assistant_msg = ChatMessage(session_id=session_id, role="assistant", content=reply_text)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    return assistant_msg

@router.post("/sessions/{session_id}/publish", response_model=PostOut)
def publish_session(session_id: int, title: str = "", tag_ids: str = "",
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """\u5c06 AI \u5bf9\u8bdd\u53d1\u5e03\u5230\u8ba8\u8bba\u533a"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="session not found")
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).all()
    if not messages:
        raise HTTPException(status_code=400, detail="session has no messages")

    # Build content from the full conversation
    lines = []
    for m in messages:
        role_label = "\u6211" if m.role == "user" else "Agent"
        lines.append(f"**{role_label}:** {m.content}")
    body_content = "\n\n".join(lines)

    tag_ids_list = []
    for s in tag_ids.split(","):
        s = s.strip()
        if s.isdigit():
            tag_ids_list.append(int(s))

    post_title = title if title else session.title
    post = Post(user_id=user.id, course_id=session.course_id, title=post_title, content=body_content, session_id=session.id)
    db.add(post)
    db.commit()
    db.refresh(post)

    for tid in tag_ids_list:
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


@router.get("/sessions/{session_id}/related", response_model=list[dict])
def session_related_posts(session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """\u83b7\u53d6\u4e0e\u5f53\u524d\u5bf9\u8bdd\u76f8\u5173\u7684\u5e16\u5b50"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="session not found")

    posts = db.query(Post).filter(Post.course_id == session.course_id, Post.id != None).order_by(Post.like_count.desc()).limit(5).all()
    result = []
    for p in posts:
        result.append({
            "id": p.id,
            "title": p.title,
            "like_count": p.like_count,
            "comment_count": p.comment_count,
            "author_name": p.user.username if p.user else "",
        })
    return result
