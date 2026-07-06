import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getYuqueToken, getTriliumUrl, getTriliumToken } from "../../api/client";

export default function KBList() {
  const navigate = useNavigate();
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [yuqueRepos, setYuqueRepos] = useState<any[]>([]);
  const [yuqueConnected, setYuqueConnected] = useState(false);
  const [yuqueLoading, setYuqueLoading] = useState(false);
  const [triliumConnected, setTriliumConnected] = useState(!!getTriliumUrl() && !!getTriliumToken());
  const [triliumNotes, setTriliumNotes] = useState<any[]>([]);
  const [triliumLoading, setTriliumLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  async function load() {
    setLoading(true);
    try {
      setNotebooks(await api.listNotebooks());
    } finally {
      setLoading(false);
    }
  }

  async function loadTrilium() {
    if (!triliumConnected) return;
    setTriliumLoading(true);
    try {
      const notes = await api.trilium.rootChildren();
      setTriliumNotes(notes);
    } catch { /* ignore */ }
    finally { setTriliumLoading(false); }
  }

  async function loadYuque() {
    if (!getYuqueToken()) return;
    setYuqueConnected(true);
    setYuqueLoading(true);
    try {
      setYuqueRepos(await api.yuque.listRepos());
    } catch { /* ignore */ }
    finally { setYuqueLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadYuque(); }, []);
  useEffect(() => { if (triliumConnected) loadTrilium(); }, [triliumConnected]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const nb = await api.createNotebook({ name: name.trim(), description: desc.trim() });
    setName(""); setDesc(""); setShowModal(false);
    navigate(`/kb/${nb.id}`);
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("zh-CN", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function fmtRelative(d: string) {
    const now = Date.now();
    const t = new Date(d).getTime();
    const diff = now - t;
    const min = Math.floor(diff / 60000);
    const hour = Math.floor(diff / 3600000);
    const day = Math.floor(diff / 86400000);
    if (min < 1) return "刚刚";
    if (min < 60) return `${min} 分钟前`;
    if (hour < 24) return `${hour} 小时前`;
    if (day < 30) return `${day} 天前`;
    return fmtDate(d);
  }

  function getYuqueDocUrl(namespace: string, slug: string) {
    return `https://www.yuque.com/${namespace}/${slug}`;
  }

  return (
    <div className="p-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">知识库</h1>
          <p className="text-sm text-slate-500 mt-1">管理你的所有知识库和文档</p>
        </div>
        <button
          onClick={() => { setName(""); setDesc(""); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建知识库
        </button>
      </div>

      {/* ===== 本地知识库 ===== */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-slate-400 flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            加载中...
          </div>
        </div>
      ) : notebooks.length > 0 ? (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            本地知识库
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {notebooks.map((nb: any) => (
              <div key={nb.id} onClick={() => navigate(`/kb/${nb.id}`)}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl mb-3 group-hover:bg-blue-100 transition-colors">📚</div>
                <h3 className="font-semibold text-slate-800 text-base mb-1 truncate group-hover:text-blue-600 transition-colors">{nb.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-3 min-h-[2.5rem]">{nb.description || "暂无描述"}</p>
                <div className="text-xs text-slate-400 pt-3 border-t border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                      {nb.doc_count || 0} 个文档
                    </span>
                    <span className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      {fmtRelative(nb.updated_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      创建 {fmtDate(nb.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34" /><polygon points="18 2 22 6 12 16 8 16 8 12 18 2" /></svg>
                      修改 {fmtDate(nb.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 mb-8">
          <div className="text-5xl mb-3">📚</div>
          <div className="text-base font-medium text-slate-500">还没有本地知识库</div>
          <div className="text-sm mt-1 mb-4">点击右上角「新建知识库」开始记录</div>
          <button onClick={() => { setName(""); setDesc(""); setShowModal(true); }}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">
            + 创建第一个知识库
          </button>
        </div>
      )}

      {/* ===== Trilium 笔记 ===== */}
      {triliumConnected && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
            🌲 Trilium 笔记
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-normal">已连接</span>
          </h2>
          {triliumLoading ? (
            <div className="text-xs text-slate-400 py-4">加载中...</div>
          ) : triliumNotes.length === 0 ? (
            <div className="text-xs text-slate-400 py-4">根节点下暂无笔记</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {triliumNotes.map((n: any) => (
                <div key={n.id}
                  onClick={() => window.open(getTriliumUrl() + `/#root/${n.id}`, "_blank")}
                  className="bg-white rounded-xl border border-teal-200 p-5 hover:shadow-md hover:border-teal-300 cursor-pointer transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-xl mb-3 group-hover:bg-teal-100 transition-colors">🌲</div>
                  <h3 className="font-semibold text-slate-800 text-base mb-1 truncate group-hover:text-teal-600 transition-colors">{n.title}</h3>
                  <div className="text-xs text-slate-400 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span>{n.children_count || 0} 个子节点</span>
                    <span className="text-teal-500 group-hover:text-teal-600 font-medium">在 Trilium 中打开 →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== 语雀知识库 ===== */}
      {yuqueConnected && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
            语雀知识库
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-normal">已连接</span>
          </h2>
          {yuqueLoading ? (
            <div className="text-xs text-slate-400 py-4">加载中...</div>
          ) : yuqueRepos.length === 0 ? (
            <div className="text-xs text-slate-400 py-4">语雀中暂无知识库</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {yuqueRepos.map((r: any) => (
                <div key={r.id}
                  onClick={() => window.open(`https://www.yuque.com/${r.namespace}`, "_blank")}
                  className="bg-white rounded-xl border border-amber-200 p-5 hover:shadow-md hover:border-amber-300 cursor-pointer transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-xl mb-3 group-hover:bg-amber-100 transition-colors">📕</div>
                  <h3 className="font-semibold text-slate-800 text-base mb-1 truncate group-hover:text-amber-600 transition-colors">{r.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3 min-h-[2.5rem]">{r.description || "暂无描述"}</p>
                  <div className="text-xs text-slate-400 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span>{r.doc_count || 0} 个文档</span>
                    <span className="text-amber-500 group-hover:text-amber-600 font-medium">在语雀中打开 →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-800">新建知识库</h2>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <form onSubmit={onCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">名称</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  placeholder="输入知识库名称" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
              </div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">描述</label>
                <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition resize-none"
                  placeholder="简要描述这个知识库的内容（可选）" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
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
