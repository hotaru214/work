import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

export default function Explore() {
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [activeTag, setActiveTag] = useState<number | undefined>(undefined);
  const [tab, setTab] = useState<"notebooks" | "docs">("notebooks");

  async function load() {
    const [t] = await Promise.all([api.listTags()]);
    setTags(t);
    if (tab === "notebooks") {
      setNotebooks(await api.exploreNotebooks());
    } else {
      setDocs(await api.exploreDocs(activeTag));
    }
  }

  useEffect(() => { load(); }, [tab, activeTag]);

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-4">发现</h1>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("notebooks")} className={`px-3 py-1 rounded text-sm ${tab === "notebooks" ? "bg-slate-900 text-white" : "bg-white border"}`}>公开知识库</button>
        <button onClick={() => setTab("docs")} className={`px-3 py-1 rounded text-sm ${tab === "docs" ? "bg-slate-900 text-white" : "bg-white border"}`}>公开文档</button>
        <span className="w-px bg-slate-300 mx-1" />
        <button onClick={() => setActiveTag(undefined)} className={`px-3 py-1 rounded text-sm ${!activeTag ? "bg-slate-900 text-white" : "bg-white border"}`}>全部</button>
        {tags.map((t: any) => (
          <button key={t.id} onClick={() => setActiveTag(t.id)} className={`px-3 py-1 rounded text-sm ${activeTag === t.id ? "bg-slate-900 text-white" : "bg-white border"}`}>
            {t.name}
          </button>
        ))}
      </div>

      {tab === "notebooks" ? (
        <div className="grid grid-cols-2 gap-4">
          {notebooks.map((nb: any) => (
            <Link key={nb.id} to={`/kb/${nb.id}`} className="bg-white p-4 rounded shadow hover:shadow-md transition">
              <div className="font-medium">{nb.name}</div>
              <div className="text-sm text-slate-500 mt-1">{nb.description || "无描述"}</div>
            </Link>
          ))}
          {notebooks.length === 0 && <div className="text-slate-500 col-span-2">暂无公开知识库</div>}
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((d: any) => (
            <Link key={d.id} to={`/kb/${d.notebook_id}/doc/${d.id}`} className="block bg-white p-4 rounded shadow hover:shadow-md transition">
              <div className="font-medium">{d.title}</div>
              {d.ai_summary && <div className="text-sm text-slate-500 mt-1 line-clamp-2">{d.ai_summary}</div>}
              {d.tags?.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {d.tags.map((t: any) => (
                    <span key={t.id} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: t.color + "20", color: t.color }}>{t.name}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
          {docs.length === 0 && <div className="text-slate-500">暂无公开文档</div>}
        </div>
      )}
    </div>
  );
}
