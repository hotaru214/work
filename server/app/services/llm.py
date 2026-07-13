"""LLM abstraction layer for the course assistant."""

from typing import List

import httpx

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
            (
                f"- 位置 [{index}]：课程《{s.course_name or '未命名课程'}》 / "
                f"{s.filename} / {s.location or f'片段 {s.chunk_index}'} / "
                f"命中词：{'、'.join(s.matches) if s.matches else '相关片段'}\n"
                f"  ```\n  {s.text[:800]}{'...' if len(s.text) > 800 else ''}\n  ```"
            )
            for index, s in enumerate(context[:5], start=1)
        )
        system_parts.append(f"以下是课程相关资料片段，请优先参考：\n{refs}")
        system_parts.append(
            "重要：回答中引用课程资料时，必须在相关句子后标注位置编号，例如「[位置1]」。"
            "如果回答内容来自多个资料，请分别标注。"
            "如果资料内容为「此文件格式暂不支持内容解析」，说明该文件存在但无法读取正文。"
            "请基于文件名和你的知识尽力回答，并说明哪些文件未能解析内容。"
            "只有当完全没有任何资料时，才说「尚未关联课程资料，请在对话设置中选择课程」。"
        )

    messages = [{"role": "system", "content": "\n\n".join(system_parts)}]
    for message in history:
        messages.append({"role": message.role, "content": message.content})
    return messages


class LLMClient:
    def __init__(self, provider: str | None = None):
        self.provider = provider or settings.LLM_PROVIDER

    def _deepseek_configured(self) -> bool:
        key = settings.DEEPSEEK_API_KEY.strip()
        return bool(key) and not key.startswith("sk-your-")

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
        except httpx.HTTPStatusError as exc:
            return f"[API 错误 {exc.response.status_code}] 模型暂时不可用，请稍后重试。"
        except Exception as exc:
            return f"[网络错误] 无法连接 AI 服务：{exc}"

    def chat(self, history: List[ChatMessage], context: List[Snippet] | None = None) -> str:
        if self.provider == "mock":
            return self._mock(history, context)
        if self.provider == "deepseek":
            return self._call_deepseek(_build_messages(history, context))
        raise NotImplementedError(f"provider {self.provider} not implemented")

    def _mock(self, history: List[ChatMessage], context: List[Snippet] | None) -> str:
        last_user = next((message for message in reversed(history) if message.role == "user"), None)
        question = last_user.content if last_user else ""
        refs = ""
        if context:
            refs = "\n\n你的问题在资料中出现的位置：\n" + "\n".join(
                f"- [位置{index}] 《{snippet.course_name or '未命名课程'}》 / {snippet.filename} / {snippet.location or f'片段 {snippet.chunk_index}'}"
                for index, snippet in enumerate(context, start=1)
            )
        return f"[mock LLM] 已收到问题：{question}。接入真实大模型后会替换为基于课程资料的回答。{refs}"

    def summarize(self, title: str, content: str) -> str:
        if self.provider == "deepseek":
            messages = [
                {"role": "system", "content": "你是课程学习助手，请用一段话（不超过100字）简洁概括以下文档内容。"},
                {"role": "user", "content": f"标题：{title}\n\n内容：\n{content[:2000]}"},
            ]
            return self._call_deepseek(messages, temperature=0.3, max_tokens=200)
        return f"[摘要] {title}: 这是一篇关于“{title[:20]}”的学习笔记，共{len(content)}字。"

    def suggest(self, title: str, content: str) -> str:
        if self.provider == "deepseek":
            messages = [
                {"role": "system", "content": "你是课程学习助手，请对以下文档提出 3 条具体改进建议，每条不超过 20 字。"},
                {"role": "user", "content": f"标题：{title}\n\n内容：\n{content[:2000]}"},
            ]
            return self._call_deepseek(messages, temperature=0.5, max_tokens=300)
        return "[建议] 1. 增加典型例题；2. 补充目录结构；3. 用加粗标出重点概念。"

    def generate_summary(self, course_name: str, materials: list[dict]) -> str:
        """Generate a structured review outline from course materials."""
        if self.provider == "deepseek":
            material_text = "\n\n---\n\n".join(
                f"资料：{material['filename']}\n{material['text'][:1500]}"
                for material in materials[:10]
                if material.get("text")
            )
            if not material_text:
                return "该课程暂无文字类资料，无法生成提纲。"
            messages = [
                {
                    "role": "system",
                    "content": (
                        "你是课程学习助手，请根据课程资料生成结构化复习提纲。要求：\n"
                        "1. 使用 Markdown 多级标题。\n"
                        "2. 必须包含：核心知识点、公式/定义、典型题型、易错点、复习优先级、复习建议。\n"
                        "3. 每个知识点尽量标注来源文件。\n"
                        "4. 按知识体系组织，不要按文件罗列。\n"
                        "5. 末尾附「来源资料」列表。"
                    ),
                },
                {"role": "user", "content": f"课程：{course_name}\n\n{material_text}\n\n请生成复习提纲。"},
            ]
            return self._call_deepseek(messages, temperature=0.4, max_tokens=4096)
        return f"[mock] {course_name} 复习提纲：接入真实大模型后生成。"

    def generate_tasks(self, goal: str, deadline: str, daily_minutes: int) -> str:
        """Generate actionable tasks for a study plan."""
        if self.provider == "deepseek" and self._deepseek_configured():
            messages = [
                {
                    "role": "system",
                    "content": (
                        "你是一个严格、务实的学习计划拆解助手。请把用户的大目标拆成可执行任务。\n"
                        "要求：\n"
                        "1. 只返回严格 JSON，不要 Markdown，不要解释。\n"
                        "2. tasks 数量通常为 5-12 个；如果周期很短，可以少一些。\n"
                        "3. 每个任务必须是具体动作，避免“学习第一阶段”这类空话。\n"
                        "4. 任务要覆盖：范围确认、资料整理、知识理解、例题/练习、错题复盘、输出巩固、冲刺检查。\n"
                        "5. days_from_start 从 1 开始，按时间顺序排列，均匀分布在截止日前。\n"
                        "6. estimated_minutes 不超过用户每日可用时间。\n"
                        "7. title 使用中文，长度控制在 8-32 字。\n"
                        '返回格式：{"tasks":[{"title":"任务名称","days_from_start":1,"estimated_minutes":45}]}'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"学习目标：{goal}\n"
                        f"截止日期：{deadline}\n"
                        f"每日可用时间：{daily_minutes} 分钟\n"
                        "请生成一个从今天开始执行的学习任务列表。"
                    ),
                },
            ]
            return self._call_deepseek(messages, temperature=0.35, max_tokens=2048)
        return (
            '{"tasks": ['
            '{"title": "明确范围并列出交付清单", "days_from_start": 1, "estimated_minutes": 30}, '
            '{"title": "整理资料和已有错题", "days_from_start": 2, "estimated_minutes": 45}, '
            '{"title": "梳理核心概念与公式", "days_from_start": 3, "estimated_minutes": 60}, '
            '{"title": "完成典型例题训练", "days_from_start": 4, "estimated_minutes": 60}, '
            '{"title": "复盘薄弱点并二次练习", "days_from_start": 5, "estimated_minutes": 45}, '
            '{"title": "做一轮综合检测", "days_from_start": 6, "estimated_minutes": 60}, '
            '{"title": "整理最终提纲和错题", "days_from_start": 7, "estimated_minutes": 45}'
            "]}"
        )


llm = LLMClient()
