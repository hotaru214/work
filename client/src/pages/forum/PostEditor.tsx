import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { Bot, Check, FileText, Hash, SendHorizonal, Sparkles } from "lucide-react";
import { api } from "../../api/client";
import { useMutationToast } from "../../components/ui/toast";
import { useAutosaveDraft } from "../../hooks/useAutosaveDraft";
import { useTags } from "../../hooks/api";
import { IconBadge, PageShell, PrimaryButton, Surface, TextAreaField, TextField } from "../../components/PageScaffold";

export default function PostEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { data: allTags = [] } = useTags();
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedTags = allTags.filter((tag: any) => selectedTagIds.includes(tag.id));
  const contentLength = content.trim().length;
  const titleLength = title.trim().length;
  const toast = useMutationToast();
  const draft = useAutosaveDraft(
    "draft:post-editor",
    { title, content, selectedTagIds },
    !loading && !!(title || content || selectedTagIds.length)
  );

  useEffect(() => {
    const saved = draft.readDraft();
    if (saved && !title && !content && !sessionId) {
      setTitle(saved.title || "");
      setContent(saved.content || "");
      setSelectedTagIds(saved.selectedTagIds || []);
    }
    if (sessionId) {
      api.listMessages(Number(sessionId)).then((msgs) => {
        const lines = msgs.map((m: any) => `**${m.role === "user" ? "我" : "Agent"}:** ${m.content}`);
        setContent(lines.join("\n\n"));
      });
    }
  }, [sessionId]);

  function toggleTag(tagId: number) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    toast.start("发布中...");
    try {
      const post = await api.createPost({
        title,
        content,
        session_id: sessionId ? Number(sessionId) : undefined,
        tag_ids: selectedTagIds,
      });
      draft.clearDraft();
      toast.success("帖子已发布");
      navigate(`/forum/${post.id}`, { replace: true });
    } catch (e: any) {
      toast.error(e.message || "发布失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell title="发布帖子" description="把课程问题、复盘笔记或 AI 对话整理成讨论帖。" className="bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto w-full max-w-6xl"
      >
        {sessionId && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <Bot size={17} />
            该帖子将关联 AI 对话 #{sessionId}
          </div>
        )}
        {draft.hasDraft && !sessionId && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            已自动恢复本地草稿
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Surface className="overflow-hidden p-0">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <IconBadge icon={FileText} tone="slate" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">帖子内容</h2>
                  <p className="mt-0.5 text-xs text-slate-500">支持 Markdown，离开页面前会自动保存草稿。</p>
                </div>
              </div>
            </div>
            <form onSubmit={onSubmit} className="space-y-5 p-5">
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-700">标题</label>
                  <span className="text-xs text-slate-400">{titleLength}/80</span>
                </div>
                <TextField value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="一句话说明你想讨论的问题" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-700">内容</label>
                  <span className="text-xs text-slate-400">{contentLength} 字</span>
                </div>
                <TextAreaField rows={15} value={content} onChange={(e) => setContent(e.target.value)} className="font-mono leading-6" placeholder="写下正文，支持 Markdown..." />
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Hash size={15} />
                  标签
                </div>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((t: any, index: number) => {
                    const selected = selectedTagIds.includes(t.id);
                    return (
                      <motion.button
                        key={t.id}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.18) }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => toggleTag(t.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                          selected ? "bg-slate-950 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                        style={{ borderColor: selected ? "#020617" : `${t.color}55` }}
                      >
                        {selected && <Check size={14} />}
                        {t.name}
                      </motion.button>
                    );
                  })}
                  {allTags.length === 0 && <span className="text-sm text-slate-400">暂无可选标签</span>}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <span className="text-xs text-slate-400">{draft.hasDraft ? "草稿已自动保存" : "输入后自动保存草稿"}</span>
                <PrimaryButton disabled={loading || !title.trim()} className="min-w-28">
                  <SendHorizonal size={16} />
                  {loading ? "发布中..." : "发布"}
                </PrimaryButton>
              </div>
            </form>
          </Surface>

          <Surface className="h-fit overflow-hidden p-0">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <IconBadge icon={Sparkles} tone="violet" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">发布预览</h2>
                  <p className="mt-0.5 text-xs text-slate-500">检查标题、标签和正文可读性。</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-medium text-slate-400">标题</div>
                <div className="mt-2 line-clamp-2 text-base font-semibold text-slate-950">
                  {title.trim() || "还没有填写标题"}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium text-slate-400">已选标签</div>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.length > 0 ? (
                    selectedTags.map((tag: any) => (
                      <span
                        key={tag.id}
                        className="rounded-full border px-2.5 py-1 text-xs font-medium"
                        style={{
                          borderColor: `${tag.color}33`,
                          backgroundColor: `${tag.color}12`,
                          color: tag.color,
                        }}
                      >
                        #{tag.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">未选择标签</span>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <div className="mb-2 text-xs font-medium text-slate-400">正文摘要</div>
                <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {content.trim() || "正文会在这里实时预览。"}
                </p>
              </div>
            </div>
          </Surface>
        </div>
      </motion.div>
    </PageShell>
  );
}
