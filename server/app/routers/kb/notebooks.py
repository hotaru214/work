from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Notebook, Doc, DocTag, Tag, User
from app.schemas import NotebookCreate, NotebookOut, DocCreate, DocOut, DocTreeItem, DocUpdate
from app.security import get_current_user

router = APIRouter()


# ==================== Notebook ====================

@router.get("/", response_model=list[NotebookOut])
def list_notebooks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notebooks = db.query(Notebook).filter(Notebook.user_id == user.id).order_by(desc(Notebook.created_at)).all()
    result = []
    for nb in notebooks:
        doc_count = db.query(Doc).filter(Doc.notebook_id == nb.id, Doc.parent_id == None).count()
        result.append(NotebookOut(
            **{c.name: getattr(nb, c.name) for c in Notebook.__table__.columns},
            doc_count=doc_count,
        ))
    return result


@router.post("/", response_model=NotebookOut, status_code=status.HTTP_201_CREATED)
def create_notebook(body: NotebookCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    nb = Notebook(user_id=user.id, name=body.name, description=body.description, is_public=body.is_public)
    db.add(nb)
    db.commit()
    db.refresh(nb)
    return NotebookOut(**{c.name: getattr(nb, c.name) for c in Notebook.__table__.columns}, doc_count=0)


@router.get("/{notebook_id}", response_model=NotebookOut)
def get_notebook(notebook_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id, Notebook.user_id == user.id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="notebook not found")
    doc_count = db.query(Doc).filter(Doc.notebook_id == nb.id, Doc.parent_id == None).count()
    return NotebookOut(**{c.name: getattr(nb, c.name) for c in Notebook.__table__.columns}, doc_count=doc_count)


@router.put("/{notebook_id}", response_model=NotebookOut)
def update_notebook(notebook_id: int, body: NotebookCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id, Notebook.user_id == user.id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="notebook not found")
    nb.name = body.name
    nb.description = body.description
    nb.is_public = body.is_public
    db.commit()
    db.refresh(nb)
    doc_count = db.query(Doc).filter(Doc.notebook_id == nb.id, Doc.parent_id == None).count()
    return NotebookOut(**{c.name: getattr(nb, c.name) for c in Notebook.__table__.columns}, doc_count=doc_count)


@router.delete("/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notebook(notebook_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id, Notebook.user_id == user.id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="notebook not found")
    db.delete(nb)
    db.commit()


# ==================== Doc ====================

def _build_tree(parent_id: int | None, db: Session) -> list:
    docs = db.query(Doc).filter(Doc.parent_id == parent_id).order_by(Doc.sort_order, Doc.created_at).all()
    items = []
    for d in docs:
        children = _build_tree(d.id, db)
        items.append(DocTreeItem(id=d.id, parent_id=d.parent_id, title=d.title, sort_order=d.sort_order, children=children))
    return items


@router.get("/{notebook_id}/docs", response_model=list[DocTreeItem])
def list_docs(notebook_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id, Notebook.user_id == user.id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="notebook not found")
    return _build_tree(None, db)


@router.post("/{notebook_id}/docs", response_model=DocOut, status_code=status.HTTP_201_CREATED)
def create_doc(notebook_id: int, body: DocCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id, Notebook.user_id == user.id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="notebook not found")

    if body.parent_id is not None:
        parent = db.query(Doc).filter(Doc.id == body.parent_id, Doc.notebook_id == notebook_id).first()
        if not parent:
            raise HTTPException(status_code=400, detail="invalid parent_id")

    doc = Doc(
        notebook_id=notebook_id,
        user_id=user.id,
        parent_id=body.parent_id,
        title=body.title,
        content=body.content,
        is_public=body.is_public,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    for tid in body.tag_ids:
        tag = db.query(Tag).filter(Tag.id == tid).first()
        if tag:
            db.add(DocTag(doc_id=doc.id, tag_id=tid))
    db.commit()
    db.refresh(doc)

    tags = [dt.tag for dt in doc.tags]
    result = DocOut(
        **{c.name: getattr(doc, c.name) for c in Doc.__table__.columns},
        tags=tags,
    )
    return result


@router.get("/docs/{doc_id}", response_model=DocOut)
def get_doc(doc_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Doc).filter(Doc.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="doc not found")
    nb = db.query(Notebook).filter(Notebook.id == doc.notebook_id).first()
    if not nb or (nb.user_id != user.id and not doc.is_public):
        raise HTTPException(status_code=404, detail="doc not found")
    doc.view_count += 1
    db.commit()
    tags = [dt.tag for dt in doc.tags]
    return DocOut(
        **{c.name: getattr(doc, c.name) for c in Doc.__table__.columns},
        tags=tags,
    )


@router.put("/docs/{doc_id}", response_model=DocOut)
def update_doc(doc_id: int, body: DocUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Doc).filter(Doc.id == doc_id, Doc.user_id == user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="doc not found")
    if body.title is not None:
        doc.title = body.title
    if body.content is not None:
        doc.content = body.content
    if body.is_public is not None:
        doc.is_public = body.is_public
    if body.parent_id is not None:
        doc.parent_id = body.parent_id
    if body.sort_order is not None:
        doc.sort_order = body.sort_order
    if body.tag_ids is not None:
        db.query(DocTag).filter(DocTag.doc_id == doc.id).delete()
        for tid in body.tag_ids:
            tag = db.query(Tag).filter(Tag.id == tid).first()
            if tag:
                db.add(DocTag(doc_id=doc.id, tag_id=tid))
    db.commit()
    db.refresh(doc)
    tags = [dt.tag for dt in doc.tags]
    return DocOut(
        **{c.name: getattr(doc, c.name) for c in Doc.__table__.columns},
        tags=tags,
    )


@router.delete("/docs/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doc(doc_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Doc).filter(Doc.id == doc_id, Doc.user_id == user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="doc not found")
    db.delete(doc)
    db.commit()
