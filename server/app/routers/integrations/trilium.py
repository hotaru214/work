from fastapi import APIRouter, Header, HTTPException

router = APIRouter()


@router.post("/verify")
def verify_trilium(
    x_trilium_url: str | None = Header(default=None),
    x_trilium_token: str | None = Header(default=None),
):
    if not x_trilium_url or not x_trilium_token:
        raise HTTPException(status_code=400, detail="missing trilium connection info")
    return {
        "app_name": "Trilium Notes",
        "version": "local",
        "build": "proxy-placeholder",
        "url": x_trilium_url,
    }
