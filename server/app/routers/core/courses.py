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


def _material_excerpt(text: str, limit: int = 220) -> str:
    cleaned = " ".join((text or "").split())
    if not cleaned:
        return "该资料暂未解析出正文。"
    return cleaned[:limit] + ("..." if len(cleaned) > limit else "")


def _fallback_outline(course_name: str, materials: list[dict]) -> str:
    readable = [m for m in materials if m.get("text")]
    lines = [
        f"# 《{course_name}》复习提纲",
        "",
        "## 核心知识点清单",
    ]
    if not readable:
        lines.extend([
            "- 当前课程资料尚未解析出可用文字，建议上传 txt、md 或 PDF 资料后重新生成。",
            "",
            "## 复习建议",
            "- 先补充可解析资料，再按章节整理定义、公式和典型题。",
        ])
        return "\n".join(lines)

    for index, material in enumerate(readable[:8], start=1):
        lines.append(f"- 知识点 {index}：围绕 `{material['filename']}` 中的主要内容复习。")
        lines.append(f"  - 来源片段：{_material_excerpt(material.get('text', ''))}")

    lines.extend([
        "",
        "## 公式/定义",
        "- 优先整理资料中反复出现的定义、公式、定理和步骤。",
        "",
        "## 典型题型",
        "- 根据每份资料的例题、作业或章节练习建立题型清单。",
        "",
        "## 易错点",
        "- 对照资料中的条件、适用范围和计算步骤，整理容易漏写或混淆的地方。",
        "",
        "## 复习优先级",
        "1. 先复习考试/作业截止时间最近的资料。",
        "2. 再复习覆盖章节最多、篇幅最长的资料。",
        "3. 最后用错题和自测题查缺补漏。",
        "",
        "## 来源资料",
    ])
    lines.extend(f"- {material['filename']}" for material in materials[:10])
    return "\n".join(lines)


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
    if summary.startswith(("[mock]", "[API 错误", "[网络错误]")):
        summary = _fallback_outline(course.name, material_data)
    return {"summary": summary}
