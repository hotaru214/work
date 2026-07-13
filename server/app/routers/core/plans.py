import json
import re
from datetime import date, datetime, time, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Course, Material, Plan, Task, User
from app.schemas import PlanCreate, PlanOut, StudyScheduleOut
from app.security import get_current_user
from app.services.llm import LLMClient

router = APIRouter()
llm = LLMClient()

CN_NUMBERS = {
    "一": 1,
    "二": 2,
    "两": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
    "十": 10,
}
WEEKDAY_MAP = {
    "一": 0,
    "二": 1,
    "三": 2,
    "四": 3,
    "五": 4,
    "六": 5,
    "日": 6,
    "天": 6,
}


def _parse_number(text: str) -> int | None:
    if text.isdigit():
        return int(text)
    if text in CN_NUMBERS:
        return CN_NUMBERS[text]
    if text.startswith("十") and len(text) == 2:
        return 10 + CN_NUMBERS.get(text[1], 0)
    if text.endswith("十") and len(text) == 2:
        return CN_NUMBERS.get(text[0], 0) * 10
    if "十" in text and len(text) == 3:
        left, right = text.split("十", 1)
        return CN_NUMBERS.get(left, 0) * 10 + CN_NUMBERS.get(right, 0)
    return None


def _end_of_day(day: date) -> datetime:
    return datetime.combine(day, time(hour=23, minute=59))


def _infer_deadline_from_goal(goal: str, explicit: datetime | None) -> datetime | None:
    if explicit:
        return explicit

    today = datetime.now().date()
    text = goal.strip()

    if "今天" in text:
        return _end_of_day(today)
    if "明天" in text:
        return _end_of_day(today + timedelta(days=1))
    if "后天" in text:
        return _end_of_day(today + timedelta(days=2))

    match = re.search(r"(下周|下星期)([一二三四五六日天])?", text)
    if match:
        target = WEEKDAY_MAP.get(match.group(2) or "日", 6)
        start_next_week = today + timedelta(days=(7 - today.weekday()))
        return _end_of_day(start_next_week + timedelta(days=target))

    match = re.search(r"(本周|这周|本星期|这星期)([一二三四五六日天])", text)
    if match:
        target = WEEKDAY_MAP[match.group(2)]
        delta = target - today.weekday()
        if delta < 0:
            delta += 7
        return _end_of_day(today + timedelta(days=delta))

    match = re.search(r"([0-9]+|[一二两三四五六七八九十]{1,3})\s*(天|日|周|星期|个月|月)", text)
    if match:
        amount = _parse_number(match.group(1))
        if amount:
            unit = match.group(2)
            if unit in {"天", "日"}:
                days = amount
            elif unit in {"周", "星期"}:
                days = amount * 7
            else:
                days = amount * 30
            return _end_of_day(today + timedelta(days=max(1, days)))

    return None


def _infer_course(goal: str, courses: list[Course]) -> Course | None:
    normalized_goal = goal.lower()
    matches = [course for course in courses if course.name and course.name.lower() in normalized_goal]
    if matches:
        return max(matches, key=lambda course: len(course.name))
    return None


def _deadline_label(deadline: datetime | None) -> str:
    return deadline.strftime("%Y-%m-%d") if deadline else "未设置"


def _planning_days(deadline: datetime | None) -> int:
    if not deadline:
        return 7
    today = datetime.now().date()
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


def _estimate_minutes_from_title(title: str, fallback: int = 45) -> int:
    match = re.search(r"（(\d+)分钟）|\((\d+)分钟\)", title)
    if not match:
        return fallback
    value = match.group(1) or match.group(2)
    return max(10, min(180, int(value)))


def _slot_end(start_minutes: int, duration: int) -> int:
    return start_minutes + duration


def _fmt_clock(total_minutes: int) -> str:
    hour = total_minutes // 60
    minute = total_minutes % 60
    return f"{hour:02d}:{minute:02d}"


def _make_schedule_item(
    *,
    course: Course | None,
    title: str,
    source_type: str,
    deadline: datetime | None,
    estimated_minutes: int,
    reason: str,
) -> dict[str, Any]:
    return {
        "course_id": course.id if course else None,
        "course_name": course.name if course else "综合学习",
        "title": title,
        "source_type": source_type,
        "deadline": deadline,
        "estimated_minutes": max(10, min(180, estimated_minutes)),
        "remaining_minutes": max(10, min(180, estimated_minutes)),
        "reason": reason,
    }


def _schedule_priority(item: dict[str, Any], day: date) -> tuple[int, int, str]:
    deadline = item.get("deadline")
    if deadline:
        days_left = (deadline.date() - day).days
    else:
        days_left = 99
    source_rank = {"assignment": 0, "task": 1, "plan": 2}.get(item.get("source_type"), 3)
    return (days_left, source_rank, item.get("course_name") or "")


