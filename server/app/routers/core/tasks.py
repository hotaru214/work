from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Task, User
from app.schemas import TaskCreate, TaskOut, TaskUpdate
from app.security import get_current_user

router = APIRouter()


@router.get("/", response_model=list[TaskOut])
def list_tasks(done: bool | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Task).filter(Task.user_id == user.id)
    if done is not None:
        q = q.filter(Task.done == done)
    return q.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc()).all()


@router.post("/", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(body: TaskCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = Task(user_id=user.id, **body.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/done", response_model=TaskOut)
def toggle_done(task_id: int, done: bool, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    task.done = done
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, body: TaskUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="task not found")

    data = body.model_dump(exclude_unset=True)
    if "title" in data and data["title"] is not None:
        task.title = data["title"].strip() or task.title
    if "due_date" in data:
        task.due_date = data["due_date"]
    if "plan_id" in data:
        task.plan_id = data["plan_id"]
    if "done" in data and data["done"] is not None:
        task.done = data["done"]

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if task:
        db.delete(task)
        db.commit()
