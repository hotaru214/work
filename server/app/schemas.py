from datetime import datetime, timedelta, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator


CN_TZ = timezone(timedelta(hours=8))


def to_cn_iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(CN_TZ).isoformat()


USERNAME_PATTERN = r"^[A-Za-z0-9_-]{3,32}$"
COMMON_PASSWORDS = {
    "12345678",
    "password",
    "password1",
    "qwerty123",
    "admin123",
    "demo123",
}


class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=32, pattern=USERNAME_PATTERN)

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return str(value).strip().lower()

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    nickname: str = Field(default="学习者", max_length=64)
    avatar_url: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        password = value.strip()
        classes = [
            any(ch.islower() for ch in password),
            any(ch.isupper() for ch in password),
            any(ch.isdigit() for ch in password),
            any(not ch.isalnum() for ch in password),
        ]
        if password.lower() in COMMON_PASSWORDS or sum(classes) < 3:
            raise ValueError("密码至少 8 位，并包含大小写字母、数字、符号中的至少 3 类")
        return value

class UserLogin(UserBase):
    password: str = Field(min_length=1, max_length=128)

class UserOut(UserBase):
    id: int
    nickname: str = "学习者"
    avatar_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class UserProfileUpdate(BaseModel):
    nickname: Optional[str] = Field(default=None, max_length=64)
    avatar_url: Optional[str] = None

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
    category: str = "other"
    due_date: Optional[datetime] = None
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("uploaded_at")
    def serialize_uploaded_at(self, value: datetime) -> str:
        return to_cn_iso(value)

class MaterialUpdate(BaseModel):
    filename: Optional[str] = Field(default=None, min_length=1, max_length=255)
    type: Optional[str] = Field(default=None, max_length=32)
    category: Optional[str] = Field(default=None, max_length=32)
    due_date: Optional[datetime] = None

class MaterialSearchResult(BaseModel):
    material_id: int
    course_id: int
    course_name: str
    filename: str
    type: str
    category: str = "other"
    uploaded_at: datetime
    chunk_index: int = 1
    page_number: Optional[int] = None
    location: str = ""
    text: str
    preview: str = ""
    matches: list[str] = []
    score: float = 0.0

    @field_serializer("uploaded_at")
    def serialize_uploaded_at(self, value: datetime) -> str:
        return to_cn_iso(value)

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

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    due_date: Optional[datetime] = None
    plan_id: Optional[int] = None
    done: Optional[bool] = None

class TaskOut(TaskBase):
    id: int
    user_id: int
    done: bool
    model_config = ConfigDict(from_attributes=True)

class Snippet(BaseModel):
    material_id: int
    course_id: Optional[int] = None
    course_name: str = ""
    filename: str
    text: str
    chunk_index: int = 1
    page_number: Optional[int] = None
    location: str = ""
    preview: str = ""
    matches: list[str] = []


class StudyScheduleSlot(BaseModel):
    course_id: Optional[int] = None
    course_name: str
    title: str
    source_type: str
    start_time: str
    end_time: str
    estimated_minutes: int
    deadline: Optional[datetime] = None
    reason: str = ""


class StudyScheduleDay(BaseModel):
    date: str
    total_minutes: int
    slots: list[StudyScheduleSlot] = []


class StudyScheduleOut(BaseModel):
    days: list[StudyScheduleDay] = []
    unscheduled: list[StudyScheduleSlot] = []

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
    author_username: str = ""
    author_nickname: str = ""
    author_avatar_url: Optional[str] = None
    tags: list[TagOut] = []
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> str:
        return to_cn_iso(value)

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
    author_username: str = ""
    author_nickname: str = ""
    author_avatar_url: Optional[str] = None
    tags: list[TagOut] = []
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", "updated_at")
    def serialize_times(self, value: datetime) -> str:
        return to_cn_iso(value)

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

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> str:
        return to_cn_iso(value)


# ==================== Knowledge Base (Trilium-style) ====================



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
    upcoming_assignments: list[MaterialOut] = []

class KBNoteCreate(BaseModel):
    parent_note_id: str
    title: str
    content: str = ""
    type: str = "text"
    mime: str = "text/html"
    course_id: Optional[int] = None

class KBNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[str] = None
    mime: Optional[str] = None
    course_id: Optional[int] = None
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
    course_id: Optional[int] = None
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
