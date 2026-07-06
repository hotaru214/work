import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

export default function Chat() {
  const { sessionId } = useParams();
  const [sid, setSid] = useState<number | null>(sessionId ? Number(sessionId) : null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadSessions() {
    setSessions(await api.listSessions());
  }

  async function loadMessages(id: number) {
    setMessages(await api.listMessages(id));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { if (sid) loadMessages(sid); }, [sid]);

  async function newSession() {
    const s = await api.createSession(null, "新对话");
    setSid(s.id);
    setMessages([]);
    loadSessions();
  }

  async function send() {
    if (!sid || !input.trim() || busy) return;
    const userText = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userText }]);
    setBusy(true);
    try {
      const reply = await api.sendMessage(sid, userText);
      setMessages((m) => [...m, reply]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full">
      <div className="w-56 bg-white border-r overflow-auto">
        <div className="p-3">
          <button onClick={newSession} className="w-full bg-slate-900 text-white py-2 rounded text-sm">
            新对话
          </button>
        </div>
        <ul className="text-sm">
          {sessions.map((s) => (
            <li
              key={s.id}
              onClick={() => setSid(s.id)}
              className={`px-4 py-2 cursor-pointer hover:bg-slate-50 ${sid === s.id ? "bg-slate-100" : ""}`}
            >
              {s.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-6 space-y-3">
          {!sid ? (
            <div className="text-slate-500">点击左侧"新对话"或选择会话开始</div>
          ) : messages.length === 0 ? (
            <div className="text-slate-500">开始你的第一条消息</div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`max-w-2xl ${m.role === "user" ? "ml-auto bg-slate-900 text-white" : "bg-white border"} rounded px-4 py-2`}>
                <div className="text-xs opacity-60 mb-1">{m.role === "user" ? "我" : "Agent"}</div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t bg-white p-4 flex gap-3">
          <textarea
            className="flex-1 border rounded px-3 py-2 text-sm resize-none"
            rows={2}
            placeholder="输入消息…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
          />
          <button onClick={send} disabled={!sid || busy} className="bg-slate-900 text-white px-5 rounded disabled:opacity-50">
            发送
          </button>
        </div>
      </div>
    </div>
  );
}