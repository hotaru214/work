from fastapi import APIRouter, Header, HTTPException

router = APIRouter()


@router.post("/verify")
def verify_yuque(x_yuque_token: str | None = Header(default=None)):
    if not x_yuque_token:
        raise HTTPException(status_code=400, detail="missing yuque token")
    return {
        "ok": True,
        "user": {
            "name": "语雀用户",
            "login": "yuque",
            "avatar_url": "",
        },
    }
