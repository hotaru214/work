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

    # ===== Notes =====
    def get_note(self, note_id: str) -> dict:
        return self._request("GET", f"/api/notes/{note_id}")

    def get_note_content(self, note_id: str) -> dict:
        return self._request("GET", f"/api/notes/{note_id}/content")

    def create_note(self, parent_note_id: str, title: str, content: str = "",
                    type_: str = "text", mime: str = "text/html") -> dict:
        body = {
            "parentNoteId": parent_note_id,
            "title": title,
            "content": content,
            "type": type_,
            "mime": mime,
        }
        return self._request("POST", "/api/notes", body)

    def update_note_content(self, note_id: str, content: str) -> dict:
        return self._request("PUT", f"/api/notes/{note_id}/content", {"content": content})

    def update_note_title(self, note_id: str, title: str) -> dict:
        return self._request("PUT", f"/api/notes/{note_id}/title", {"title": title})

    def patch_note(self, note_id: str, data: dict) -> dict:
        return self._request("PATCH", f"/api/notes/{note_id}", data)

    def delete_note(self, note_id: str) -> dict:
        return self._request("DELETE", f"/api/notes/{note_id}")

    # ===== Tree =====
    def get_children(self, note_id: str) -> list:
        data = self._request("GET", f"/api/notes/{note_id}/children")
        return data if isinstance(data, list) else data.get("results", [])

    # ===== Search =====
    def search(self, query: str) -> list:
        q = urllib.parse.quote(query)
        data = self._request("GET", f"/api/search?search={q}")
        return data if isinstance(data, list) else data.get("results", [])

    # ===== Login / Auth =====
    def login(self, password: str) -> dict:
        return self._request("POST", "/api/login", {"password": password})

    # ===== Auth check =====
    def whoami(self) -> dict:
        return self._request("GET", "/api/auth/me")

    def get_root(self) -> dict:
        data = self._request("GET", "/api/notes/root/children")
        # Return the root note info
        return data if isinstance(data, list) else data.get("results", [])

    def get_app_info(self) -> dict:
        return self._request("GET", "/api/app-info")