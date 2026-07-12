from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Course, Material, User
from app.schemas import CourseCreate, CourseOut
from app.security import get_current_user
from app.services.llm import LLMClient
from app.services.retrieval import _read_content

router = APIRouter()
llm = LLMClient()


@router.get("/", response_model=list[CourseOut])
def list_courses(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Course).filter(Course.user_id == user.id).all()


@router.post("/", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(body: CourseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = Course(user_id=user.id, **body.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseOut)
def get_course(course_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="course not found")
    return course


@router.put("/{course_id}", response_model=CourseOut)
def update_course(course_id: int, body: CourseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="course not found")
    for k, v in body.model_dump().items():
        setattr(course, k, v)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="course not found")
    db.delete(course)
    db.commit()


@router.post("/{course_id}/summary")
def generate_summary(course_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """根据课程所有资料，AI 生成知识点复习提纲。"""
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="course not found")

    materials = db.query(Material).filter(Material.course_id == course_id).all()
    if not materials:
        raise HTTPException(status_code=400, detail="该课程没有资料，请先上传学习资料")

    material_data = []
    for m in materials:
        text = _read_content(m)
        material_data.append({"filename": m.filename, "text": text})

    summary = llm.generate_summary(course.name, material_data)
    return {"summary": summary}