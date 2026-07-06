"""LLM 抽象层。

当前为 mock 实现，后续可在此替换为 OpenAI / Anthropic / 本地模型。
路由层只调 LLMClient，不直接依赖具体 SDK。
"""
from typing import List

from app.config import settings
from app.models import ChatMessage
from app.schemas import Snippet


class LLMClient:
    def __init__(self, provider: str | None = None):
        self.provider = provider or settings.LLM_PROVIDER

    def chat(self, history: List[ChatMessage], context: List[Snippet] | None = None) -> str:
        if self.provider == "mock":
            return self._mock(history, context)
        raise NotImplementedError(f"provider {self.provider} not implemented")

    def _mock(self, history: List[ChatMessage], context: List[Snippet] | None) -> str:
        last_user = next((m for m in reversed(history) if m.role == "user"), None)
        q = last_user.content if last_user else ""
        refs = ""
        if context:
            refs = "\n\n参考资料：\n" + "\n".join(f"- {s.filename}" for s in context)
        return f"[mock LLM] 已收到问题：“{q}”。这是一个占位回复，接入真实大模型后会替换为基于课程资料的回答。{refs}"