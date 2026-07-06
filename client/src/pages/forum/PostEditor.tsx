import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";

export default function PostEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listTags().then(setAllTags);
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
    try {
      const post = await api.createPost({
        title,
        content,
        session_id: sessionId ? Number(sessionId) : undefined,
        tag_ids: selectedTagIds,
      });
      navigate(`/forum/${post.id}`, { replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4">发布帖子</h1>
      {sessionId && <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-blue-700">该帖子将关联 AI 对话 #{sessionId}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">标题</label>
          <input className="w-full border rounded px-3 py-2 mt-1" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium">内容 (支持 Markdown)</label>
          <textarea className="w-full border rounded px-3 py-2 mt-1 font-mono text-sm" rows={15} value={content} onChange={(e) => setContent(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">标签</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {allTags.map((t: any) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                className={`px-3 py-1 rounded text-sm border ${selectedTagIds.includes(t.id) ? "bg-slate-900 text-white" : "bg-white"}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <button disabled={loading} className="bg-slate-900 text-white px-6 py-2 rounded hover:bg-slate-800 disabled:opacity-50">
          {loading ? "发布中..." : "发布"}
        </button>
      </form>
    </div>
  );
}
