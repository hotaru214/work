from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChatMessage, ChatSession, Course, User
from app.schemas import ChatMessageIn, ChatMessageOut, ChatSessionOut
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