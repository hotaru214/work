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
        system_parts.append(
            "重要：回答中引用课程资料时，必须标注来源，格式为「📚 参考：文件名」。"
            "如果回答内容来自多个资料，请分别标注。"
            "如果资料内容为「此文件格式暂不支持内容解析」，说明该文件存在但无法读取正文，"
            "请基于文件名和你的知识尽力回答，并在末尾说明哪些文件未能解析内容。"
            "只有当完全没有任何资料时，才说「⚠️ 未关联课程资料，请在对话设置中选择课程」。"
        )

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

    def generate_summary(self, course_name: str, materials: list[dict]) -> str:
        """根据课程所有资料生成知识点复习提纲。"""
        if self.provider == "deepseek":
            material_text = "\n\n---\n\n".join(
                f"📄 {m['filename']}:\n{m['text'][:1500]}" for m in materials[:10] if m.get("text")
            )
            if not material_text:
                return "该课程暂无文字类资料，无法生成提纲。"
            messages = [
                {
                    "role": "system",
                    "content": (
                        "你是课程学习助手，请根据以下课程资料，生成一份结构化的复习提纲。要求：\n"
                        "1. 使用 Markdown 格式，包含多级标题\n"
                        "2. 提取核心知识点（概念、公式、要点）\n"
                        "3. 标注每个知识点来源于哪个文件\n"
                        "4. 按知识体系组织，不要按文件罗列\n"
                        "5. 最后附上重点复习建议"
                    ),
                },
                {
                    "role": "user",
                    "content": f"课程：{course_name}\n\n{material_text}\n\n请生成复习提纲。",
                },
            ]
            return self._call_deepseek(messages, temperature=0.4, max_tokens=4096)
        return f"[mock] {course_name} 复习提纲：待接入大模型后生成。"

    def generate_tasks(self, goal: str, deadline: str, daily_minutes: int) -> str:
        """根据学习目标、截止时间和每日时间生成分阶段任务列表。"""
        if self.provider == "deepseek":
            messages = [
                {
                    "role": "system",
                    "content": (
                        "你是学习规划助手。根据用户的学习目标、截止日期和每日可用时间，"
                        "将大目标拆解为有序的阶段任务。\n"
                        "返回格式要求（严格 JSON）：\n"
                        '{"tasks": [{"title": "任务名", "days_from_start": 1}, ...]}\n'
                        "任务按时间顺序排列，均匀分布在截止日期之前。"
                        "每个任务的 title 要具体可执行，不超过 30 字。"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"学习目标：{goal}\n"
                        f"截止日期：{deadline}\n"
                        f"每日可用时间：{daily_minutes} 分钟\n"
                        f"请拆解为每日待办任务。"
                    ),
                },
            ]
            return self._call_deepseek(messages, temperature=0.6, max_tokens=2048)
        return '{"tasks": [{"title": "整理学习资料", "days_from_start": 1}, {"title": "完成第一章复习", "days_from_start": 2}, {"title": "做模拟题并复盘", "days_from_start": 3}]}'


llm = LLMClient()
