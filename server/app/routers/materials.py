import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Course, Material, User
from app.schemas import MaterialOut
from app.security import get_current_user

router = APIRouter()


def _ensure_owned(course_id: int, user: User, db: Session) -> Course:
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="course not found")
    return course


@router.get("/course/{course_id}", response_model=list[MaterialOut])
def list_for_course(course_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_owned(course_id, user, db)
    return db.query(Material).filter(Material.course_id == course_id).all()


@router.post("/course/{course_id}", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def upload(course_id: int, file: UploadFile = File(...), type: str = "other",
           user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = _ensure_owned(course_id, user, db)
    course_dir = os.path.join(settings.UPLOAD_DIR, f"course_{course.id}")
    os.makedirs(course_dir, exist_ok=True)
    dest = os.path.join(course_dir, file.filename or "upload.bin")
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    material = Material(course_id=course.id, filename=file.filename or "upload.bin", type=type, content_path=dest)
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.get("/{material_id}", response_model=MaterialOut)
def get_material(material_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Material).join(Course).filter(Material.id == material_id, Course.user_id == user.id).first()
    if not m:
        raise HTTPException(status_code=404, detail="material not found")
    return m


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(material_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Material).join(Course).filter(Material.id == material_id, Course.user_id == user.id).first()
    if not m:
        raise HTTPException(status_code=404, detail="material not found")
    if os.path.exists(m.content_path):
        os.remove(m.content_path)
    db.delete(m)
    db.commit()