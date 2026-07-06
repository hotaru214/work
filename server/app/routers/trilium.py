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
    """Verify Trilium connection and return app info."""
    try:
        info = client.get_app_info()
        return {
            "ok": True,
            "app_name": info.get("appName", "Trilium"),
            "version": info.get("appVersion", ""),
            "build": info.get("buildNumber", ""),
        }
    except Exception as e:
        raise HTTPException(400, f"连接失败: {e}")


@router.get("/trilium/root/children")
def get_root_children(client: TriliumClient = Depends(get_trilium_client)):
    """Get top-level notes (root children)."""
    try:
        items = client.get_root_notes()
        return [{
            "noteId": c.get("noteId", c.get("noteId", "")),
            "title": c.get("title", ""),
            "type": c.get("type", "text"),
            "mime": c.get("mime", "text/html"),
            "isLeaf": c.get("isLeaf", True),
            "childCount": c.get("childCount", 0),
        } for c in items]
    except Exception as e:
        raise HTTPException(400, f"获取根节点失败: {e}")


@router.get("/trilium/notes/{note_id}")
def get_note(note_id: str, client: TriliumClient = Depends(get_trilium_client)):
    """Get note metadata."""
    try:
        n = client.get_note(note_id)
        return {
            "noteId": n.get("noteId", n.get("id", "")),
            "title": n.get("title", ""),
            "type": n.get("type", "text"),
            "mime": n.get("mime", "text/html"),
            "isProtected": n.get("isProtected", False),
            "dateCreated": n.get("dateCreated", ""),
            "dateModified": n.get("dateModified", ""),
            "childCount": len(n.get("childInfo", [])),
            "children": [{
                "noteId": c.get("noteId"),
                "title": c.get("title", ""),
                "type": c.get("type", "text"),
                "isLeaf": c.get("isLeaf", True),
            } for c in n.get("childInfo", [])],
        }
    except Exception as e:
        raise HTTPException(400, f"获取笔记失败: {e}")


@router.get("/trilium/notes/{note_id}/content")
def get_note_content(note_id: str, client: TriliumClient = Depends(get_trilium_client)):
    """Get note content (raw)."""
    try:
        content = client.get_note_content(note_id)
        if isinstance(content, dict):
            return {"content": content.get("content", ""), "title": content.get("title", "")}
        return {"content": content}
    except Exception as e:
        raise HTTPException(400, f"获取内容失败: {e}")


@router.get("/trilium/notes/{note_id}/tree")
def get_note_tree(note_id: str, depth: int = Query(10, ge=1, le=20),
                  client: TriliumClient = Depends(get_trilium_client)):
    """Get full subtree (recursive tree structure)."""
    try:
        return client.get_subtree(note_id, depth)
    except Exception as e:
        raise HTTPException(400, f"获取树结构失败: {e}")


@router.post("/trilium/notes")
def create_note(
    parent_note_id: str = Query(...),
    title: str = Query(...),
    content: str = "",
    type: str = Query("text"),
    mime: str = "text/html",
    client: TriliumClient = Depends(get_trilium_client),
):
    """Create a new note."""
    try:
        result = client.create_note(parent_note_id, title, content, type, mime)
        note = result.get("note", {})
        branch = result.get("branch", {})
        return {
            "ok": True,
            "note": {
                "noteId": note.get("noteId", ""),
                "title": note.get("title", ""),
                "type": note.get("type", "text"),
            },
            "branchId": branch.get("branchId", ""),
        }
    except Exception as e:
        raise HTTPException(400, f"创建笔记失败: {e}")


@router.put("/trilium/notes/{note_id}/content")
def update_note_content(
    note_id: str,
    content: str = Query(...),
    title: str = "",
    client: TriliumClient = Depends(get_trilium_client),
):
    """Update note content. Optionally update title too."""
    try:
        if title:
            client.patch_note(note_id, {"title": title})
        client.update_note_content(note_id, content)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(400, f"更新内容失败: {e}")


@router.patch("/trilium/notes/{note_id}")
def patch_note(note_id: str, data: dict, client: TriliumClient = Depends(get_trilium_client)):
    """Patch note properties (title, type, etc.)."""
    try:
        result = client.patch_note(note_id, data)
        return {"ok": True, "note": result}
    except Exception as e:
        raise HTTPException(400, f"更新笔记失败: {e}")


@router.delete("/trilium/notes/{note_id}")
def delete_note(note_id: str, client: TriliumClient = Depends(get_trilium_client)):
    """Delete a note."""
    try:
        client.delete_note(note_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(400, f"删除笔记失败: {e}")


@router.get("/trilium/search")
def search_notes(query: str, client: TriliumClient = Depends(get_trilium_client)):
    """Search notes."""
    try:
        return client.search_notes(query)
    except Exception as e:
        raise HTTPException(400, f"搜索失败: {e}")


@router.post("/trilium/branches")
def create_branch(
    note_id: str = Query(...),
    parent_note_id: str = Query(...),
    note_position: int = Query(None),
    prefix: str = "",
    client: TriliumClient = Depends(get_trilium_client),
):
    """Create a branch (connect a note to a parent)."""
    try:
        result = client.create_branch(note_id, parent_note_id, note_position, prefix)
        return {"ok": True, "branch": result}
    except Exception as e:
        raise HTTPException(400, f"创建分支失败: {e}")