def _build_integrated_schedule(
    *,
    courses: list[Course],
    plans: list[Plan],
    tasks: list[Task],
    assignments: list[Material],
    days: int,
    daily_minutes: int,
) -> dict[str, Any]:
    course_by_id = {course.id: course for course in courses}
    plan_by_id = {plan.id: plan for plan in plans}
    pending_task_plan_ids = {task.plan_id for task in tasks if task.plan_id}
    items: list[dict[str, Any]] = []

    for material in assignments:
        course = course_by_id.get(material.course_id)
        items.append(
            _make_schedule_item(
                course=course,
                title=f"完成资料/作业：{material.filename}",
                source_type="assignment",
                deadline=material.due_date,
                estimated_minutes=60,
                reason="课程资料设置了截止日期，优先排入综合安排。",
            )
        )

    for task in tasks:
        plan = plan_by_id.get(task.plan_id) if task.plan_id else None
        course = _infer_course(plan.goal if plan else task.title, courses)
        items.append(
            _make_schedule_item(
                course=course,
                title=task.title,
                source_type="task",
                deadline=task.due_date,
                estimated_minutes=_estimate_minutes_from_title(task.title),
                reason="来自待办任务，按截止日期和计划目标排序。",
            )
        )

    for plan in plans:
        if plan.id in pending_task_plan_ids:
            continue
        course = _infer_course(plan.goal, courses)
        items.append(
            _make_schedule_item(
                course=course,
                title=f"推进计划：{plan.goal}",
                source_type="plan",
                deadline=plan.deadline,
                estimated_minutes=plan.daily_minutes,
                reason="来自学习计划，当前没有单独待办，按每日投入安排。",
            )
        )

    today = datetime.now().date()
    day_results: list[dict[str, Any]] = []
    start_clock = 19 * 60
    max_days = max(1, min(21, days))
    capacity = max(30, min(360, daily_minutes))

    for offset in range(max_days):
        current_day = today + timedelta(days=offset)
        remaining_capacity = capacity
        cursor = start_clock
        last_course_id: int | None = None
        slots: list[dict[str, Any]] = []

        while remaining_capacity >= 10:
            candidates = [item for item in items if item["remaining_minutes"] > 0]
            if not candidates:
                break
            candidates.sort(key=lambda item: _schedule_priority(item, current_day))

            picked = candidates[0]
            for candidate in candidates:
                if candidate.get("course_id") != last_course_id:
                    picked = candidate
                    break

            duration = min(remaining_capacity, picked["remaining_minutes"], 60)
            if duration < 10:
                break
            end = _slot_end(cursor, duration)
            slots.append(
                {
                    "course_id": picked["course_id"],
                    "course_name": picked["course_name"],
                    "title": picked["title"],
                    "source_type": picked["source_type"],
                    "start_time": _fmt_clock(cursor),
                    "end_time": _fmt_clock(end),
                    "estimated_minutes": duration,
                    "deadline": picked["deadline"],
                    "reason": picked["reason"],
                }
            )
            picked["remaining_minutes"] -= duration
            remaining_capacity -= duration
            cursor = end + 10
            last_course_id = picked.get("course_id")

        day_results.append(
            {
                "date": current_day.isoformat(),
                "total_minutes": sum(slot["estimated_minutes"] for slot in slots),
                "slots": slots,
            }
        )

    unscheduled = [
        {
            "course_id": item["course_id"],
            "course_name": item["course_name"],
            "title": item["title"],
            "source_type": item["source_type"],
            "start_time": "",
            "end_time": "",
            "estimated_minutes": item["remaining_minutes"],
            "deadline": item["deadline"],
            "reason": "未来安排容量不足，暂未排入时间块。",
        }
        for item in items
        if item["remaining_minutes"] > 0
    ]

    return {"days": day_results, "unscheduled": unscheduled}


def _create_tasks_for_plan(plan: Plan, user_id: int, db: Session) -> list[Task]:
    today = datetime.now()
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
    data = body.model_dump()
    data["deadline"] = _infer_deadline_from_goal(body.goal, body.deadline)
    data["daily_minutes"] = max(5, min(360, int(body.daily_minutes or 60)))
    plan = Plan(user_id=user.id, **data)
    db.add(plan)
    db.commit()
    db.refresh(plan)

    _create_tasks_for_plan(plan, user.id, db)
    db.commit()
    return plan


@router.get("/integrated-schedule", response_model=StudyScheduleOut)
def integrated_schedule(
    days: int = 7,
    daily_minutes: int = 180,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a cross-course study schedule from plans, tasks and course assignments."""
    courses = db.query(Course).filter(Course.user_id == user.id).all()
    plans = db.query(Plan).filter(Plan.user_id == user.id).all()
    tasks = db.query(Task).filter(Task.user_id == user.id, Task.done == False).all()
    assignments = (
        db.query(Material)
        .join(Course)
        .filter(
            Course.user_id == user.id,
            Material.due_date.isnot(None),
            Material.category.in_(["assignment", "lab"]),
        )
        .all()
    )
    return _build_integrated_schedule(
        courses=courses,
        plans=plans,
        tasks=tasks,
        assignments=assignments,
        days=days,
        daily_minutes=daily_minutes,
    )


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
