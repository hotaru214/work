import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Clock3,
  Lightbulb,
  MessageCircle,
  Plus,
  SendHorizonal,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { api } from "../api/client";
import { mdToHtml } from "../utils/markdown";
import { useCourses, useKbRoots, usePrefetchPost, useSessions } from "../hooks/api";
import { EmptyState, IconBadge, PrimaryButton, SecondaryButton, Surface } from "../components/PageScaffold";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { useTypewriter } from "../hooks/useTypewriter";
import { preloadPage } from "../pageLoaders";

const PROMPTS = [
  "帮我把这门课的重点整理成复习提纲",
  "根据今天的学习内容生成 3 个练习题",
  "把这个知识点用更简单的例子解释一下",
];

export default function Chat() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sid, setSid] = useState<number | null>(sessionId ? Number(sessionId) : null);
  const { data: sessions = [] } = useSessions();
  const { data: courses = [] } = useCourses();
  const { data: kbRoots = [] } = useKbRoots();
  const [publishingToKb, setPublishingToKb] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [typingId, setTypingId] = useState<number | null>(null);
  const prefetchPost = usePrefetchPost();
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages(id: number) {
    setLoadingMessages(true);
    setTypingId(null);
    try {
      const msgs = await api.listMessages(id);
      setMessages(msgs);
      try {
        const rp = await api.sessionRelatedPosts(id);
        setRelatedPosts(rp || []);
      } catch {
        setRelatedPosts([]);
      }
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (sessionId) {
      const next = Number(sessionId);
      setSid(Number.isNaN(next) ? null : next);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sid) loadMessages(sid);
  }, [sid]);

  async function newSession() {
    if (creatingSession) return;
    setCreatingSession(true);
    try {
      const session = await api.createSession(null, "新对话");
      setSid(session.id);
      setMessages([]);
      setRelatedPosts([]);
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      navigate(`/chat/${session.id}`);
    } finally {
      setCreatingSession(false);
    }
  }

  async function send() {
    if (!sid || !input.trim() || busy) return;
    const userText = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userText }]);
    setBusy(true);
    try {
      const reply = await api.sendMessage(sid, userText);
      setTypingId(reply?.id ?? null);
      setMessages((m) => [...m, reply]);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    } finally {
      setBusy(false);
    }
  }

  const activeSessionTitle = sid ? activeTitle(sessions, sid) : "选择或创建一个对话";
  const activeSession = sid ? sessions.find(s => s.id === sid) : null;
  const activeCourseId: number | null = activeSession?.course_id ?? null;  const [updatingCourse, setUpdatingCourse] = useState(false);

  async function handleChangeCourse(courseId: number | null) {
    if (!sid || updatingCourse) return;
    setUpdatingCourse(true);
    try {
      await api.updateSession(sid, courseId);
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    } finally {
      setUpdatingCourse(false);
    }
  }

  async function publishToKb() {
    if (!sid || !activeCourseId || publishingToKb || messages.length === 0) return;
    setPublishingToKb(true);
    try {
      // 找该课程关联的知识库根节点
      const root = kbRoots.find((r: any) => r.courseId === activeCourseId);
      if (!root) {
        alert("该课程还没有关联的知识库，请先在知识库页面创建一个并关联此课程。");
        return;
      }
      // 格式化对话，转为 HTML 存入知识库
      const dateStr = new Date().toLocaleDateString("zh-CN");
      const title = `${activeSessionTitle} — ${dateStr}`;
      const mdContent = messages.map((m: any) => {
        const role = m.role === "user" ? "**我**" : "**Agent**";
        return `${role}：\n\n${m.content}`;
      }).join("\n\n---\n\n");
      const content = mdToHtml(mdContent);
      const result = await api.kb.createNote(root.noteId, title, content, "text", "text/html");
      queryClient.invalidateQueries({ queryKey: ["kb-tree", root.noteId] });
      navigate(`/kb/${root.noteId}/doc/${result.note.noteId}`);
    } catch (e: any) {
      alert(e.message || "发布失败");
    } finally {
      setPublishingToKb(false);
    }
  }

  return (
    <div className="relative grid h-full min-h-0 grid-cols-1 overflow-hidden bg-slate-50 text-slate-950 lg:grid-cols-[292px_minmax(0,1fr)] xl:grid-cols-[316px_minmax(0,1fr)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.18)_1px,transparent_0)] [background-size:22px_22px]" />

      <aside className="relative z-10 flex min-h-0 flex-col border-b border-slate-200 bg-white/90 backdrop-blur lg:border-b-0 lg:border-r">
        <div className="border-b border-slate-100 p-4">
          <div className="mb-4 flex items-start gap-3">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-200">
              <Bot size={19} />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight text-slate-950">课程对话</h1>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">围绕课程和资料继续提问</p>
            </div>
          </div>
          <PrimaryButton
            type="button"
            onClick={newSession}
            disabled={creatingSession}
            className="h-11 w-full rounded-xl"
          >
            <Plus size={15} />
            {creatingSession ? "创建中…" : "新对话"}
          </PrimaryButton>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-400">暂无会话</div>
          ) : (
            <div className="space-y-1.5">
              <AnimatePresence initial={false}>
                {sessions.map((session, index) => (
                  <SessionButton
                    key={session.id}
                    session={session}
                    active={sid === session.id}
                    index={index}
                    onClick={() => navigate(`/chat/${session.id}`)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </aside>

      <main className="relative z-10 grid min-h-0 grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-h-0 flex-col">
          <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <IconBadge icon={MessageCircle} tone={sid ? "blue" : "slate"} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-950">{activeSessionTitle}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Enter 发送</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>Shift + Enter 换行</span>
                </div>
              </div>
              {sid && courses.length > 0 && (
                <select
                  value={activeCourseId ?? ""}
                  disabled={updatingCourse}
                  onChange={(e) => handleChangeCourse(e.target.value ? Number(e.target.value) : null)}
                  className="ml-2 shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 outline-none transition focus:border-slate-400 disabled:opacity-50"
                >
                  <option value="">通用对话</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
            {sid && messages.length > 0 && (
              <SecondaryButton
                onClick={publishToKb}
                disabled={publishingToKb}
                className="group"
              >
                <BookOpen size={16} />
                {publishingToKb ? "发布中…" : "保存到知识库"}
              </SecondaryButton>
            )}
          </header>

          <div className="min-h-0 flex-1 overflow-auto px-4 py-5 sm:px-6">
            {!sid ? (
              <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center py-8">
                <div className="w-full">
                  <EmptyState
                    title="开始一次课程对话"
                    description="你可以直接新建会话，也可以从左侧继续之前的问题。"
                    icon={Sparkles}
                    action={<PrimaryButton onClick={newSession}>新建对话</PrimaryButton>}
                  />
                </div>
              </div>
            ) : loadingMessages ? (
              <MessageLoading />
            ) : messages.length === 0 ? (
              <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center py-8">
                <PromptEmpty onPick={setInput} />
              </div>
            ) : (
              <div className="mx-auto max-w-4xl space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={`${message.role}-${index}-${message.content?.slice?.(0, 16) ?? ""}`}
                      message={message}
                      typing={message.role === "assistant" && message.id != null && message.id === typingId}
                      onTypeTick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
                      onTypeDone={() => setTypingId(null)}
                    />
                  ))}
                </AnimatePresence>
                {busy && <TypingBubble />}
                {relatedPosts.length > 0 && (
                  <div className="2xl:hidden">
                    <RelatedPostsPanel relatedPosts={relatedPosts} compact onPrefetchPost={prefetchPost} />
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-200 bg-white/92 p-3 backdrop-blur sm:p-4">
            <div className="mx-auto max-w-4xl">
              {sid && messages.length === 0 && (
                <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                  {PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInput(prompt)}
                      className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:-translate-y-0.5 focus-within:border-slate-400 focus-within:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
                <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-slate-950/0 transition group-focus-within:bg-slate-950/40" />
                <div className="flex items-end gap-3 p-2">
                  <textarea
                    className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-6 outline-none placeholder:text-slate-400"
                    rows={2}
                    placeholder={sid ? "输入消息..." : "请先选择或创建对话"}
                    value={input}
                    disabled={!sid}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <motion.button
                    type="button"
                    onClick={send}
                    disabled={!sid || busy || !input.trim()}
                    whileHover={sid && input.trim() && !busy ? { y: -1 } : undefined}
                    whileTap={sid && input.trim() && !busy ? { scale: 0.96 } : undefined}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    title="发送"
                  >
                    <SendHorizonal size={17} />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden min-h-0 overflow-auto border-l border-slate-200 bg-white/90 p-4 backdrop-blur 2xl:block">
          <RelatedPostsPanel relatedPosts={relatedPosts} onPrefetchPost={prefetchPost} />
        </aside>
      </main>
    </div>
  );
}

function SessionButton({
  session,
  active,
  index,
  onClick,
}: {
  session: any;
  active: boolean;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.18) }}
      whileHover={{ x: active ? 0 : 3 }}
      onClick={onClick}
      className="relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-3 text-left"
    >
      {active && (
        <motion.span
          layoutId="active-chat-session"
          className="absolute inset-0 rounded-xl bg-slate-950 shadow-[0_14px_35px_rgba(15,23,42,0.24)]"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${active ? "bg-white/12 text-white" : "bg-slate-100 text-slate-500"}`}>
        <MessageCircle size={17} />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className={`block truncate text-sm font-medium ${active ? "text-white" : "text-slate-800"}`}>{session.title}</span>
        <span className={`mt-0.5 flex items-center gap-1 text-xs ${active ? "text-white/55" : "text-slate-400"}`}>
          <Clock3 size={12} />
          {formatSessionDate(session.created_at)}
        </span>
      </span>
    </motion.button>
  );
}

function PromptEmpty({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <Surface className="w-full overflow-hidden p-0">
      <div className="border-b border-slate-100 p-6">
        <div className="mb-3 flex items-center gap-3">
          <IconBadge icon={Lightbulb} tone="amber" />
          <div>
            <h2 className="text-base font-semibold text-slate-950">发送第一条消息</h2>
            <p className="text-sm text-slate-500">可以让 Agent 总结资料、拆解知识点或生成复习计划。</p>
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {PROMPTS.map((prompt, index) => (
          <motion.button
            key={prompt}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: index * 0.06 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPick(prompt)}
            className="group rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm leading-6 text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-950 hover:shadow-sm"
          >
            <Sparkles size={16} className="mb-3 text-slate-400 transition group-hover:text-slate-950" />
            {prompt}
          </motion.button>
        ))}
      </div>
    </Surface>
  );
}

function MessageBubble({
  message,
  typing = false,
  onTypeTick,
  onTypeDone,
}: {
  message: any;
  typing?: boolean;
  onTypeTick?: () => void;
  onTypeDone?: () => void;
}) {
  const isUser = message.role === "user";
  const full = message.content ?? "";
  const { display: typed, done } = useTypewriter(full, typing);
  const shown = typing ? typed : full;

  useEffect(() => {
    if (typing && !done) onTypeTick?.();
  }, [typing, done, shown, onTypeTick]);

  useEffect(() => {
    if (typing && done) onTypeDone?.();
  }, [typing, done, onTypeDone]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "justify-start"}`}
    >
      <span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isUser ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
        {isUser ? "我" : <Bot size={17} />}
      </span>
      <div className={`max-w-3xl rounded-2xl px-4 py-3 shadow-sm ${isUser ? "rounded-tr-md bg-slate-950 text-white" : "rounded-tl-md border border-slate-200 bg-white text-slate-900"}`}>
        <div className={`mb-1 text-xs font-medium ${isUser ? "text-white/60" : "text-slate-400"}`}>{isUser ? "我" : "Agent"}</div>
        <MarkdownRenderer content={shown} variant={isUser ? "user" : "agent"} />
        {typing && !done && (
          <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-slate-400 align-middle" />
        )}
      </div>
    </motion.div>
  );
}

function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 ring-1 ring-slate-200">
        <Bot size={17} />
      </span>
      <div className="flex items-center gap-3 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
        <span>Agent 正在整理回答</span>
        <span className="flex gap-1">
          {[0, 1, 2].map((item) => (
            <motion.span
              key={item}
              animate={{ y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: item * 0.12 }}
              className="h-1.5 w-1.5 rounded-full bg-slate-400"
            />
          ))}
        </span>
      </div>
    </motion.div>
  );
}

function MessageLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={`flex gap-3 ${index % 2 ? "flex-row-reverse" : ""}`}>
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-white ring-1 ring-slate-200" />
          <div className={`h-24 animate-pulse rounded-2xl bg-white shadow-sm ${index % 2 ? "w-2/3" : "w-3/4"}`} />
        </div>
      ))}
    </div>
  );
}

