import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Plan, Task, User
from app.schemas import PlanCreate, PlanOut
from app.security import get_current_user
from app.services.llm import LLMClient

router = APIRouter()
llm = LLMClient()


@router.get("/", response_model=list[PlanOut])
def list_plans(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Plan).filter(Plan.user_id == user.id).order_by(Plan.created_at.desc()).all()


@router.post("/", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(body: PlanCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = Plan(user_id=user.id, **body.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)

    # 调用 LLM 自动生成阶段任务
    deadline_str = plan.deadline.strftime("%Y-%m-%d") if plan.deadline else "未设置"
    try:
        result = llm.generate_tasks(plan.goal, deadline_str, plan.daily_minutes)
        data = json.loads(result.strip().lstrip("```json").rstrip("```"))
        tasks_data = data.get("tasks", [])
    except (json.JSONDecodeError, Exception):
        # LLM 返回非 JSON 时回退到默认任务
        tasks_data = [
            {"title": "整理学习资料并制定详细计划", "days_from_start": 1},
            {"title": "完成第一阶段学习", "days_from_start": 2},
            {"title": "复习并做练习题", "days_from_start": 3},
        ]

    today = datetime.utcnow()
    for item in tasks_data:
        days = max(1, int(item.get("days_from_start", 1)))
        due = today + timedelta(days=days)
        task = Task(
            user_id=user.id,
            plan_id=plan.id,
            title=item["title"],
            due_date=due,
        )
        db.add(task)

    db.commit()
    return plan


@router.post("/{plan_id}/generate-tasks")
def generate_tasks_for_plan(plan_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """为已有计划重新生成任务（删除旧任务并创建新的）。"""
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.user_id == user.id).first()
    if not plan:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="plan not found")

    # 删除旧任务
    db.query(Task).filter(Task.plan_id == plan_id).delete()

    deadline_str = plan.deadline.strftime("%Y-%m-%d") if plan.deadline else "未设置"
    try:
        result = llm.generate_tasks(plan.goal, deadline_str, plan.daily_minutes)
        data = json.loads(result.strip().lstrip("```json").rstrip("```"))
        tasks_data = data.get("tasks", [])
    except (json.JSONDecodeError, Exception):
        tasks_data = [
            {"title": "整理学习资料并制定详细计划", "days_from_start": 1},
            {"title": "完成第一阶段学习", "days_from_start": 2},
            {"title": "复习并做练习题", "days_from_start": 3},
        ]

    today = datetime.utcnow()
    new_tasks = []
    for item in tasks_data:
        days = max(1, int(item.get("days_from_start", 1)))
        due = today + timedelta(days=days)
        task = Task(
            user_id=user.id,
            plan_id=plan.id,
            title=item["title"],
            due_date=due,
        )
        db.add(task)
        new_tasks.append(task)

    db.commit()
    return {"tasks": [{"id": t.id, "title": t.title, "due_date": t.due_date.isoformat() if t.due_date else None} for t in new_tasks]}


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.user_id == user.id).first()
    if plan:
        db.delete(plan)
        db.commit()
