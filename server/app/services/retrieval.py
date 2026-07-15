"""资料检索 — 向量相似度检索 + PDF 解析，为 LLM 提供课程资料上下文。"""

import hashlib
import math
import re
from typing import Any, List

import pdfplumber
from sqlalchemy.orm import Session

from app.models import Course, Material
from app.schemas import Snippet
from app.services.embedding import embedding_client

TEXT_EXTENSIONS = {
    ".txt", ".md", ".py", ".js", ".ts", ".tsx", ".jsx",
    ".html", ".css", ".json", ".xml", ".yaml", ".yml",
    ".csv", ".sql", ".sh", ".bat", ".ini", ".cfg", ".toml",
    ".java", ".c", ".cpp", ".h", ".hpp", ".rs", ".go",
    ".rb", ".php", ".swift", ".kt", ".scala", ".r", ".m",
}

PDF_EXTENSIONS = {".pdf"}

# 每段最多取多少字符发给 LLM
MAX_CHUNK_CHARS = 1200
# 从一个文件里最多取几个相关段落
TOP_CHUNKS_PER_FILE = 3
# 总共最多返回几个段落
MAX_TOTAL_CHUNKS = 6
MAX_PREVIEW_CHARS = 220
VECTOR_DIM = 4096
MIN_VECTOR_SCORE = 0.03
VECTOR_STOP_PHRASES = [
    "什么是", "为什么", "怎么", "如何", "请问", "解释一下", "解释",
    "介绍一下", "介绍", "在哪里出现过", "哪里出现过", "出现在哪里",
    "这个", "那个", "一下", "？", "?", "，", ",", "。", ".",
]
Vector = dict[int, float] | list[float]


def _read_text_file(filepath: str) -> str:
    """读取纯文本文件全部内容。"""
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception:
        return ""


def _read_pdf_file(filepath: str) -> str:
    """从 PDF 中提取所有页面的文字（pdfplumber，中文兼容性好）。"""
    try:
        with pdfplumber.open(filepath) as pdf:
            pages = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text.strip())
            return "\n\n".join(pages)
    except Exception:
        return ""


def _read_pdf_pages(filepath: str) -> list[tuple[int, str]]:
    """返回 PDF 每页文本，保留页码。"""
    try:
        with pdfplumber.open(filepath) as pdf:
            pages: list[tuple[int, str]] = []
            for index, page in enumerate(pdf.pages, start=1):
                text = page.extract_text()
                if text:
                    pages.append((index, text.strip()))
            return pages
    except Exception:
        return []


def _read_content(material: Material) -> str:
    """根据文件类型读取全文内容。"""
    ext = ("." + material.filename.rsplit(".", 1)[-1].lower()
           if "." in material.filename else "")

    if ext in TEXT_EXTENSIONS:
        return _read_text_file(material.content_path)

    if ext in PDF_EXTENSIONS:
        return _read_pdf_file(material.content_path)

    return ""


def _read_located_blocks(material: Material) -> list[dict[str, Any]]:
    """读取资料并保留可展示的位置：PDF 页码或文本片段编号。"""
    ext = ("." + material.filename.rsplit(".", 1)[-1].lower()
           if "." in material.filename else "")

    if ext in PDF_EXTENSIONS:
        blocks: list[dict[str, Any]] = []
        for page_number, page_text in _read_pdf_pages(material.content_path):
            for chunk in _split_chunks(page_text):
                blocks.append({"text": chunk, "page_number": page_number})
        return blocks

    text = _read_content(material)
    return [{"text": chunk, "page_number": None} for chunk in _split_chunks(text)]


def _split_chunks(text: str) -> List[str]:
    r"""将全文按段落切分，过滤过短/纯符号行。"""
    # 按双换行切段落
    raw = re.split(r"\n\s*\n", text)
    chunks = []
    for block in raw:
        block = block.strip()
        # 跳过太短、纯符号的块
        if len(block) < 10:
            continue
        alpha_ratio = sum(1 for c in block if c.isalpha()) / max(len(block), 1)
        if alpha_ratio < 0.15:
            continue
        # 截断过长段落
        if len(block) > MAX_CHUNK_CHARS:
            block = block[:MAX_CHUNK_CHARS] + "\n…"
        chunks.append(block)
    return chunks


