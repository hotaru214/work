from fastapi.testclient import TestClient

from main import app
from app.database import Base, engine

client = TestClient(app)


def setup_module():
    Base.metadata.create_all(bind=engine)


def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["name"] == "course-helper-agent"


def test_auth_and_courses():
    username = "smoke_user"
    client.delete(f"/api/auth/me")  # iidempotent prep
    r = client.post("/api/auth/register", json={"username": username, "password": "pw"})
    assert r.status_code in (201, 400)
    r = client.post("/api/auth/login", json={"username": username, "password": "pw"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post("/api/courses/", json={"name": "测试课程", "intro": "", "teacher": "", "semester": ""}, headers=headers)
    assert r.status_code == 201
    cid = r.json()["id"]

    r = client.get("/api/courses/", headers=headers)
    assert any(c["id"] == cid for c in r.json())