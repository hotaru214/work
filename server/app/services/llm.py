"""LLM \u62bd\u8c61\u5c42\u3002

\u5f53\u524d\u4e3a mock \u5b9e\u73b0\uff0c\u540e\u7eed\u53ef\u5728\u6b64\u66ff\u6362\u4e3a OpenAI / Anthropic / \u672c\u5730\u6a21\u578b\u3002
\u8def\u7531\u5c42\u53ea\u8c03 LLMClient\uff0c\u4e0d\u76f4\u63a5\u4f9d\u8d56\u5177\u4f53 SDK\u3002
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
            refs = "\n\n\u53c2\u8003\u8d44\u6599\uff1a\n" + "\n".join(f"- {{s.filename}}" for s in context)
        return f"[mock LLM] \u5df2\u6536\u5230\u95ee\u9898\uff1a\u201c{q}\u201d\u3002\u8fd9\u662f\u4e00\u4e2a\u5360\u4f4d\u56de\u590d\uff0c\u63a5\u5165\u771f\u5b9e\u5927\u6a21\u578b\u540e\u4f1a\u66ff\u6362\u4e3a\u57fa\u4e8e\u8bfe\u7a0b\u8d44\u6599\u7684\u56de\u7b54\u3002{refs}"

    def summarize(self, title: str, content: str) -> str:
        """\u751f\u6210\u6587\u6863\u6458\u8981"""
        if self.provider == "mock":
            return f"[\u6458\u8981] {title}: \u8fd9\u662f\u4e00\u7bc7\u5173\u4e8e\u201c{title[:20]}\u201d\u7684\u5b66\u4e60\u7b14\u8bb0\uff0c\u5171{len(content)}\u5b57\uff0c\u5185\u5bb9\u8986\u76d6\u4e86\u8be5\u4e3b\u9898\u7684\u6838\u5fc3\u77e5\u8bc6\u70b9\u3002"

    def suggest(self, title: str, content: str) -> str:
        """\u5bf9\u6587\u6863\u63d0\u51fa\u6539\u8fdb\u5efa\u8bae"""
        if self.provider == "mock":
            return f"[\u5efa\u8bae] 1. \u5efa\u8bae\u589e\u52a0\u66f4\u591a\u793a\u4f8b\u4ee3\u7801\u6216\u6848\u4f8b\uff1b2. \u53ef\u8003\u8651\u6dfb\u52a0\u76ee\u5f55\u7ed3\u6784\uff1b3. \u91cd\u70b9\u6982\u5ff5\u53ef\u4ee5\u7528\u7c97\u4f53\u7a81\u51fa\u3002"

llm = LLMClient()