def _score_chunk(chunk: str, query: str) -> float:
    """关键词得分，仅作为向量检索分数相近时的辅助排序信号。"""
    q_words = set(_query_terms(query))
    if not q_words:
        return 0.0
    chunk_lower = chunk.lower()
    return float(sum(chunk_lower.count(w) for w in q_words))


def _char_ngrams(text: str, min_n: int = 2, max_n: int = 3) -> list[str]:
    chars = [char for char in text if "\u4e00" <= char <= "\u9fff"]
    grams: list[str] = []
    for n in range(min_n, max_n + 1):
        if len(chars) >= n:
            grams.extend("".join(chars[i:i + n]) for i in range(len(chars) - n + 1))
    return grams


def _vector_terms(text: str) -> list[str]:
    """生成向量化用的词条：英文按词，中文按 2-3 字 ngram。"""
    lowered = text.lower()
    for phrase in VECTOR_STOP_PHRASES:
        lowered = lowered.replace(phrase, " ")
    english_terms = re.findall(r"[a-z0-9_\-]{2,}", lowered)
    chinese_terms = _char_ngrams(lowered)
    return english_terms + chinese_terms


def _hash_index(term: str) -> int:
    digest = hashlib.blake2b(term.encode("utf-8"), digest_size=8).digest()
    return int.from_bytes(digest, "big") % VECTOR_DIM


def _vectorize(text: str) -> dict[int, float]:
    """把文本转成归一化的哈希词向量，用于余弦相似度检索。"""
    vector: dict[int, float] = {}
    for term in _vector_terms(text):
        index = _hash_index(term)
        vector[index] = vector.get(index, 0.0) + 1.0

    if not vector:
        return {}

    # log TF 降低长段落里重复词对相似度的垄断。
    for index, value in list(vector.items()):
        vector[index] = 1.0 + math.log(value)

    norm = math.sqrt(sum(value * value for value in vector.values()))
    if norm == 0:
        return {}
    return {index: value / norm for index, value in vector.items()}


