import string
import random
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, KBNote, KBBranch, KBAttribute, KBRevision
from app.schemas import (
    KBNoteCreate, KBNoteUpdate, KBNoteOut,
    KBBranchOut, KBAttributeCreate, KBAttributeOut,
)
from app.security import get_current_user

router = APIRouter()


def _generate_id(prefix: str = "") -> str:
    """Generate a short unique ID similar to Trilium."""
    chars = string.ascii_lowercase + string.digits
    return prefix + "".join(random.choices(chars, k=10))


def _note_to_out(note: KBNote, children: list = None) -> dict:
    return {
        "noteId": note.note_id,
        "title": note.title,
        "type": note.type,
        "mime": note.mime,
        "isProtected": note.is_protected,
        "isDeleted": note.is_deleted,
        "content": note.content or "",
        "dateCreated": note.created_at.isoformat(),
        "dateModified": note.updated_at.isoformat(),
        "children": children or [],
    }


def _get_children_tree(note_id: str, db: Session) -> list:
    """Recursively build children tree."""
    branches = db.query(KBBranch).filter(
        KBBranch.parent_note_id == note_id
    ).order_by(KBBranch.note_position).all()

    result = []
    for branch in branches:
        child_note = db.query(KBNote).filter(
            KBNote.note_id == branch.note_id,
            KBNote.is_deleted == False
        ).first()
        if child_note:
            grandchildren = _get_children_tree(child_note.note_id, db)
            result.append(_note_to_out(child_note, grandchildren))
    return result


# ==================== Note Tree ====================

@router.get("/kb/roots", response_model=list)
def get_root_notes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get root-level notes (top-level knowledge bases)."""
    root_marker = f"root_{user.id}"

    # Notes whose branch parent is the root marker
    root_ids = set(
        row[0] for row in db.query(KBBranch.note_id).filter(
            KBBranch.parent_note_id == root_marker
        ).all()
    )

    # Also include orphan notes (no branch at all) for backward compatibility
    all_child_ids = set(
        row[0] for row in db.query(KBBranch.note_id).all()
    )

    notes = db.query(KBNote).filter(
        KBNote.user_id == user.id,
        KBNote.is_deleted == False
    ).all()

    roots = [
        n for n in notes
        if n.note_id in root_ids or n.note_id not in all_child_ids
    ]
    roots.sort(key=lambda n: n.updated_at or n.created_at, reverse=True)

    return [_note_to_out(n, _get_children_tree(n.note_id, db)) for n in roots]



@router.get("/kb/notes/{note_id}", response_model=dict)
def get_note(note_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get a single note with its children."""
    note = db.query(KBNote).filter(
        KBNote.note_id == note_id,
        KBNote.user_id == user.id,
        KBNote.is_deleted == False
    ).first()
    if not note:
        raise HTTPException(404, "笔记不存在")
    children = _get_children_tree(note.note_id, db)
    return _note_to_out(note, children)


