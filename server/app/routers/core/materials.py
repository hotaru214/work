import mimetypes
import os
import shutil
from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Course, Material, User
from app.schemas import MaterialOut, MaterialSearchResult, MaterialUpdate
from app.security import get_current_user
from app.services.retrieval import (
    _location_label,
    _matched_terms,
    _preview_for_match,
    _read_located_blocks,
    _score_chunk,
)

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


@router.get("/search", response_model=list[MaterialSearchResult])
def search_materials(
    course_id: int | None = None,
    q: str = "",
    type: str | None = None,
    category: str | None = None,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Material, Course).join(Course).filter(Course.user_id == user.id)
    if course_id is not None:
        query = query.filter(Material.course_id == course_id)
    if type:
        query = query.filter(Material.type == type)
    if category:
        query = query.filter(Material.category == category)

    keyword = q.strip()
    max_results = max(1, min(limit, 50))
    ranked: list[dict] = []

    for material, course in query.all():
        blocks = _read_located_blocks(material)
        if keyword:
            for index, block in enumerate(blocks, start=1):
                chunk = block["text"]
                score = _score_chunk(chunk, keyword)
                if score > 0:
                    matches = _matched_terms(chunk, keyword)
                    ranked.append(
                        {
                            "material": material,
                            "course": course,
                            "chunk_index": index,
                            "page_number": block.get("page_number"),
                            "text": chunk,
                            "matches": matches,
                            "preview": _preview_for_match(chunk, matches),
                            "score": score,
                        }
                    )
            if keyword.lower() in material.filename.lower():
                chunk = blocks[0]["text"] if blocks else f"文件名匹配：{material.filename}"
                matches = _matched_terms(material.filename, keyword) or [keyword]
                ranked.append(
                    {
                        "material": material,
                        "course": course,
                        "chunk_index": 1,
                        "page_number": blocks[0].get("page_number") if blocks else None,
                        "text": chunk,
                        "matches": matches,
                        "preview": _preview_for_match(chunk, matches) or f"文件名匹配：{material.filename}",
                        "score": 0.5,
                    }
                )
        else:
            chunk = blocks[0]["text"] if blocks else f"（此文件暂未解析出正文：{material.filename}）"
            ranked.append(
                {
                    "material": material,
                    "course": course,
                    "chunk_index": 1,
                    "page_number": blocks[0].get("page_number") if blocks else None,
                    "text": chunk,
                    "matches": [],
                    "preview": _preview_for_match(chunk, []),
                    "score": 0.0,
                }
            )

    ranked.sort(key=lambda item: item["score"], reverse=True)
    results: list[MaterialSearchResult] = []
    for item in ranked[:max_results]:
        material = item["material"]
        course = item["course"]
        results.append(
            MaterialSearchResult(
                material_id=material.id,
                course_id=material.course_id,
                course_name=course.name,
                filename=material.filename,
                type=material.type,
                category=material.category,
                uploaded_at=material.uploaded_at,
                chunk_index=item["chunk_index"],
                page_number=item.get("page_number"),
                location=_location_label(item.get("page_number"), item["chunk_index"]),
                text=item["text"],
                preview=item.get("preview") or _preview_for_match(item["text"], item.get("matches", [])),
                matches=item.get("matches", []),
                score=float(item["score"]),
            )
        )
    return results


@router.post("/course/{course_id}", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def upload(
    course_id: int,
    file: UploadFile = File(...),
    type: str = "other",
    category: str = Form("other"),
    due_date: str | None = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = _ensure_owned(course_id, user, db)
    course_dir = os.path.join(settings.UPLOAD_DIR, f"course_{course.id}")
    os.makedirs(course_dir, exist_ok=True)
    dest = os.path.join(course_dir, file.filename or "upload.bin")
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    parsed_due: datetime | None = None
    if due_date:
        try:
            parsed_due = datetime.fromisoformat(due_date)
        except ValueError:
            pass

    material = Material(
        course_id=course.id,
        filename=file.filename or "upload.bin",
        type=type,
        category=category,
        due_date=parsed_due,
        content_path=dest,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.get("/{material_id}/download")
def download_material(material_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Material).join(Course).filter(Material.id == material_id, Course.user_id == user.id).first()
    if not m:
        raise HTTPException(status_code=404, detail="material not found")
    if not os.path.exists(m.content_path):
        raise HTTPException(status_code=404, detail="file not found on disk")

    media_type, _ = mimetypes.guess_type(m.filename)
    if media_type is None:
        media_type = "application/octet-stream"

    encoded_filename = quote(m.filename)
    # RFC 5987 编码 + 兜底 ASCII filename，兼容所有浏览器
    disposition = f"inline; filename*=UTF-8''{encoded_filename}"

    return FileResponse(
        m.content_path,
        media_type=media_type,
        headers={"Content-Disposition": disposition},
    )


@router.get("/{material_id}", response_model=MaterialOut)
def get_material(material_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Material).join(Course).filter(Material.id == material_id, Course.user_id == user.id).first()
    if not m:
        raise HTTPException(status_code=404, detail="material not found")
    return m


@router.patch("/{material_id}", response_model=MaterialOut)
def update_material(
    material_id: int,
    body: MaterialUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    material = db.query(Material).join(Course).filter(Material.id == material_id, Course.user_id == user.id).first()
    if not material:
        raise HTTPException(status_code=404, detail="material not found")

    data = body.model_dump(exclude_unset=True)
    if "filename" in data and data["filename"] is not None:
        material.filename = data["filename"].strip() or material.filename
    if "type" in data and data["type"] is not None:
        material.type = data["type"].strip() or "other"
    if "category" in data and data["category"] is not None:
        material.category = data["category"].strip() or "other"
    if "due_date" in data:
        material.due_date = data["due_date"]

    db.commit()
    db.refresh(material)
    return material


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(material_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Material).join(Course).filter(Material.id == material_id, Course.user_id == user.id).first()
    if not m:
        raise HTTPException(status_code=404, detail="material not found")
    if os.path.exists(m.content_path):
        os.remove(m.content_path)
    db.delete(m)
    db.commit()
