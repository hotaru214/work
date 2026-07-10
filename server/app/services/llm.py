"""LLM 抽象层 — 当前接入 DeepSeek（OpenAI 兼容 API）。"""

import httpx
from typing import List

from app.config import settings
from app.models import ChatMessage
from app.schemas import Snippet

DEEPSEEK_CHAT_URL = f"{settings.DEEPSEEK_BASE_URL}/chat/completions"


def _build_messages(history: List[ChatMessage], context: List[Snippet] | None):
    system_parts = [
        "你是课程学习助手，专门帮助用户理解课程内容、整理知识点、解答疑问。",
        "回答使用中文，简洁清晰，适当使用 Markdown 格式。",
    ]
    if context:
        refs = "\n".join(
            f"- {s.filename}\n  ```\n  {s.text[:800]}{'...' if len(s.text) > 800 else ''}\n  ```"
            for s in context[:5]
        )
        system_parts.append(f"以下是课程相关资料，请优先参考：\n{refs}")

    messages = [{"role": "system", "content": "\n\n".join(system_parts)}]
    for m in history:
        messages.append({"role": m.role, "content": m.content})
    return messages


class LLMClient:
    def __init__(self, provider: str | None = None):
        self.provider = provider or settings.LLM_PROVIDER

    def _call_deepseek(self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 2048) -> str:
        headers = {
            "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
            "Content-Type": "application/json",
        }
        body = {
            "model": settings.DEEPSEEK_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        try:
            resp = httpx.post(DEEPSEEK_CHAT_URL, json=body, headers=headers, timeout=60.0)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            return f"[API 错误 {e.response.status_code}] 模型暂时不可用，请稍后重试。"
        except Exception as e:
            return f"[网络错误] 无法连接 AI 服务：{e}"

    def chat(self, history: List[ChatMessage], context: List[Snippet] | None = None) -> str:
        if self.provider == "mock":
            return self._mock(history, context)
        if self.provider == "deepseek":
            messages = _build_messages(history, context)
            return self._call_deepseek(messages)
        raise NotImplementedError(f"provider {self.provider} not implemented")

    def _mock(self, history: List[ChatMessage], context: List[Snippet] | None) -> str:
        last_user = next((m for m in reversed(history) if m.role == "user"), None)
        q = last_user.content if last_user else ""
        refs = ""
        if context:
            refs = "\n\n参考资料：\n" + "\n".join(f"- {s.filename}" for s in context)
        return f"[mock LLM] 已收到问题：「{q}」。接入真实大模型后会替换为基于课程资料的回答。{refs}"

    def summarize(self, title: str, content: str) -> str:
        if self.provider == "deepseek":
            messages = [
                {"role": "system", "content": "你是课程学习助手，请用一段话（不超过100字）简洁概括以下文档内容。"},
                {"role": "user", "content": f"标题：{title}\n\n内容：\n{content[:2000]}"},
            ]
            return self._call_deepseek(messages, temperature=0.3, max_tokens=200)
        return f"[摘要] {title}: 这是一篇关于「{title[:20]}」的学习笔记，共{len(content)}字。"

    def suggest(self, title: str, content: str) -> str:
        if self.provider == "deepseek":
            messages = [
                {"role": "system", "content": "你是课程学习助手，请对以下文档提出 3 条具体的改进建议，每条不超过 20 字。"},
                {"role": "user", "content": f"标题：{title}\n\n内容：\n{content[:2000]}"},
            ]
            return self._call_deepseek(messages, temperature=0.5, max_tokens=300)
        return f"[建议] 1. 建议增加更多示例；2. 可考虑添加目录结构；3. 重点概念可以用粗体突出。"


llm = LLMClient()
