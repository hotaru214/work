import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";

export default function ForumList() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get("sort") || "latest";
  const search = searchParams.get("search") || "";
  const [inputVal, setInputVal] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  async function load() {
    setLoading(true);
    try {
      const p = await api.listPosts({
        sort,
        search: search || undefined,
        page_size: 50,
      });
      setPosts(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [sort, search]);

  function setSort(s: string) {
    setSearchParams((prev) => { prev.set("sort", s); return prev; });
  }

  const handleSearchInput = useCallback((val: string) => {
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams((prev) => {
        if (val) prev.set("search", val);
        else prev.delete("search");
        return prev;
      });
    }, 300);
  }, [setSearchParams]);

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">讨论区</h1>
        <Link to="/forum/new" className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800 text-sm">
          发布帖子
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button onClick={() => setSort("latest")} className={`px-3 py-1 rounded text-sm ${sort === "latest" ? "bg-slate-900 text-white" : "bg-white border"}`}>最新</button>
        <button onClick={() => setSort("hot")} className={`px-3 py-1 rounded text-sm ${sort === "hot" ? "bg-slate-900 text-white" : "bg-white border"}`}>热门</button>
        <button onClick={() => setSort("essence")} className={`px-3 py-1 rounded text-sm ${sort === "essence" ? "bg-slate-900 text-white" : "bg-white border"}`}>精华</button>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition bg-white"
            placeholder="搜索标签或标题..."
            value={inputVal}
            onChange={(e) => handleSearchInput(e.target.value)}
          />
        </div>
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