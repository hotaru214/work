import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";

export default function ForumList() {
  const [posts, setPosts] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get("sort") || "latest";
  const tagId = searchParams.get("tag_id") || undefined;

  async function load() {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([
        api.listPosts({ sort, tag_id: tagId ? Number(tagId) : undefined, page_size: 50 }),
        api.listTags(),
      ]);
      setPosts(p);
      setTags(t);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [sort, tagId]);

  function setSort(s: string) {
    setSearchParams((prev) => { prev.set("sort", s); return prev; });
  }

  function setTag(t: string) {
    setSearchParams((prev) => {
      if (t) prev.set("tag_id", t); else prev.delete("tag_id");
      return prev;
    });
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">讨论区</h1>
        <Link to="/forum/new" className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800 text-sm">
          发布帖子
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setSort("latest")} className={`px-3 py-1 rounded text-sm ${sort === "latest" ? "bg-slate-900 text-white" : "bg-white border"}`}>最新</button>
        <button onClick={() => setSort("hot")} className={`px-3 py-1 rounded text-sm ${sort === "hot" ? "bg-slate-900 text-white" : "bg-white border"}`}>热门</button>
        <button onClick={() => setSort("essence")} className={`px-3 py-1 rounded text-sm ${sort === "essence" ? "bg-slate-900 text-white" : "bg-white border"}`}>精华</button>
        <span className="w-px bg-slate-300 mx-1" />
        <button onClick={() => setTag("")} className={`px-3 py-1 rounded text-sm ${!tagId ? "bg-slate-900 text-white" : "bg-white border"}`}>全部</button>
        {tags.map((t: any) => (
          <button key={t.id} onClick={() => setTag(String(t.id))} className={`px-3 py-1 rounded text-sm ${tagId === String(t.id) ? "bg-slate-900 text-white" : "bg-white border"}`}>
            {t.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-500">加载中...</div>
      ) : posts.length === 0 ? (
        <div className="text-slate-500">暂无帖子，快来发布第一条吧</div>
      ) : (
        <div className="space-y-3">
          {posts.map((p: any) => (
            <Link to={`/forum/${p.id}`} key={p.id} className="block bg-white p-4 rounded shadow hover:shadow-md transition">
              <div className="flex items-center gap-2">
                <span className="font-medium text-lg">{p.title}</span>
                {p.is_essence && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">精华</span>}
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                <span>{p.author_name}</span>
                <span>{new Date(p.created_at).toLocaleDateString()}</span>
                <span>👍 {p.like_count}</span>
                <span>💬 {p.comment_count}</span>
                <span>👁 {p.view_count}</span>
              </div>
              {p.tags?.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {p.tags.map((t: any) => (
                    <span key={t.id} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: t.color + "20", color: t.color }}>{t.name}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
