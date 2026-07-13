import os
import time
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import Token, UserCreate, UserLogin, UserOut, UserProfileUpdate
from app.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter()

ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024
LOGIN_WINDOW_SECONDS = 5 * 60
LOGIN_LOCK_SECONDS = 5 * 60
MAX_LOGIN_ATTEMPTS = 5
_LOGIN_ATTEMPTS: dict[str, tuple[int, float]] = {}
_DUMMY_PASSWORD_HASH = hash_password("Dummy-Password-For-Timing-Only-123!")


def _login_key(request: Request, username: str) -> str:
    client = request.client.host if request.client else "unknown"
    return f"{client}:{username}"


def _check_login_rate(key: str) -> None:
    attempts, first_seen = _LOGIN_ATTEMPTS.get(key, (0, 0.0))
    now = time.monotonic()
    if attempts >= MAX_LOGIN_ATTEMPTS and now - first_seen < LOGIN_LOCK_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="登录失败次数过多，请 5 分钟后再试",
        )
    if now - first_seen >= LOGIN_WINDOW_SECONDS:
        _LOGIN_ATTEMPTS.pop(key, None)


def _mark_login_failure(key: str) -> None:
    now = time.monotonic()
    attempts, first_seen = _LOGIN_ATTEMPTS.get(key, (0, now))
    if now - first_seen >= LOGIN_WINDOW_SECONDS:
        attempts, first_seen = 0, now
    _LOGIN_ATTEMPTS[key] = (attempts + 1, first_seen)


def _clear_login_failures(key: str) -> None:
    _LOGIN_ATTEMPTS.pop(key, None)


def _save_avatar(file: UploadFile) -> str:
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=400, detail="unsupported avatar type")
    content = file.file.read(MAX_AVATAR_BYTES + 1)
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="avatar is too large")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        ext = ".png"
    avatar_dir = os.path.join(settings.UPLOAD_DIR, "avatars")
    os.makedirs(avatar_dir, exist_ok=True)
    filename = f"{uuid4().hex}{ext}"
    path = os.path.join(avatar_dir, filename)
    with open(path, "wb") as f:
        f.write(content)
    return f"/uploads/avatars/{filename}"


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
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
def login(body: UserLogin, request: Request, db: Session = Depends(get_db)):
    login_key = _login_key(request, body.username)
    _check_login_rate(login_key)
    user = db.query(User).filter(User.username == body.username).first()
    password_hash = user.password_hash if user else _DUMMY_PASSWORD_HASH
    if not verify_password(body.password, password_hash) or not user:
        _mark_login_failure(login_key)
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    _clear_login_failures(login_key)
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
