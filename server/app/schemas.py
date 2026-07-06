from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserLogin(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class CourseBase(BaseModel):
    name: str
    intro: str = ""
    teacher: str = ""
    semester: str = ""

class CourseCreate(CourseBase):
    pass

class CourseOut(CourseBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)

class MaterialOut(BaseModel):
    id: int
    course_id: int
    filename: str
    type: str
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChatMessageIn(BaseModel):
    content: str

class ChatMessageOut(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChatSessionOut(BaseModel):
    id: int
    course_id: Optional[int]
    title: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PlanBase(BaseModel):
    goal: str
    deadline: Optional[datetime] = None
    daily_minutes: int = 60

class PlanCreate(PlanBase):
    pass

class PlanOut(PlanBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)

class TaskBase(BaseModel):
    title: str
    due_date: Optional[datetime] = None
    plan_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskOut(TaskBase):
    id: int
    user_id: int
    done: bool
    model_config = ConfigDict(from_attributes=True)

class Snippet(BaseModel):
    material_id: int
    filename: str
    text: str

class TagCreate(BaseModel):
    name: str
    color: str = "#6366f1"

class TagOut(BaseModel):
    id: int
    name: str
    color: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PostCreate(BaseModel):
    title: str
    content: str = ""
    course_id: Optional[int] = None
    session_id: Optional[int] = None
    tag_ids: list[int] = []

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tag_ids: Optional[list[int]] = None

class PostListItem(BaseModel):
    id: int
    user_id: int
    course_id: Optional[int]
    title: str
    is_essence: bool
    status: str
    view_count: int
    like_count: int
    comment_count: int
    created_at: datetime
    author_name: str = ""
    tags: list[TagOut] = []
    model_config = ConfigDict(from_attributes=True)

class PostVoteOut(BaseModel):
    id: int
    post_id: int
    user_id: int
    value: int
    model_config = ConfigDict(from_attributes=True)

class PostOut(BaseModel):
    id: int
    user_id: int
    course_id: Optional[int]
    title: str
    content: str
    session_id: Optional[int]
    is_essence: bool
    status: str
    view_count: int
    like_count: int
    comment_count: int
    created_at: datetime
    updated_at: datetime
    author_name: str = ""
    tags: list[TagOut] = []
    model_config = ConfigDict(from_attributes=True)

class CommentCreate(BaseModel):
    post_id: int
    content: str
    parent_id: Optional[int] = None

class CommentOut(BaseModel):
    id: int
    post_id: int
    user_id: int
    parent_id: Optional[int]
    content: str
    created_at: datetime
    author_name: str = ""
    model_config = ConfigDict(from_attributes=True)

class NotebookCreate(BaseModel):
    name: str
    description: str = ""
    is_public: bool = False

class NotebookOut(BaseModel):
    id: int
    user_id: int
    name: str
    description: str
    is_public: bool
    doc_count: int = 0
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DocCreate(BaseModel):
    title: str
    content: str = ""
    parent_id: Optional[int] = None
    is_public: bool = False
    tag_ids: list[int] = []

class DocUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_public: Optional[bool] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None
    tag_ids: Optional[list[int]] = None

class DocOut(BaseModel):
    id: int
    notebook_id: int
    user_id: int
    parent_id: Optional[int]
    title: str
    content: str
    is_public: bool
    sort_order: int
    view_count: int
    created_at: datetime
    updated_at: datetime
    tags: list[TagOut] = []
    model_config = ConfigDict(from_attributes=True)

class DocTreeItem(BaseModel):
    id: int
    parent_id: Optional[int]
    title: str
    sort_order: int
    children: list["DocTreeItem"] = []
    model_config = ConfigDict(from_attributes=True)

class DashboardOut(BaseModel):
    total_tasks: int = 0
    completed_tasks: int = 0
    pending_tasks: int = 0
    course_count: int = 0
    material_count: int = 0
    plan_count: int = 0
    today_tasks: list[TaskOut] = []
    upcoming_tasks: list[TaskOut] = []
    active_plans: list[PlanOut] = []
    recent_sessions: list[ChatSessionOut] = []


# ==================== Knowledge Base (Trilium-style) ====================

class KBNoteCreate(BaseModel):
    parent_note_id: str
    title: str
    content: str = ""
    type: str = "text"
    mime: str = "text/html"

class KBNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[str] = None
    mime: Optional[str] = None
    is_deleted: Optional[bool] = None

class KBAttributeCreate(BaseModel):
    note_id: str
    type: str = "label"
    name: str
    value: str = ""

class KBNoteOut(BaseModel):
    note_id: str
    title: str
    type: str
    mime: str
    is_protected: bool = False
    is_deleted: bool = False
    content: str = ""
    created_at: datetime
    updated_at: datetime
    children: list["KBNoteOut"] = []
    model_config = ConfigDict(from_attributes=True)

class KBBranchOut(BaseModel):
    branch_id: str
    note_id: str
    parent_note_id: str
    note_position: int
    prefix: str
    is_expanded: bool
    model_config = ConfigDict(from_attributes=True)

class KBAttributeOut(BaseModel):
    attribute_id: str
    note_id: str
    type: str
    name: str
    value: str
    position: int
    model_config = ConfigDict(from_attributes=True)
