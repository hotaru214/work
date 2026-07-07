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
  const [showTrash, setShowTrash] = useState(false);
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  async function handleDelete(e: React.MouseEvent, noteId: string, title: string) {
    e.stopPropagation();
    if (!confirm(`确认删除知识库「${title}」？该操作将同时删除其所有子内容。`)) return;
    try {
      await api.kb.deleteNote(noteId);
      await load();
    } catch (err) {
      console.error("delete failed", err);
      alert("删除失败");
    }
  }



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


  async function openTrash() {
    setShowTrash(true);
    setTrashLoading(true);
    try {
      const items = await api.kb.trash();
      setTrashItems(Array.isArray(items) ? items : []);
    } catch { setTrashItems([]); }
    finally { setTrashLoading(false); }
  }

  async function restoreFromTrash(noteId: string) {
    try {
      await api.kb.restoreNote(noteId);
      await openTrash();
      await load();
    } catch (err) {
      console.error("restore failed", err);
      alert("恢复失败");
    }
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
        <button onClick={openTrash}
          className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm font-medium text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          回收站
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
            <div key={n.noteId}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group relative" onClick={() => navigate(`/kb/${n.noteId}`)}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{getNoteIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 text-base truncate group-hover:text-blue-600 transition-colors">{n.title || "未命名"}</h3>
                  <span className="text-xs text-slate-400">{n.type === "book" ? "知识库" : `${n.type} 笔记`}</span>
                </div>
              </div>
              <button onClick={(e) => handleDelete(e, n.noteId, n.title)}
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all text-sm"
                title="删除知识库">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
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
    
      {/* Recycle Bin Modal */}
      {showTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowTrash(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">回收站</h2>
              <button onClick={() => setShowTrash(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {trashLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  加载中...
                </div>
              ) : trashItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <div className="text-4xl mb-3">🗑️</div>
                  <div>回收站是空的</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {trashItems.map((item: any) => (
                    <div key={item.noteId}
                      className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-lg shrink-0">{item.type === "book" ? "📖" : "📄"}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate">{item.title || "未命名"}</div>
                          <div className="text-xs text-slate-400">
                            删除于 {new Date(item.deletedAt).toLocaleString("zh-CN")}
                            {item.parentTitle ? <span> · 原位于 {item.parentTitle}</span> : ""}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => restoreFromTrash(item.noteId)}
                        className="shrink-0 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                        恢复
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}