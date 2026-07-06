from fastapi import APIRouter, Header, HTTPException, Depends

from app.services.yuque_client import YuqueClient

router = APIRouter(prefix="", tags=["yuque"])


def get_yuque_client(x_yuque_token: str = Header(None, alias="X-Yuque-Token")) -> YuqueClient:
    if not x_yuque_token:
        raise HTTPException(400, "缺少语雀 X-Yuque-Token 头")
    return YuqueClient(x_yuque_token)


@router.post("/yuque/verify")
def verify_token(client: YuqueClient = Depends(get_yuque_client)):
    user = client.get_user()
    return {"ok": True, "user": user.get("data", {})}


@router.get("/yuque/repos")
def list_repos(client: YuqueClient = Depends(get_yuque_client)):
    repos = client.list_repos()
    return [{
        "id": r["id"],
        "name": r["name"],
        "description": r.get("description", "") or "",
        "slug": r.get("slug", ""),
        "type": r.get("type", "Book"),
        "doc_count": r.get("items_count", 0),
        "is_public": bool(r.get("public", 0)),
        "namespace": r.get("namespace", ""),
        "created_at": r["created_at"],
        "updated_at": r["updated_at"],
    } for r in repos]


@router.get("/yuque/repos/{repo_id}")
def get_repo(repo_id: int, client: YuqueClient = Depends(get_yuque_client)):
    r = client.get_repo(repo_id)
    return {
        "id": r["id"],
        "name": r["name"],
        "description": r.get("description", "") or "",
        "slug": r.get("slug", ""),
        "type": r.get("type", "Book"),
        "doc_count": r.get("items_count", 0),
        "is_public": bool(r.get("public", 0)),
        "namespace": r.get("namespace", ""),
        "created_at": r["created_at"],
        "updated_at": r["updated_at"],
    }


@router.post("/yuque/repos")
def create_repo(
    name: str,
    description: str = "",
    slug: str = None,
    public: bool = False,
    client: YuqueClient = Depends(get_yuque_client),
):
    r = client.create_repo(name, description, slug, public)
    return {"ok": True, "id": r["id"], "slug": r.get("slug", "")}


@router.delete("/yuque/repos/{repo_id}")
def delete_repo(repo_id: int, client: YuqueClient = Depends(get_yuque_client)):
    client.delete_repo(repo_id)
    return {"ok": True}


@router.get("/yuque/repos/{repo_id}/toc")
def get_toc(repo_id: int, client: YuqueClient = Depends(get_yuque_client)):
    items = client.get_toc(repo_id)
    uuid_map = {}
    for item in items:
        uuid_map[item["uuid"]] = {
            "id": item["id"],
            "uuid": item["uuid"],
            "title": item["title"],
            "slug": item.get("slug", ""),
            "type": item.get("type", "DOC"),
            "depth": item.get("depth", 0),
            "parent_uuid": item.get("parent_uuid"),
            "child_ids": item.get("child_ids", []),
            "children": [],
        }
    roots = []
    for item in items:
        node = uuid_map[item["uuid"]]
        pu = item.get("parent_uuid")
        if pu and pu in uuid_map:
            uuid_map[pu]["children"].append(node)
        else:
            roots.append(node)
    return roots


@router.get("/yuque/docs/{doc_id}")
def get_doc(doc_id: int, client: YuqueClient = Depends(get_yuque_client)):
    d = client.get_doc(doc_id)
    return {
        "id": d["id"],
        "title": d["title"],
        "content": d.get("body_html", "") or d.get("body", ""),
        "slug": d.get("slug", ""),
        "format": d.get("format", "html"),
        "is_public": bool(d.get("public", 0)),
        "view_count": d.get("view_count", 0),
        "word_count": d.get("word_count", 0),
        "created_at": d["created_at"],
        "updated_at": d["updated_at"],
        "tags": [],
    }


@router.post("/yuque/repos/{repo_id}/docs")
def create_doc(
    repo_id: int,
    title: str,
    body: str = "",
    format: str = "html",
    slug: str = None,
    public: bool = False,
    client: YuqueClient = Depends(get_yuque_client),
):
    d = client.create_doc(repo_id, title, body, format, slug, public)
    return {"ok": True, "id": d["id"], "slug": d.get("slug", "")}


@router.put("/yuque/docs/{doc_id}")
def update_doc(
    doc_id: int,
    title: str = None,
    body: str = None,
    format: str = "html",
    public: bool = None,
    client: YuqueClient = Depends(get_yuque_client),
):
    d = client.update_doc(doc_id, title, body, format, public)
    return {"ok": True, "id": d["id"]}


@router.delete("/yuque/docs/{doc_id}")
def delete_doc(doc_id: int, client: YuqueClient = Depends(get_yuque_client)):
    client.delete_doc(doc_id)
    return {"ok": True}


@router.get("/yuque/search")
def search(q: str, repo_id: int = None, client: YuqueClient = Depends(get_yuque_client)):
    return client.search(q, repo_id)
