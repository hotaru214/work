import json
import urllib.request
import urllib.error
import urllib.parse
from typing import Any, Optional

class TriliumError(Exception):
    def __init__(self, status: int, detail: str):
        self.status = status
        self.detail = detail
        super().__init__(f"[{status}] {detail}")


class TriliumClient:
    """
    Trilium Notes ETAPI client.
    Uses the proper /etapi/... endpoints.
    """

    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip("/")
        self.token = token

    def _headers(self) -> dict:
        return {
            "Authorization": self.token,
            "User-Agent": "CourseHelper/1.0",
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, body: dict = None) -> Any:
        url = f"{self.base_url}{path}"
        data = json.dumps(body).encode("utf-8") if body else None
        req = urllib.request.Request(url, data=data, headers=self._headers(), method=method)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8")[:300] if e.fp else str(e)
            raise TriliumError(e.code, detail)
        except urllib.error.URLError as e:
            raise TriliumError(0, f"连接失败: {e.reason}")

    # ===== App Info =====
    def get_app_info(self) -> dict:
        """Get Trilium application info."""
        return self._request("GET", "/etapi/app-info")

    def whoami(self) -> dict:
        """Get current auth info (wrapped in app-info check)."""
        info = self.get_app_info()
        return {"app_name": info.get("appName", "Trilium"), "version": info.get("appVersion", "")}

    # ===== Notes =====
    def get_note(self, note_id: str) -> dict:
        """Get a single note by ID."""
        return self._request("GET", f"/etapi/notes/{note_id}")

    def get_note_content(self, note_id: str) -> str:
        """Get note content as raw string."""
        return self._request("GET", f"/etapi/notes/{note_id}/content")

    def create_note(self, parent_note_id: str, title: str, content: str = "",
                    type_: str = "text", mime: str = "text/html") -> dict:
        """Create a new note under a parent."""
        body = {
            "parentNoteId": parent_note_id,
            "title": title,
            "content": content,
            "type": type_,
            "mime": mime,
        }
        return self._request("POST", "/etapi/create-note", body)

    def patch_note(self, note_id: str, data: dict) -> dict:
        """Update note properties (title, type, mime)."""
        return self._request("PATCH", f"/etapi/notes/{note_id}", data)

    def update_note_content(self, note_id: str, content: str) -> None:
        """Update note content (PUT replaces content entirely)."""
        self._request("PUT", f"/etapi/notes/{note_id}/content", content)

    def delete_note(self, note_id: str) -> None:
        """Delete a note."""
        self._request("DELETE", f"/etapi/notes/{note_id}")

    def search_notes(self, query: str) -> list:
        """Search notes with a query string."""
        q = urllib.parse.quote(query)
        data = self._request("GET", f"/etapi/notes?search={q}")
        return data if isinstance(data, list) else data.get("results", [])

    # ===== Branches (Tree) =====
    def get_branch(self, branch_id: str) -> dict:
        """Get a single branch."""
        return self._request("GET", f"/etapi/branches/{branch_id}")

    def create_branch(self, note_id: str, parent_note_id: str,
                      note_position: int = None, prefix: str = "") -> dict:
        """Create a new branch (tree connection)."""
        body = {
            "noteId": note_id,
            "parentNoteId": parent_note_id,
            "prefix": prefix,
        }
        if note_position is not None:
            body["notePosition"] = note_position
        return self._request("POST", "/etapi/branches", body)

    # ===== Tree helpers =====
    def get_root_notes(self) -> list:
        """Get root level notes (children of 'root')."""
        return self.get_children("root")

    def get_children(self, note_id: str) -> list:
        """
        Get child notes. Returns a flat list with nested structure from the internal API.
        ETAPI doesn't have a direct children endpoint, so we use the note's children.
        """
        note = self.get_note(note_id)
        # The note object may contain childInfo
        return note.get("childInfo", [])

    def get_subtree(self, note_id: str, depth: int = 3) -> list:
        """
        Recursively get the subtree under a note.
        Uses the internal /api/notes/{noteId}/children endpoint which returns full tree.
        Falls back to flat childInfo if internal API is not available.
        """
        try:
            data = self._request("GET", f"/api/notes/{note_id}/children")
            items = data if isinstance(data, list) else data.get("results", [])
            return self._build_tree(items)
        except TriliumError:
            # Fallback: use flat childInfo
            note = self.get_note(note_id)
            children = note.get("childInfo", [])
            return [{
                "noteId": c.get("noteId"),
                "title": c.get("title", ""),
                "type": c.get("type", "text"),
                "children": [],
                "isLeaf": c.get("isLeaf", True),
            } for c in children]

    def _build_tree(self, nodes: list) -> list:
        """Build recursive tree from internal API response."""
        result = []
        for n in nodes:
            item = {
                "noteId": n.get("noteId", n.get("id", "")),
                "title": n.get("title", ""),
                "type": n.get("type", "text"),
                "mime": n.get("mime", "text/html"),
                "isLeaf": n.get("isLeaf", True),
                "children": [],
            }
            if "children" in n and n["children"]:
                item["children"] = self._build_tree(n["children"])
            result.append(item)
        return result

    # ===== Attributes =====
    def get_attributes(self, note_id: str) -> list:
        """Get attributes (labels/relations) for a note."""
        note = self.get_note(note_id)
        return note.get("attributes", [])

    # ===== Revisions =====
    def create_revision(self, note_id: str, description: str = "") -> None:
        """Force-create a revision for a note."""
        self._request("POST", f"/etapi/notes/{note_id}/revision",
                       {"description": description})

    # ===== Login =====
    def login(self, password: str) -> dict:
        """Login to Trilium with password (for session-based auth)."""
        return self._request("POST", "/api/login", {"password": password})
