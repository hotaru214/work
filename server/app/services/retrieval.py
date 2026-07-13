"""资料检索 — 全文关键词匹配 + PDF 解析，为 LLM 提供课程资料上下文。"""

import re
from typing import Any, List

import pdfplumber
from sqlalchemy.orm import Session

from app.models import Course, Material
from app.schemas import Snippet

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
    """简单的 TF 得分：query 中关键词在 chunk 中出现的次数。"""
    q_words = set(_query_terms(query))
    if not q_words:
        return 0.0
    chunk_lower = chunk.lower()
    score = sum(chunk_lower.count(w) for w in q_words)
    return score


def _query_terms(query: str) -> list[str]:
    normalized = query.lower()
    for word in [
        "什么是", "为什么", "怎么", "如何", "请问", "解释一下", "解释",
        "介绍一下", "介绍", "在哪里出现过", "哪里出现过", "出现在哪里",
        "这个", "那个", "一下", "？", "?", "，", ",", "。", ".",
    ]:
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
    """全文关键词检索。

    1. 遍历课程中所有资料文件
    2. 对每个文件提取全文（txt/md/pdf 等）
    3. 将内容切成段落，按与 query 的关键词匹配得分排序
    4. 返回 top-k 个最相关片段
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

    # 收集命中的资料位置
    ranked: List[dict[str, Any]] = []

    for m in materials:
        blocks = _read_located_blocks(m)
        if not blocks:
            continue
        for index, block in enumerate(blocks, start=1):
            chunk = block["text"]
            score = _score_chunk(chunk, query)
            if score > 0:
                matches = _matched_terms(chunk, query)
                ranked.append(
                    {
                        "material_id": m.id,
                        "filename": m.filename,
                        "chunk_index": index,
                        "page_number": block.get("page_number"),
                        "text": chunk,
                        "score": score,
                        "matches": matches,
                    }
                )

    # 按得分降序
    ranked.sort(key=lambda item: item["score"], reverse=True)

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
