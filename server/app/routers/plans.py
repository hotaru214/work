from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Plan, User
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
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.user_id == user.id).first()
    if plan:
        db.delete(plan)
        db.commit()