@router.get("/kb/notes/{note_id}/content", response_model=dict)
def get_note_content(note_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get note content."""
    note = db.query(KBNote).filter(
        KBNote.note_id == note_id,
        KBNote.user_id == user.id,
        KBNote.is_deleted == False
    ).first()
    if not note:
        raise HTTPException(404, "笔记不存在")
    return {"content": note.content or "", "title": note.title}


@router.get("/kb/notes/{note_id}/tree", response_model=list)
def get_note_tree(note_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get full subtree under a note."""
    note = db.query(KBNote).filter(
        KBNote.note_id == note_id,
        KBNote.user_id == user.id,
        KBNote.is_deleted == False
    ).first()
    if not note:
        raise HTTPException(404, "笔记不存在")
    return _get_children_tree(note_id, db)


@router.post("/kb/notes", response_model=dict, status_code=201)
def create_note(body: KBNoteCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new note under a parent."""
    note_id = _generate_id()
    while db.query(KBNote).filter(KBNote.note_id == note_id).first():
        note_id = _generate_id()

    note = KBNote(
        note_id=note_id,
        user_id=user.id,
        title=body.title,
        type=body.type,
        mime=body.mime,
        content=body.content,
    )
    db.add(note)
    db.flush()

    # Find max position
    max_pos = db.query(KBBranch.note_position).filter(
        KBBranch.parent_note_id == body.parent_note_id
    ).order_by(desc(KBBranch.note_position)).first()
    next_pos = (max_pos[0] + 1) if max_pos and max_pos[0] is not None else 0

    branch_id = _generate_id("br")
    while db.query(KBBranch).filter(KBBranch.branch_id == branch_id).first():
        branch_id = _generate_id("br")

    actual_parent_id = body.parent_note_id
    if actual_parent_id == "__root__":
        # Find or create a virtual root for this user
        actual_parent_id = f"root_{user.id}"

    branch = KBBranch(
        branch_id=branch_id,
        note_id=note_id,
        parent_note_id=actual_parent_id,
        note_position=next_pos,
    )
    db.add(branch)
    db.commit()

    return {
        "note": _note_to_out(note, []),
        "branch": {
            "branchId": branch.branch_id,
            "noteId": branch.note_id,
            "parentNoteId": branch.parent_note_id,
            "notePosition": branch.note_position,
        }
    }


@router.put("/kb/notes/{note_id}/content")
def update_note_content(
    note_id: str,
    body: KBNoteUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update note content and/or title."""
    note = db.query(KBNote).filter(
        KBNote.note_id == note_id,
        KBNote.user_id == user.id,
        KBNote.is_deleted == False
    ).first()
    if not note:
        raise HTTPException(404, "笔记不存在")

    if body.title is not None:
        # Save revision before changing
        _save_revision(note, db)
        note.title = body.title
    if body.content is not None:
        _save_revision(note, db)
        note.content = body.content
    if body.type is not None:
        note.type = body.type
    if body.mime is not None:
        note.mime = body.mime

    db.commit()
    return {"ok": True, "note": _note_to_out(note, [])}


@router.delete("/kb/notes/{note_id}")
def delete_note(note_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Soft delete a note and its children."""
    note = db.query(KBNote).filter(
        KBNote.note_id == note_id,
        KBNote.user_id == user.id
    ).first()
    if not note:
        raise HTTPException(404, "笔记不存在")

    # Recursively soft delete children
    def _soft_delete(nid: str):
        n = db.query(KBNote).filter(KBNote.note_id == nid).first()
        if n:
            n.is_deleted = True
            children = db.query(KBBranch).filter(KBBranch.parent_note_id == nid).all()
            for child in children:
                _soft_delete(child.note_id)

    _soft_delete(note_id)
    db.commit()
    return {"ok": True}


@router.patch("/kb/notes/{note_id}/move")
def move_note(
    note_id: str,
    parent_note_id: str = Query(...),
    note_position: int = Query(0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Move a note to a new parent."""
    branch = db.query(KBBranch).filter(KBBranch.note_id == note_id).first()
    if not branch:
        raise HTTPException(404, "分支不存在")
    branch.parent_note_id = parent_note_id
    branch.note_position = note_position
    db.commit()
    return {"ok": True}


# ==================== Attributes ====================

@router.get("/kb/notes/{note_id}/attributes", response_model=list)
def get_attributes(note_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get attributes for a note."""
    attrs = db.query(KBAttribute).filter(KBAttribute.note_id == note_id).order_by(KBAttribute.position).all()
    return [{
        "attributeId": a.attribute_id,
        "noteId": a.note_id,
        "type": a.type,
        "name": a.name,
        "value": a.value,
        "position": a.position,
    } for a in attrs]


@router.post("/kb/attributes", response_model=dict, status_code=201)
def create_attribute(body: KBAttributeCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create an attribute (label/relation) on a note."""
    attr_id = _generate_id("attr")
    while db.query(KBAttribute).filter(KBAttribute.attribute_id == attr_id).first():
        attr_id = _generate_id("attr")

    attr = KBAttribute(
        attribute_id=attr_id,
        note_id=body.note_id,
        type=body.type,
        name=body.name,
        value=body.value,
    )
    db.add(attr)
    db.commit()

    return {
        "attributeId": attr.attribute_id,
        "noteId": attr.note_id,
        "type": attr.type,
        "name": attr.name,
        "value": attr.value,
    }


@router.delete("/kb/attributes/{attribute_id}")
def delete_attribute(attribute_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete an attribute."""
    attr = db.query(KBAttribute).filter(KBAttribute.attribute_id == attribute_id).first()
    if not attr:
        raise HTTPException(404, "属性不存在")
    db.delete(attr)
    db.commit()
    return {"ok": True}


# ==================== Internal Helpers ====================

def _save_revision(note: KBNote, db: Session):
    """Save a revision before modifying a note."""
    rev_id = _generate_id("rev")
    while db.query(KBRevision).filter(KBRevision.revision_id == rev_id).first():
        rev_id = _generate_id("rev")

    rev = KBRevision(
        revision_id=rev_id,
        note_id=note.note_id,
        title=note.title,
        type=note.type,
        mime=note.mime,
        content=note.content or "",
    )
    db.add(rev)


@router.get("/kb/notes/{note_id}/revisions", response_model=list)
def get_revisions(note_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get revision history for a note."""
    revs = db.query(KBRevision).filter(
        KBRevision.note_id == note_id
    ).order_by(desc(KBRevision.created_at)).all()
    return [{
        "revisionId": r.revision_id,
        "title": r.title,
        "type": r.type,
        "mime": r.mime,
        "content": r.content,
        "dateCreated": r.created_at.isoformat(),
    } for r in revs]


# ==================== Search ====================

@router.get("/kb/search", response_model=list)
def search_notes(
    query: str = Query(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search notes by title and content."""
    search_term = f"%{query}%"
    notes = db.query(KBNote).filter(
        KBNote.user_id == user.id,
        KBNote.is_deleted == False,
        (KBNote.title.ilike(search_term) | KBNote.content.ilike(search_term))
    ).limit(50).all()

    return [_note_to_out(n, []) for n in notes]




