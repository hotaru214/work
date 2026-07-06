import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export default function KBList() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  async function load() {
    setLoading(true);
    try {
      const roots = await api.kb.roots();
      setNotes(Array.isArray(roots) ? roots : []);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const result = await api.kb.createNote("__root__", name.trim(), desc.trim(), "book");
      setName(""); setDesc(""); setShowModal(false);
      navigate(`/kb/${result.note.noteId}`);
    } catch { console.error("create failed"); }
  }

  function fmtDate(d: string) {
    try { return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
    catch { return d; }
  }

  function getNoteIcon(type: string): string {
    const icons: Record<string, string> = { text: "📄", code: "💻", book: "📚", image: "🖼️", file: "📎", "relation-map": "🔗", mermaid: "📊" };
    return icons[type] || "📄";
  }

  function countChildren(n: any): number {
    return n.children ? n.children.length : 0;
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">知识库</h1>
          <p className="text-sm text-slate-500 mt-1">浏览和管理你的所有笔记</p>
        </div>
        <button onClick={() => { setName(""); setDesc(""); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建知识库
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          加载中...
        </div>
      ) : notes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notes.map((n: any) => (
            <div key={n.noteId} onClick={() => navigate(`/kb/${n.noteId}`)}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{getNoteIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 text-base truncate group-hover:text-blue-600 transition-colors">{n.title || "未命名"}</h3>
                  <span className="text-xs text-slate-400">{n.type === "book" ? "知识库" : `${n.type} 笔记`}</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span>{countChildren(n)} 个子节点</span>
                <span>{n.dateModified ? fmtDate(n.dateModified) : ""}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400">
          <div className="text-6xl mb-4">📚</div>
          <div className="text-lg mb-4">还没有知识库</div>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            创建第一个
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-800 mb-5">新建知识库</h2>
            <form onSubmit={onCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">名称</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  placeholder="输入知识库名称" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
              </div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">描述</label>
                <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition resize-none"
                  placeholder="简要描述" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">取消</button>
                <button type="submit" className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}