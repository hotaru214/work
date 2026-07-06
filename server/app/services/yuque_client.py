import json
import urllib.request
import urllib.error
import urllib.parse
from typing import Any

YUQUE_BASE = "https://www.yuque.com/api/v2"


class YuqueError(Exception):
    def __init__(self, status: int, detail: str):
        self.status = status
        self.detail = detail
        super().__init__(f"[{status}] {detail}")


class YuqueClient:
    def __init__(self, token: str):
        self.token = token

    def _headers(self) -> dict:
        return {
            "X-Auth-Token": self.token,
            "User-Agent": "CourseHelper/1.0",
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, body: dict = None) -> Any:
        url = f"{YUQUE_BASE}{path}"
        data = json.dumps(body).encode() if body else None
        req = urllib.request.Request(url, data=data, headers=self._headers(), method=method)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            detail = e.read().decode()[:200] if e.fp else str(e)
            raise YuqueError(e.code, detail)

    # ===== User =====
    def get_user(self) -> dict:
        return self._request("GET", "/user")

    # ===== Repos =====
    def list_repos(self, user_id: int = None) -> list:
        if user_id:
            data = self._request("GET", f"/users/{user_id}/repos")
        else:
            user = self.get_user()
            data = self._request("GET", f"/users/{user['data']['id']}/repos")
        return data.get("data", [])

    def get_repo(self, repo_id: int) -> dict:
        data = self._request("GET", f"/repos/{repo_id}")
        return data.get("data", {})

    def create_repo(self, name: str, description: str = "", slug: str = None, public: bool = False, repo_type: str = "Book") -> dict:
        body = {"name": name, "description": description, "type": repo_type, "public": int(public)}
        if slug:
            body["slug"] = slug
        data = self._request("POST", "/repos", body)
        return data.get("data", {})

    def delete_repo(self, repo_id: int) -> None:
        self._request("DELETE", f"/repos/{repo_id}")

    # ===== TOC =====
    def get_toc(self, repo_id: int) -> list:
        data = self._request("GET", f"/repos/{repo_id}/toc")
        return data.get("data", [])

    # ===== Docs =====
    def list_docs(self, repo_id: int) -> list:
        data = self._request("GET", f"/repos/{repo_id}/docs")
        return data.get("data", [])

    def get_doc(self, doc_id: int) -> dict:
        data = self._request("GET", f"/docs/{doc_id}")
        return data.get("data", {})

    def create_doc(self, repo_id: int, title: str, body: str = "", format: str = "html", slug: str = None, public: bool = False) -> dict:
        payload = {"title": title, "body": body, "format": format, "public": int(public)}
        if slug:
            payload["slug"] = slug
        data = self._request("POST", f"/repos/{repo_id}/docs", payload)
        return data.get("data", {})

    def update_doc(self, doc_id: int, title: str = None, body: str = None, format: str = "html", public: bool = None) -> dict:
        payload = {}
        if title is not None:
            payload["title"] = title
        if body is not None:
            payload["body"] = body
            payload["format"] = format
        if public is not None:
            payload["public"] = int(public)
        data = self._request("PUT", f"/docs/{doc_id}", payload)
        return data.get("data", {})

    def delete_doc(self, doc_id: int) -> None:
        self._request("DELETE", f"/docs/{doc_id}")

    def search(self, q: str, repo_id: int = None) -> list:
        params = f"?q={urllib.parse.quote(q)}&type=doc"
        if repo_id:
            params += f"&repo_id={repo_id}"
        data = self._request("GET", f"/search{params}")
        return data.get("data", [])
