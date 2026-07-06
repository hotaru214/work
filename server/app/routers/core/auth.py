import os
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import Token, UserCreate, UserOut, UserProfileUpdate
from app.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter()

ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _save_avatar(file: UploadFile) -> str:
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=400, detail="unsupported avatar type")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        ext = ".png"
    avatar_dir = os.path.join(settings.UPLOAD_DIR, "avatars")
    os.makedirs(avatar_dir, exist_ok=True)
    filename = f"{uuid4().hex}{ext}"
    path = os.path.join(avatar_dir, filename)
    with open(path, "wb") as f:
        f.write(file.file.read())
    return f"/uploads/avatars/{filename}"


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="username already exists")
    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        nickname=(body.nickname or "学习者").strip() or "学习者",
        avatar_url=body.avatar_url,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(body: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")
    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(
    body: UserProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_user = db.get(User, user.id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="user not found")
    if body.nickname is not None:
        db_user.nickname = body.nickname.strip() or "学习者"
    if body.avatar_url is not None:
        db_user.avatar_url = body.avatar_url
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/avatar")
def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    avatar_url = _save_avatar(file)
    return {"avatar_url": avatar_url}


@router.post("/register/avatar")
def upload_register_avatar(file: UploadFile = File(...)):
    return {"avatar_url": _save_avatar(file)}
