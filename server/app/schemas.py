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


class DashboardOut(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    course_count: int
    material_count: int
    plan_count: int
    today_tasks: list[TaskOut]
    upcoming_tasks: list[TaskOut]
    active_plans: list[PlanOut]
    recent_sessions: list[ChatSessionOut]


class Snippet(BaseModel):
    material_id: int
    filename: str
    text: str