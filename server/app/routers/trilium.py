from fastapi import APIRouter, HTTPException, Depends, Header, Query
from typing import Optional

from app.services.trilium_client import TriliumClient

router = APIRouter(prefix="", tags=["trilium"])


def get_trilium_client(
    url: str = Header(None, alias="X-Trilium-Url"),
    token: str = Header(None, alias="X-Trilium-Token"),
) -> TriliumClient:
    if not url or not token:
        raise HTTPException(400, "缺少 Trilium URL 或 Token 头")
    return TriliumClient(url, token)


@router.post("/trilium/verify")
def verify(client: TriliumClient = Depends(get_trilium_client)):
    try:
        info = client.get_app_info()
        return {"ok": True, "app_name": info.get("appName", "Trilium"), "version": info.get("appVersion", ""), "build": info.get("buildNumber", "")}
    except Exception as e:
        raise HTTPException(400, f"连接失败: {e}")


@router.get("/trilium/root/children")
def get_root_children(client: TriliumClient = Depends(get_trilium_client)):
    items = client.get_root()
    return [{"id": n["noteId"], "title": n["title"], "type": n.get("type", "text"), "children_count": len(n.get("children", [])), "date_created": n.get("dateCreated", ""), "date_modified": n.get("dateModified", "")} for n in items]


@router.get("/trilium/notes/{note_id}")
def get_note(note_id: str, client: TriliumClient = Depends(get_trilium_client)):
    n = client.get_note(note_id)
    return {"id": n["noteId"], "title": n["title"], "type": n.get("type", "text"), "mime": n.get("mime", "text/html"), "date_created": n.get("dateCreated", ""), "date_modified": n.get("dateModified", "")}


@router.get("/trilium/notes/{note_id}/content")
def get_note_content(note_id: str, client: TriliumClient = Depends(get_trilium_client)):
    content = client.get_note_content(note_id)
    if isinstance(content, dict):
        return {"content": content.get("content", ""), "title": content.get("title", "")}
    return {"content": content}


@router.get("/trilium/notes/{note_id}/children")
def get_children(note_id: str, client: TriliumClient = Depends(get_trilium_client)):
    items = client.get_children(note_id)
    def _build(nodes):
        result = []
        for n in nodes:
            item = {"id": n["noteId"], "title": n["title"], "type": n.get("type", "text"), "children": []}
            if "children" in n and n["children"]:
                item["children"] = _build(n["children"])
            result.append(item)
        return result
    return _build(items)


@router.post("/trilium/notes")
def create_note(parent_note_id: str = Query(...), title: str = Query(...), content: str = "", type_: str = Query("text", alias="type"), client: TriliumClient = Depends(get_trilium_client)):
    n = client.create_note(parent_note_id, title, content, type_)
    return {"ok": True, "id": n.get("note", {}).get("noteId", ""), "branch_id": n.get("branch", {}).get("branchId", "")}


@router.put("/trilium/notes/{note_id}/content")
def update_note_content(note_id: str, content: str = Query(...), title: str = "", client: TriliumClient = Depends(get_trilium_client)):
    if title: client.update_note_title(note_id, title)
    r = client.update_note_content(note_id, content)
    return {"ok": True}


@router.delete("/trilium/notes/{note_id}")
def delete_note(note_id: str, client: TriliumClient = Depends(get_trilium_client)):
    client.delete_note(note_id)
    return {"ok": True}


@router.get("/trilium/search")
def search(query: str, client: TriliumClient = Depends(get_trilium_client)):
    return client.search(query)