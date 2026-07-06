from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChatSession, Course, Material, Plan, Task, User
from app.schemas import ChatSessionOut, DashboardOut, PlanOut, TaskOut
from app.security import get_current_user

router = APIRouter()


@router.get("/", response_model=DashboardOut)
def get_dashboard(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    today = date.today()

    tasks = db.query(Task).filter(Task.user_id == user.id).all()
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.done)
    pending_tasks = total_tasks - completed_tasks

    today_tasks = [
        t for t in tasks
        if not t.done and t.due_date is not None and t.due_date.date() <= today
    ]

    next_week = today + timedelta(days=7)
    upcoming_tasks = [
        t for t in tasks
        if not t.done and t.due_date is not None and today < t.due_date.date() <= next_week
    ]

    course_count = db.query(Course).filter(Course.user_id == user.id).count()
    material_count = (
        db.query(Material)
        .join(Course)
        .filter(Course.user_id == user.id)
        .count()
    )
    plan_count = db.query(Plan).filter(Plan.user_id == user.id).count()

    active_plans = (
        db.query(Plan)
        .filter(Plan.user_id == user.id)
        .order_by(Plan.created_at.desc())
        .all()
    )

    recent_sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id)
        .order_by(ChatSession.created_at.desc())
        .limit(5)
        .all()
    )

    return DashboardOut(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        course_count=course_count,
        material_count=material_count,
        plan_count=plan_count,
        today_tasks=[TaskOut.model_validate(t) for t in today_tasks],
        upcoming_tasks=[TaskOut.model_validate(t) for t in upcoming_tasks],
        active_plans=[PlanOut.model_validate(p) for p in active_plans],
        recent_sessions=[ChatSessionOut.model_validate(s) for s in recent_sessions],
    )
