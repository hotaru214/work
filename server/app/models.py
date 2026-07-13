from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text, LargeBinary
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    nickname: Mapped[str] = mapped_column(String(64), default="学习者")
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)

    courses = relationship("Course", back_populates="user", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="user", cascade="all, delete-orphan")
    post_votes = relationship("PostVote", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    kb_notes = relationship("KBNote", back_populates="user", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(128))
    intro: Mapped[str] = mapped_column(Text, default="")
    teacher: Mapped[str] = mapped_column(String(64), default="")
    semester: Mapped[str] = mapped_column(String(32), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)

    user = relationship("User", back_populates="courses")
    materials = relationship("Material", back_populates="course", cascade="all, delete-orphan")
    sessions = relationship("ChatSession", back_populates="course", cascade="all, delete-orphan")


class Material(Base):
    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(32), default="other")
    category: Mapped[str] = mapped_column(String(32), default="other")  # other / assignment / lecture / lab
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    content_path: Mapped[str] = mapped_column(String(512))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)

    course = relationship("Course", back_populates="materials")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    course_id: Mapped[int | None] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), default="新对话")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)

    course = relationship("Course", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("chat_sessions.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)

    session = relationship("ChatSession", back_populates="messages")


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    goal: Mapped[str] = mapped_column(Text)
    deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    daily_minutes: Mapped[int] = mapped_column(Integer, default=60)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    plan_id: Mapped[int | None] = mapped_column(ForeignKey("plans.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    color: Mapped[str] = mapped_column(String(7), default="#6366f1")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    course_id: Mapped[int | None] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text, default="")
    session_id: Mapped[int | None] = mapped_column(ForeignKey("chat_sessions.id", ondelete="SET NULL"), nullable=True)
    is_essence: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(16), default="published")
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc, onupdate=_now_utc)

    user = relationship("User", back_populates="posts")
    votes = relationship("PostVote", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    tags = relationship("PostTag", back_populates="post", cascade="all, delete-orphan")


class PostVote(Base):
    __tablename__ = "post_votes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    value: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)

    post = relationship("Post", back_populates="votes")
    user = relationship("User", back_populates="post_votes")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)

    post = relationship("Post", back_populates="comments")
    user = relationship("User", back_populates="comments")


class PostTag(Base):
    __tablename__ = "post_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"))
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"))

    post = relationship("Post", back_populates="tags")
    tag = relationship("Tag")



class KBNoteTag(Base):
    __tablename__ = "kb_note_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    note_id: Mapped[str] = mapped_column(ForeignKey("kb_notes.note_id", ondelete="CASCADE"))
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"))

    note = relationship("KBNote", back_populates="note_tags")
    tag = relationship("Tag")

# ==================== Knowledge Base (Trilium-style) ====================

NOTE_TYPES = ["text", "code", "file", "image", "book", "mermaid", "relation-map"]


class KBNote(Base):
    """
    Core entity: a note (text, code, book/folder, etc.)
    Matches Trilium's BNote entity.
    """
    __tablename__ = "kb_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    note_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(32), default="text")
    mime: Mapped[str] = mapped_column(String(64), default="text/html")
    course_id: Mapped[int | None] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    content: Mapped[str] = mapped_column(Text, default="")
    is_protected: Mapped[bool] = mapped_column(Boolean, default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    share_token: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc, onupdate=_now_utc)

    user = relationship("User", back_populates="kb_notes")
    branches = relationship("KBBranch", back_populates="note",
                            foreign_keys="KBBranch.note_id",
                            primaryjoin="KBNote.note_id == KBBranch.note_id",
                            cascade="all, delete-orphan")
    attributes = relationship("KBAttribute", back_populates="note", cascade="all, delete-orphan")
    revisions = relationship("KBRevision", back_populates="note", cascade="all, delete-orphan")
    note_tags = relationship("KBNoteTag", back_populates="note", cascade="all, delete-orphan")


class KBBranch(Base):
    """
    Tree connection: links a child note to a parent note.
    Matches Trilium's BBranch entity.
    """
    __tablename__ = "kb_branches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    branch_id: Mapped[str] = mapped_column(String(32), unique=True)
    note_id: Mapped[str] = mapped_column(ForeignKey("kb_notes.note_id", ondelete="CASCADE"))
    parent_note_id: Mapped[str] = mapped_column(String(32), default="")
    note_position: Mapped[int] = mapped_column(Integer, default=0)
    prefix: Mapped[str] = mapped_column(String(64), default="")
    is_expanded: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)

    note = relationship("KBNote", back_populates="branches",
                        foreign_keys=[note_id])


class KBAttribute(Base):
    """
    Labels and relations attached to notes.
    Matches Trilium's BAttribute entity.
    """
    __tablename__ = "kb_attributes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    attribute_id: Mapped[str] = mapped_column(String(32), unique=True)
    note_id: Mapped[str] = mapped_column(ForeignKey("kb_notes.note_id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(16), default="label")
    name: Mapped[str] = mapped_column(String(128))
    value: Mapped[str] = mapped_column(String(1024), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)

    note = relationship("KBNote", back_populates="attributes")


class KBRevision(Base):
    """
    Version history for notes.
    Matches Trilium's BRevision entity.
    """
    __tablename__ = "kb_revisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    revision_id: Mapped[str] = mapped_column(String(32), unique=True)
    note_id: Mapped[str] = mapped_column(ForeignKey("kb_notes.note_id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(32))
    mime: Mapped[str] = mapped_column(String(64))
    content: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now_utc)

    note = relationship("KBNote", back_populates="revisions")