function RelatedPostsPanel({
  relatedPosts,
  compact,
  onPrefetchPost,
}: {
  relatedPosts: any[];
  compact?: boolean;
  onPrefetchPost: (id: number) => void;
}) {
  return (
    <Surface className={compact ? "mt-5 p-4" : "p-4"}>
      <div className="mb-3 flex items-center gap-3">
        <IconBadge icon={UsersRound} tone="blue" />
        <div>
          <h2 className="text-sm font-semibold text-slate-950">相关讨论</h2>
          <p className="text-xs text-slate-500">从社区里找相近问题</p>
        </div>
      </div>
      {relatedPosts.length === 0 ? (
        <div className="rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-400">暂无相关帖子</div>
      ) : (
        <div className="space-y-2">
          {relatedPosts.map((post: any, index: number) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.2) }}
            >
              <Link
                to={`/forum/${post.id}`}
                onMouseEnter={() => {
                  preloadPage("postDetail");
                  onPrefetchPost(post.id);
                }}
                onFocus={() => {
                  preloadPage("postDetail");
                  onPrefetchPost(post.id);
                }}
                className="group block rounded-xl border border-slate-100 bg-white px-3 py-3 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="line-clamp-2 text-sm font-medium leading-6 text-slate-900">{post.title}</div>
                  <ArrowUpRight size={14} className="mt-1 shrink-0 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-700" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </Surface>
  );
}

function activeTitle(sessions: any[], sid: number) {
  return sessions.find((item) => item.id === sid)?.title || "课程对话";
}

function formatSessionDate(value?: string) {
  if (!value) return "最近会话";
  try {
    return new Date(value).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
  } catch {
    return "最近会话";
  }
}