def _normalize_dense_vector(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return []
    return [value / norm for value in vector]


def _semantic_vectors(texts: list[str]) -> list[Vector]:
    """优先使用 embedding 模型，未配置或调用失败时回退到本地哈希向量。"""
    model_vectors = embedding_client.embed_texts(texts)
    if model_vectors:
        return [_normalize_dense_vector(vector) for vector in model_vectors]
    return [_vectorize(text) for text in texts]


def _cosine_similarity(left: Vector, right: Vector) -> float:
    if not left or not right:
        return 0.0
    if isinstance(left, list) and isinstance(right, list):
        return sum(l_value * r_value for l_value, r_value in zip(left, right))
    if isinstance(left, list) or isinstance(right, list):
        return 0.0
    if len(left) > len(right):
        left, right = right, left
    return sum(value * right.get(index, 0.0) for index, value in left.items())


def _vector_score_chunk(chunk_vector: Vector, query_vector: Vector) -> float:
    return _cosine_similarity(chunk_vector, query_vector)


def _query_terms(query: str) -> list[str]:
    normalized = query.lower()
    for word in VECTOR_STOP_PHRASES:
        normalized = normalized.replace(word, " ")
    terms = re.findall(r"[A-Za-z0-9_\-]+|[\u4e00-\u9fff]{2,}", normalized)
    stopwords = {
        "什么", "什么是", "为什么", "怎么", "如何", "请问", "解释", "介绍",
        "一下", "这个", "那个", "资料", "课程", "问题", "哪里", "出现",
    }
    terms = [term for term in terms if term not in stopwords]
    if not terms and query.strip():
        terms = [query.strip().lower()]
    return list(dict.fromkeys(term for term in terms if len(term.strip()) >= 2))


def _matched_terms(text: str, query: str) -> list[str]:
    lower = text.lower()
    return [term for term in _query_terms(query) if term in lower]


def _preview_for_match(text: str, matches: list[str]) -> str:
    cleaned = " ".join(text.split())
    if not cleaned:
        return ""
    lower = cleaned.lower()
    positions = [lower.find(match.lower()) for match in matches if lower.find(match.lower()) >= 0]
    start = max(0, min(positions) - 70) if positions else 0
    end = min(len(cleaned), start + MAX_PREVIEW_CHARS)
    preview = cleaned[start:end]
    if start > 0:
        preview = "..." + preview
    if end < len(cleaned):
        preview += "..."
    return preview


def _location_label(page_number: int | None, chunk_index: int) -> str:
    if page_number:
        return f"第 {page_number} 页，片段 {chunk_index}"
    return f"片段 {chunk_index}"


def search(course_id: int, query: str, k: int = 3, db: Session | None = None) -> List[Snippet]:
    """课程资料向量检索。

    1. 遍历课程中所有资料文件
    2. 对每个文件提取全文（txt/md/pdf 等）
    3. 使用 embedding 模型向量化 query 和段落文本（未配置时回退本地哈希向量）
    4. 按余弦相似度排序，关键词命中只作为展示和轻量辅助排序
    5. 返回 top-k 个最相关片段
    """
    if db is None:
        return []

    materials = (
        db.query(Material)
        .filter(Material.course_id == course_id)
        .all()
    )

    course = db.query(Course).filter(Course.id == course_id).first()
    course_name = course.name if course else ""

    # 收集候选资料位置
    candidates: List[dict[str, Any]] = []

    for m in materials:
        blocks = _read_located_blocks(m)
        if not blocks:
            continue
        for index, block in enumerate(blocks, start=1):
            chunk = block["text"]
            candidates.append(
                {
                    "material_id": m.id,
                    "filename": m.filename,
                    "chunk_index": index,
                    "page_number": block.get("page_number"),
                    "text": chunk,
                }
            )

    ranked: List[dict[str, Any]] = []
    if candidates:
        vectors = _semantic_vectors([query] + [item["text"] for item in candidates])
        query_vector = vectors[0]
        chunk_vectors = vectors[1:]

        for item, chunk_vector in zip(candidates, chunk_vectors):
            vector_score = _vector_score_chunk(chunk_vector, query_vector)
            keyword_score = _score_chunk(item["text"], query)
            score = vector_score + min(keyword_score, 3.0) * 0.02
            if score >= MIN_VECTOR_SCORE:
                matches = _matched_terms(item["text"], query)
                ranked.append(
                    {
                        **item,
                        "score": score,
                        "vector_score": vector_score,
                        "matches": matches,
                    }
                )

    # 按向量相似度降序，辅助分只在相似度接近时参与排序。
    ranked.sort(key=lambda item: (item["vector_score"], item["score"]), reverse=True)

    # 每个文件最多取 TOP_CHUNKS_PER_FILE 段
    seen_files: dict[str, int] = {}
    top: List[dict[str, Any]] = []
    for item in ranked:
        filename = item["filename"]
        seen_files[filename] = seen_files.get(filename, 0) + 1
        if seen_files[filename] <= TOP_CHUNKS_PER_FILE and len(top) < MAX_TOTAL_CHUNKS:
            top.append(item)

    # 若用户有明确问题但没有命中，不返回兜底资料，避免把无关文件当作来源。
    if not top and query.strip():
        return []

    # 没有关键词时，才回退到资料摘要。
    if not top:
        for m in materials:
            blocks = _read_located_blocks(m)
            if blocks:
                block = blocks[0]
                top.append(
                    {
                        "material_id": m.id,
                        "filename": m.filename,
                        "chunk_index": 1,
                        "page_number": block.get("page_number"),
                        "text": block["text"][:MAX_CHUNK_CHARS],
                        "score": 0.0,
                        "matches": [],
                    }
                )
                if len(top) >= MAX_TOTAL_CHUNKS:
                    break
            else:
                top.append(
                    {
                        "material_id": m.id,
                        "filename": m.filename,
                        "chunk_index": 1,
                        "page_number": None,
                        "text": f"（此文件格式暂不支持内容解析：{m.filename}，建议转换为 txt/md/pdf 后重新上传）",
                        "score": 0.0,
                        "matches": [],
                    }
                )

    snippets: List[Snippet] = []
    for item in top[:k]:
        matches = item.get("matches", [])
        preview = _preview_for_match(item["text"], matches)
        snippets.append(Snippet(
            material_id=item["material_id"],
            course_id=course_id,
            course_name=course_name,
            filename=item["filename"],
            text=item["text"],
            chunk_index=item["chunk_index"],
            page_number=item.get("page_number"),
            location=_location_label(item.get("page_number"), item["chunk_index"]),
            preview=preview,
            matches=matches,
        ))

    return snippets
