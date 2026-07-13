"""资料检索 — 全文关键词匹配 + PDF 解析，为 LLM 提供课程资料上下文。"""

import re
from typing import List

import pdfplumber
from sqlalchemy.orm import Session

from app.models import Material
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


def _read_content(material: Material) -> str:
    """根据文件类型读取全文内容。"""
    ext = ("." + material.filename.rsplit(".", 1)[-1].lower()
           if "." in material.filename else "")

    if ext in TEXT_EXTENSIONS:
        return _read_text_file(material.content_path)

    if ext in PDF_EXTENSIONS:
        return _read_pdf_file(material.content_path)

    return ""


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
    """简单的 TF 得分：query 中每个词在 chunk 中出现的次数。"""
    q_words = set(query.lower().split())
    if not q_words:
        return 0.0
    chunk_lower = chunk.lower()
    score = sum(chunk_lower.count(w) for w in q_words)
    return score


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

    # 收集所有 (filename, chunk, score)
    ranked: List[tuple[str, str, float]] = []

    for m in materials:
        full_text = _read_content(m)
        if not full_text:
            continue

        chunks = _split_chunks(full_text)
        for chunk in chunks:
            score = _score_chunk(chunk, query)
            if score > 0:
                ranked.append((m.filename, chunk, score))

    # 按得分降序
    ranked.sort(key=lambda x: x[2], reverse=True)

    # 每个文件最多取 TOP_CHUNKS_PER_FILE 段
    seen_files: dict[str, int] = {}
    top: List[tuple[str, str]] = []
    for filename, chunk, score in ranked:
        seen_files[filename] = seen_files.get(filename, 0) + 1
        if seen_files[filename] <= TOP_CHUNKS_PER_FILE and len(top) < MAX_TOTAL_CHUNKS:
            top.append((f"📄 {filename}", chunk))

    # 若关键词未命中，回退到资料摘要
    if not top:
        for m in materials:
            text = _read_content(m)
            if text:
                top.append((f"📄 {m.filename}", text[:MAX_TOTAL_CHUNKS]))
                if len(top) >= MAX_TOTAL_CHUNKS:
                    break
            else:
                top.append((f"📄 {m.filename}", f"（此文件格式暂不支持内容解析：{m.filename}，建议转换为 txt/md/pdf 后重新上传）"))

    snippets: List[Snippet] = []
    for filename, chunk in top:
        snippets.append(Snippet(
            material_id=0,
            filename=filename,
            text=chunk,
        ))

    return snippets
