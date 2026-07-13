import json
import re
from datetime import datetime, time, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Plan, Task, User
from app.schemas import PlanCreate, PlanOut
from app.security import get_current_user
from app.services.llm import LLMClient

router = APIRouter()
llm = LLMClient()


def _deadline_label(deadline: datetime | None) -> str:
    return deadline.strftime("%Y-%m-%d") if deadline else "未设置"


def _planning_days(deadline: datetime | None) -> int:
    if not deadline:
        return 7
    today = datetime.utcnow().date()
    return max(1, min(45, (deadline.date() - today).days + 1))


def _task_count(days: int, daily_minutes: int) -> int:
    if days <= 3:
        return days
    if days <= 7:
        return min(days, 6 if daily_minutes < 45 else 7)
    if days <= 21:
        return 8 if daily_minutes < 45 else 10
    if days <= 45:
        return 10 if daily_minutes < 45 else 12
    return 12


def _offsets_for(days: int, count: int) -> list[int]:
    if count <= 1:
        return [1]
    offsets = []
    for index in range(count):
        raw = 1 + round(index * max(days - 1, 1) / (count - 1))
        offsets.append(max(1, min(days, raw)))
    deduped: list[int] = []
    for offset in offsets:
        if not deduped or deduped[-1] != offset:
            deduped.append(offset)
    while len(deduped) < count:
        deduped.append(min(days, deduped[-1] + 1))
    return deduped[:count]


def _clean_json(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    return match.group(0) if match else cleaned


def _normalize_tasks(raw_tasks: Any, days: int, daily_minutes: int) -> list[dict[str, Any]]:
    if not isinstance(raw_tasks, list):
        return []

    normalized: list[dict[str, Any]] = []
    for item in raw_tasks:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()
        if not title:
            continue
        title = re.sub(r"\s+", " ", title)[:80]
        try:
            day = int(item.get("days_from_start", len(normalized) + 1))
        except (TypeError, ValueError):
            day = len(normalized) + 1
        day = max(1, min(days, day))
        minutes = item.get("estimated_minutes", daily_minutes)
        try:
            minutes = int(minutes)
        except (TypeError, ValueError):
            minutes = daily_minutes
        minutes = max(5, min(max(daily_minutes, 5), minutes))
        normalized.append(
            {
                "title": title,
                "days_from_start": day,
                "estimated_minutes": minutes,
            }
        )

    normalized.sort(key=lambda item: item["days_from_start"])
    return normalized[:18]


def _fallback_tasks(goal: str, days: int, daily_minutes: int) -> list[dict[str, Any]]:
    count = _task_count(days, daily_minutes)
    offsets = _offsets_for(days, count)
    goal_text = re.split(r"[：:，,。；;、\s]+", re.sub(r"\s+", " ", goal.strip()), maxsplit=1)[0][:16] or "学习目标"
    templates = [
        "目标拆解｜明确{goal}的考试范围和产出",
        "资料梳理｜整理{goal}资料、错题和重点清单",
        "核心概念｜完成{goal}第一轮知识点梳理",
        "例题训练｜针对{goal}完成典型题练习",
        "薄弱补齐｜复盘错题并补齐不熟知识点",
        "综合练习｜按真实时间完成一组综合题",
        "输出复述｜用自己的话讲清关键方法",
        "冲刺复盘｜整理最终提纲和必背清单",
    ]
    if count > len(templates):
        templates.extend([f"专项巩固｜完成第 {i + 1} 轮练习与复盘" for i in range(count - len(templates))])

    return [
        {
            "title": templates[index].format(goal=goal_text),
            "days_from_start": offsets[index],
            "estimated_minutes": daily_minutes,
        }
        for index in range(count)
    ]


def _build_tasks(goal: str, deadline: datetime | None, daily_minutes: int) -> list[dict[str, Any]]:
    days = _planning_days(deadline)
    deepseek_ready = llm.provider == "deepseek" and getattr(llm, "_deepseek_configured", lambda: False)()
    if not deepseek_ready:
        return _fallback_tasks(goal, days, daily_minutes)

    try:
        result = llm.generate_tasks(goal, _deadline_label(deadline), daily_minutes)
        data = json.loads(_clean_json(result))
        tasks = _normalize_tasks(data.get("tasks"), days, daily_minutes)
    except Exception:
        tasks = []

    if len(tasks) < 3:
        tasks = _fallback_tasks(goal, days, daily_minutes)

    return tasks


def _due_date(today: datetime, deadline: datetime | None, days_from_start: int) -> datetime:
    due = datetime.combine(today.date(), time(hour=20)) + timedelta(days=max(1, days_from_start) - 1)
    if deadline and due > deadline:
        return deadline
    return due


def _create_tasks_for_plan(plan: Plan, user_id: int, db: Session) -> list[Task]:
    today = datetime.utcnow()
    tasks_data = _build_tasks(plan.goal, plan.deadline, plan.daily_minutes)
    tasks: list[Task] = []

    for item in tasks_data:
        minutes = item.get("estimated_minutes")
        title = item["title"]
        if minutes:
            title = f"{title}（{minutes}分钟）"
        task = Task(
            user_id=user_id,
            plan_id=plan.id,
            title=title,
            due_date=_due_date(today, plan.deadline, int(item.get("days_from_start", 1))),
        )
        db.add(task)
        tasks.append(task)

    return tasks


@router.get("/", response_model=list[PlanOut])
def list_plans(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Plan).filter(Plan.user_id == user.id).order_by(Plan.created_at.desc()).all()


@router.post("/", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(body: PlanCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = Plan(user_id=user.id, **body.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)

    _create_tasks_for_plan(plan, user.id, db)
    db.commit()
    return plan


@router.post("/{plan_id}/generate-tasks")
def generate_tasks_for_plan(plan_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Regenerate actionable tasks for an existing plan."""
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.user_id == user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="plan not found")

    db.query(Task).filter(Task.plan_id == plan_id, Task.user_id == user.id).delete()
    new_tasks = _create_tasks_for_plan(plan, user.id, db)
    db.commit()
    for task in new_tasks:
        db.refresh(task)

    return {
        "tasks": [
            {
                "id": task.id,
                "title": task.title,
                "due_date": task.due_date.isoformat() if task.due_date else None,
            }
            for task in new_tasks
        ]
    }


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.user_id == user.id).first()
    if plan:
        db.delete(plan)
        db.commit()
