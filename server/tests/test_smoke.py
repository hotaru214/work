from fastapi.testclient import TestClient
from uuid import uuid4
from datetime import datetime, timedelta

from main import app
from app.database import Base, engine
from app.schemas import Snippet
from app.services import retrieval
from app.services.retrieval import _cosine_similarity, _semantic_vectors, _vectorize

client = TestClient(app)


def setup_module():
    Base.metadata.create_all(bind=engine)


def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["name"] == "course-helper-agent"


def test_auth_and_courses():
    username = f"smoke_{uuid4().hex[:8]}"
    password = "SmokePass123!"
    r = client.post("/api/auth/register", json={"username": username, "password": password})
    assert r.status_code == 201
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post("/api/courses/", json={"name": "测试课程", "intro": "", "teacher": "", "semester": ""}, headers=headers)
    assert r.status_code == 201
    cid = r.json()["id"]

    r = client.get("/api/courses/", headers=headers)
    assert any(c["id"] == cid for c in r.json())


def test_natural_language_plan_and_schedule():
    username = f"plan_{uuid4().hex[:8]}"
    password = "SmokePass123!"
    r = client.post("/api/auth/register", json={"username": username, "password": password})
    assert r.status_code == 201
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = client.post("/api/courses/", json={"name": "高等数学", "intro": "", "teacher": "", "semester": ""}, headers=headers)
    assert r.status_code == 201
    r = client.post(
        "/api/plans/",
        json={"goal": "我要两周复习完高等数学期末考试", "daily_minutes": 60},
        headers=headers,
    )
    assert r.status_code == 201
    deadline = datetime.fromisoformat(r.json()["deadline"])
    assert deadline.date() >= (datetime.utcnow().date() + timedelta(days=13))

    r = client.get("/api/plans/integrated-schedule?days=7&daily_minutes=120", headers=headers)
    assert r.status_code == 200
    assert len(r.json()["days"]) == 7


def test_snippet_citation_shape():
    snippet = Snippet(
        material_id=1,
        course_id=2,
        course_name="高等数学",
        filename="第一章.pdf",
        text="极限是高等数学的重要概念。",
        chunk_index=3,
    )
    assert snippet.course_name == "高等数学"
    assert snippet.chunk_index == 3


def test_vector_retrieval_scores_related_text_higher():
    query = _vectorize("什么是 Shannon 信息熵")
    related = _vectorize("Shannon 信息熵用于衡量消息的不确定性，是信息论中的核心概念。")
    unrelated = _vectorize("高等数学复习需要重点掌握极限、导数、积分和级数。")

    assert _cosine_similarity(query, related) > _cosine_similarity(query, unrelated)
    assert _cosine_similarity(query, related) >= 0.03
    assert _cosine_similarity(query, unrelated) < 0.03


def test_embedding_model_vectors_are_used_when_available(monkeypatch):
    def fake_embed_texts(texts):
        assert texts == ["问题", "相关资料", "无关资料"]
        return [
            [1.0, 0.0, 0.0],
            [0.9, 0.1, 0.0],
            [0.0, 1.0, 0.0],
        ]

    monkeypatch.setattr(retrieval.embedding_client, "embed_texts", fake_embed_texts)

    query_vector, related_vector, unrelated_vector = _semantic_vectors(["问题", "相关资料", "无关资料"])

    assert _cosine_similarity(query_vector, related_vector) > _cosine_similarity(query_vector, unrelated_vector)
